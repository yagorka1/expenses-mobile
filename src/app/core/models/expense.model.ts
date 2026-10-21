import { Timestamp } from 'firebase/firestore';
import { CurrencyCode, ExpenseSource } from '../constants/expense.constants';

export type CurrencyAmounts = Partial<Record<CurrencyCode, number>>;

export interface Expense {
  id: string;
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  person: string;
  description: string;
  date: Date;
  amounts: CurrencyAmounts;
  /** `YYYY-MM-DD` of the rates behind `amounts`; `null` when unknown (bot, migration) or approximate. */
  ratesDate: string | null;
  /** `amounts` were computed with the built-in fallback rates (no network and no cached rates). */
  approximateAmounts: boolean;
  /** The write exists only in the local cache and hasn't reached Firestore yet. */
  isPending: boolean;
}

export type ExpenseDraft = Omit<Expense, 'id' | 'amounts' | 'ratesDate' | 'approximateAmounts' | 'isPending'>;

/** `amounts` together with the day of the rates they were computed with. */
export interface ExpenseConversion {
  amounts: CurrencyAmounts;
  /** `null` = the built-in fallback rates were used. */
  ratesDate: string | null;
}

/** Shape of a document in the `expenses` collection (shared with the bot and the migration script). */
export interface ExpenseDocument {
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  person: string;
  description: string;
  date: Timestamp;
  amounts: CurrencyAmounts;
  /** Written by the app only: missing in bot and migrated documents. */
  ratesDate?: string | null;
  source: ExpenseSource;
  createdBy: string;
  createdAt: Timestamp;
}

export interface PendingWrite {
  id: string;
  /** Settles once Firestore acknowledges the write (may take long while offline). */
  synced: Promise<void>;
}
