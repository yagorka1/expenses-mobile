import { Injectable, Signal, inject } from '@angular/core';
import { Timestamp, collection, doc, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from '../constants/firestore.constants';
import { FIRESTORE } from '../firebase/firebase.tokens';
import { liveDoc, liveQuery } from '../firebase/live-data';
import { Expense, ExpenseDraft, PendingWrite } from '../models/expense.model';
import { LiveDocState, LiveQueryState } from '../models/live-data.model';
import { DateRange } from '../models/statistics.model';
import { AuthService } from '../services/auth.service';
import { ExchangeRatesService } from '../services/exchange-rates.service';
import { convertToAllCurrencies } from '../utils/currency.utils';
import { mapExpense, toExpenseDocument } from './mappers';

@Injectable({ providedIn: 'root' })
export class ExpensesRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly exchangeRates = inject(ExchangeRatesService);
  private readonly expensesRef = collection(this.db, FIRESTORE_COLLECTIONS.expenses);

  /** Newest expenses first. Must be called in an injection context. */
  recent(count: Signal<number>): Signal<LiveQueryState<Expense>> {
    return liveQuery(
      () =>
        this.auth.isAuthenticated()
          ? query(this.expensesRef, orderBy(FIRESTORE_FIELDS.date, 'desc'), limit(count()))
          : null,
      mapExpense,
    );
  }

  /** Expenses within the range, newest first. Must be called in an injection context. */
  inRange(range: Signal<DateRange>): Signal<LiveQueryState<Expense>> {
    return liveQuery(() => {
      if (!this.auth.isAuthenticated()) {
        return null;
      }
      const { from, to } = range();
      return query(
        this.expensesRef,
        where(FIRESTORE_FIELDS.date, '>=', Timestamp.fromDate(from)),
        where(FIRESTORE_FIELDS.date, '<=', Timestamp.fromDate(to)),
        orderBy(FIRESTORE_FIELDS.date, 'desc'),
      );
    }, mapExpense);
  }

  /** Must be called in an injection context. */
  byId(id: Signal<string>): Signal<LiveDocState<Expense>> {
    return liveDoc(() => (this.auth.isAuthenticated() ? doc(this.expensesRef, id()) : null), mapExpense);
  }

  /**
   * Writes to the local cache right away and syncs in the background (also after coming back online).
   * Awaiting `synced` is optional: with offline persistence it only settles when the server confirms.
   */
  async add(draft: ExpenseDraft): Promise<PendingWrite> {
    const user = this.auth.user();
    if (!user) {
      throw new Error('Cannot add an expense without a signed-in user');
    }

    const eurRates = await this.exchangeRates.getEurRates();
    const ref = doc(this.expensesRef);
    const data = toExpenseDocument(draft, convertToAllCurrencies(draft.amount, draft.currency, eurRates), user.uid);

    return { id: ref.id, synced: setDoc(ref, data) };
  }
}
