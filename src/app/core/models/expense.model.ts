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
  /** The write exists only in the local cache and hasn't reached Firestore yet. */
  isPending: boolean;
}

export type ExpenseDraft = Omit<Expense, 'id' | 'amounts' | 'isPending'>;

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
  source: ExpenseSource;
  createdBy: string;
  createdAt: Timestamp;
}

export interface PendingWrite {
  id: string;
  /** Settles once Firestore acknowledges the write (may take long while offline). */
  synced: Promise<void>;
}
