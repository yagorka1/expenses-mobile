import { Injectable, Signal, inject } from '@angular/core';
import {
  QueryConstraint,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from '../constants/firestore.constants';
import { FIRESTORE } from '../firebase/firebase.tokens';
import { liveDoc, liveQuery } from '../firebase/live-data';
import { ExpenseFilter } from '../models/expense-filter.model';
import { Expense, ExpenseConversion, ExpenseDraft, PendingWrite } from '../models/expense.model';
import { LiveDocState, LiveQueryState } from '../models/live-data.model';
import { DateRange } from '../models/statistics.model';
import { AuthService } from '../services/auth.service';
import { ExchangeRatesService } from '../services/exchange-rates.service';
import { TodayService } from '../services/today.service';
import { convertToAllCurrencies, hasAllAmounts } from '../utils/currency.utils';
import { fromDateInputValue, getPeriodRange, toDateInputValue } from '../utils/date.utils';
import { mapExpense, toExpenseDocument, toExpenseDocumentUpdate } from './mappers';

const dateRangeConstraints = ({ from, to }: DateRange): QueryConstraint[] => [
  where(FIRESTORE_FIELDS.date, '>=', Timestamp.fromDate(from)),
  where(FIRESTORE_FIELDS.date, '<=', Timestamp.fromDate(to)),
];

@Injectable({ providedIn: 'root' })
export class ExpensesRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly exchangeRates = inject(ExchangeRatesService);
  private readonly today = inject(TodayService).date;
  private readonly expensesRef = collection(this.db, FIRESTORE_COLLECTIONS.expenses);

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
   */
  async add(draft: ExpenseDraft): Promise<PendingWrite> {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('Cannot add an expense without a signed-in user');
    }

    const ref = doc(this.expensesRef);
    const data = toExpenseDocument(draft, await this.convert(draft), userId);

    return { id: ref.id, synced: setDoc(ref, data) };
  }

  /**
   * Same sync semantics as {@link add}. Conversions are recomputed when the amount, currency or day
   * changed, and also to repair incomplete or approximate ones; otherwise they stay as they were.
   */
  async update(expense: Expense, draft: ExpenseDraft): Promise<PendingWrite> {
    const needsConversion =
      draft.amount !== expense.amount ||
      draft.currency !== expense.currency ||
      toDateInputValue(draft.date) !== toDateInputValue(expense.date) ||
      expense.approximateAmounts ||
      !hasAllAmounts(expense.amounts);
    const conversion = needsConversion ? await this.convert(draft) : undefined;
    const ref = doc(this.expensesRef, expense.id);

    return { id: ref.id, synced: updateDoc(ref, toExpenseDocumentUpdate(draft, conversion)) };
  }

  /** Same sync semantics as {@link add}. */
  remove(id: string): PendingWrite {
    return { id, synced: deleteDoc(doc(this.expensesRef, id)) };
  }

  /** Uses the rates of the expense's own day. */
  private async convert(draft: ExpenseDraft): Promise<ExpenseConversion> {
    const { rates, date } = await this.exchangeRates.getRates(toDateInputValue(draft.date));
    return { amounts: convertToAllCurrencies(draft.amount, draft.currency, rates), ratesDate: date };
  }
}
