import { Injectable, Signal, effect, inject, untracked } from '@angular/core';
import {
  DocumentReference,
  QueryConstraint,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  waitForPendingWrites,
  where,
} from 'firebase/firestore';
import { RATES_REFINE_BATCH_SIZE } from '../constants/exchange-rates.constants';
import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from '../constants/firestore.constants';
import { FIRESTORE } from '../firebase/firebase.tokens';
import { liveDoc, liveQuery } from '../firebase/live-data';
import { ExpenseFilter } from '../models/expense-filter.model';
import { Expense, ExpenseConversion, ExpenseDraft, PendingWrite } from '../models/expense.model';
import { LiveDocState, LiveQueryState } from '../models/live-data.model';
import { DateRange } from '../models/statistics.model';
import { AuthService } from '../services/auth.service';
import { ExchangeRatesService } from '../services/exchange-rates.service';
import { NetworkStatusService } from '../services/network-status.service';
import { TodayService } from '../services/today.service';
import { convertToAllCurrencies, hasAllAmounts } from '../utils/currency.utils';
import { fromDateInputValue, getPeriodRange, toDateInputValue } from '../utils/date.utils';
import { mapExpense, toExpenseDocument, toExpenseDocumentUpdate } from './mappers';

const dateRangeConstraints = ({ from, to }: DateRange): QueryConstraint[] => [
  where(FIRESTORE_FIELDS.date, '>=', Timestamp.fromDate(from)),
  where(FIRESTORE_FIELDS.date, '<=', Timestamp.fromDate(to)),
];

/** Same amount, currency and day: a conversion computed for one fits the other. */
const sameConversionInput = (a: Expense, b: Expense): boolean =>
  a.amount === b.amount && a.currency === b.currency && toDateInputValue(a.date) === toDateInputValue(b.date);

@Injectable({ providedIn: 'root' })
export class ExpensesRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly network = inject(NetworkStatusService);
  private readonly exchangeRates = inject(ExchangeRatesService);
  private readonly today = inject(TodayService).date;
  private readonly expensesRef = collection(this.db, FIRESTORE_COLLECTIONS.expenses);
  private refining = false;
  private refineAgain = false;

  constructor() {
    // Also runs on start: approximate amounts may be left from an earlier session without network.
    effect(() => {
      if (this.auth.isAuthenticated() && this.network.online()) {
        untracked(() => void this.refineApproximateAmounts());
      }
    });
  }

  /**
   * Newest matching expenses first. Must be called in an injection context.
   * Filter combinations rely on the composite indexes in `firestore.indexes.json`.
   */
  recent(filter: Signal<ExpenseFilter>, count: Signal<number>): Signal<LiveQueryState<Expense>> {
    return liveQuery(() => {
      if (!this.auth.isAuthenticated()) {
        return null;
      }
      const { period, person, categoryId, subcategoryId } = filter();
      const constraints: QueryConstraint[] = [];
      if (person) {
        constraints.push(where(FIRESTORE_FIELDS.person, '==', person));
      }
      // A subcategory implies its category, so one equality is enough (and needs fewer indexes).
      if (subcategoryId) {
        constraints.push(where(FIRESTORE_FIELDS.subcategoryId, '==', subcategoryId));
      } else if (categoryId) {
        constraints.push(where(FIRESTORE_FIELDS.categoryId, '==', categoryId));
      }
      if (period) {
        // Reading `today` re-runs the query after midnight, so "this week" never gets stuck.
        constraints.push(...dateRangeConstraints(getPeriodRange(period, fromDateInputValue(this.today()))));
      }
      return query(this.expensesRef, ...constraints, orderBy(FIRESTORE_FIELDS.date, 'desc'), limit(count()));
    }, mapExpense);
  }

  /** Expenses within the range, newest first. Must be called in an injection context. */
  inRange(range: Signal<DateRange>): Signal<LiveQueryState<Expense>> {
    return liveQuery(
      () =>
        this.auth.isAuthenticated()
          ? query(this.expensesRef, ...dateRangeConstraints(range()), orderBy(FIRESTORE_FIELDS.date, 'desc'))
          : null,
      mapExpense,
    );
  }

  /** No subscription while `id` is empty. Must be called in an injection context. */
  byId(id: Signal<string | undefined>): Signal<LiveDocState<Expense>> {
    return liveDoc(() => {
      const expenseId = id();
      return this.auth.isAuthenticated() && expenseId ? doc(this.expensesRef, expenseId) : null;
    }, mapExpense);
  }

  /**
   * Writes to the local cache right away and syncs in the background (also after coming back online).
   * Awaiting `synced` is optional: with offline persistence it only settles when the server confirms.
   * Never waits for exchange rates either: unless the day's rates are cached, the amounts are
   * approximate and get refined in the background.
   */
  add(draft: ExpenseDraft): PendingWrite {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('Cannot add an expense without a signed-in user');
    }

    const ref = doc(this.expensesRef);
    const conversion = this.convert(draft);
    const synced = setDoc(ref, toExpenseDocument(draft, conversion, userId));
    this.refineIfApproximate(conversion);
    return { id: ref.id, synced };
  }

  /**
   * Same sync semantics as {@link add}. Conversions are recomputed when the amount, currency or day
   * changed, and also to repair incomplete or approximate ones; otherwise they stay as they were.
   */
  update(expense: Expense, draft: ExpenseDraft): PendingWrite {
    const needsConversion =
      draft.amount !== expense.amount ||
      draft.currency !== expense.currency ||
      toDateInputValue(draft.date) !== toDateInputValue(expense.date) ||
      expense.approximateAmounts ||
      !hasAllAmounts(expense.amounts);
    const conversion = needsConversion ? this.convert(draft) : undefined;
    const ref = doc(this.expensesRef, expense.id);
    const synced = updateDoc(ref, toExpenseDocumentUpdate(draft, conversion));
    if (conversion) {
      this.refineIfApproximate(conversion);
    }
    return { id: ref.id, synced };
  }

  /** Same sync semantics as {@link add}. */
  remove(id: string): PendingWrite {
    return { id, synced: deleteDoc(doc(this.expensesRef, id)) };
  }

  /** With the rates of the expense's own day when they're cached, approximate ones otherwise. */
  private convert(draft: ExpenseDraft): ExpenseConversion {
    const { rates, date } = this.exchangeRates.peek(toDateInputValue(draft.date));
    return { amounts: convertToAllCurrencies(draft.amount, draft.currency, rates), ratesDate: date };
  }

  private refineIfApproximate({ ratesDate }: ExpenseConversion): void {
    if (ratesDate === null && this.network.online()) {
      void this.refineApproximateAmounts();
    }
  }

  /**
   * Re-converts expenses with approximate amounts (`ratesDate: null`) once the exact rates of their
   * days can be loaded. Runs on start, when the network comes back and after an approximate save;
   * whatever can't be refined yet is retried the next time.
   */
  private async refineApproximateAmounts(): Promise<void> {
    if (this.refining) {
      this.refineAgain = true;
      return;
    }
    this.refining = true;
    try {
      do {
        this.refineAgain = false;
        await this.refineBatch();
      } while (this.refineAgain);
    } catch {
      // Offline again: the next trigger retries.
    } finally {
      this.refining = false;
    }
  }

  private async refineBatch(): Promise<void> {
    // The transactions below read from the server, so the latest local writes must get there first.
    await waitForPendingWrites(this.db);
    const snapshot = await getDocs(
      query(this.expensesRef, where(FIRESTORE_FIELDS.ratesDate, '==', null), limit(RATES_REFINE_BATCH_SIZE)),
    );
    for (const expenseSnapshot of snapshot.docs) {
      // One expense failing (e.g. the connection dropped mid-transaction) mustn't hold up the rest.
      await this.refine(expenseSnapshot.ref, mapExpense(expenseSnapshot)).catch(() => undefined);
    }
  }

  private async refine(ref: DocumentReference, expense: Expense): Promise<void> {
    const rates = await this.exchangeRates.exact(toDateInputValue(expense.date));
    if (!rates) {
      return;
    }
    const conversion: ExpenseConversion = {
      amounts: convertToAllCurrencies(expense.amount, expense.currency, rates.rates),
      ratesDate: rates.date,
    };
    await runTransaction(this.db, async (transaction) => {
      const current = await transaction.get(ref);
      // Deleted, or edited meanwhile: an edit converts the amounts on its own.
      if (
        current.exists() &&
        current.get(FIRESTORE_FIELDS.ratesDate) === null &&
        sameConversionInput(mapExpense(current), expense)
      ) {
        transaction.update(ref, { ...conversion });
      }
    });
  }
}
