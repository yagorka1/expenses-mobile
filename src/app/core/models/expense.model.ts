import { Timestamp } from 'firebase/firestore';
import { CurrencyCode, ExpenseSource } from '../constants/expense.constants';

export type CurrencyAmounts = Partial<Record<CurrencyCode, number>>;

export interface Expense {
  id: string;
  amount: number;
  currency: CurrencyCode;
  /** Names are looked up by id, see `CategoriesRepository.names`. */
  categoryId: string;
  subcategoryId: string;
  /** Legacy copy of the name, `''` when absent: kept only by old expenses whose ids couldn't be matched. */
  storedCategoryName: string;
  storedSubcategoryName: string;
  person: string;
  description: string;
  /** The day of the expense; app expenses are stored at noon (see `fromDateInputValue`). */
  date: Date;
  /** When the expense was added: orders the expenses of one day. */
  createdAt: Date;
  amounts: CurrencyAmounts;
  /** `YYYY-MM-DD` of the rates behind `amounts`; `null` when unknown (bot, migration) or approximate. */
  ratesDate: string | null;
  /** `amounts` were computed with stand-in rates: the exact ones couldn't be loaded when saving. */
  approximateAmounts: boolean;
  /** The write exists only in the local cache and hasn't reached Firestore yet. */
  isPending: boolean;
}

export type ExpenseDraft = Omit<
  Expense,
  | 'id'
  | 'createdAt'
  | 'amounts'
  | 'ratesDate'
  | 'approximateAmounts'
  | 'isPending'
  | 'storedCategoryName'
  | 'storedSubcategoryName'
>;

/** `amounts` together with the day of the rates they were computed with. */
export interface ExpenseConversion {
  amounts: CurrencyAmounts;
  /** `null` = approximate: stand-in rates were used and the exact ones are still to be applied. */
  ratesDate: string | null;
}

/** Shape of a document in the `expenses` collection (shared with the bot and the migration script). */
export interface ExpenseDocument {
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  subcategoryId: string;
  /** Legacy: no longer written; removed from an old expense when it's edited. */
  categoryName?: string;
  subcategoryName?: string;
  person: string;
  description: string;
  date: Timestamp;
  amounts: CurrencyAmounts;
  /** Written by the app only: missing in bot and migrated documents; `null` = approximate amounts. */
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
