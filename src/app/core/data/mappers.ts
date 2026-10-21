import { DocumentSnapshot, FieldValue, Timestamp, serverTimestamp } from 'firebase/firestore';
import { CURRENCIES, CurrencyCode, DEFAULT_CURRENCY, EXPENSE_SOURCES } from '../constants/expense.constants';
import { Category, Subcategory } from '../models/category.model';
import { CurrencyAmounts, Expense, ExpenseConversion, ExpenseDocument, ExpenseDraft } from '../models/expense.model';

type NewExpenseDocument = Omit<ExpenseDocument, 'createdAt' | 'ratesDate'> & {
  ratesDate: string | null;
  createdAt: FieldValue;
};
/**
 * Fields the app may change; `source`, `createdBy` and `createdAt` stay as they were.
 * `amounts` and `ratesDate` are written only when the conversion was recomputed.
 */
type ExpenseDocumentUpdate = Omit<ExpenseDocument, 'source' | 'createdBy' | 'createdAt' | 'amounts' | 'ratesDate'> &
  Partial<ExpenseConversion>;

const SNAPSHOT_READ_OPTIONS = { serverTimestamps: 'estimate' } as const;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
const asCurrency = (value: unknown): CurrencyCode =>
  CURRENCIES.includes(value as CurrencyCode) ? (value as CurrencyCode) : DEFAULT_CURRENCY;
const asDate = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(0));
/** Keeps only finite numbers of supported currencies (migrated documents may hold anything). */
const asAmounts = (value: unknown): CurrencyAmounts => {
  const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    CURRENCIES.flatMap((code) => {
      const amount = source[code];
      return typeof amount === 'number' && Number.isFinite(amount) ? [[code, amount]] : [];
    }),
  );
};

export function mapCategory(snapshot: DocumentSnapshot): Category {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: asString(data['name']),
    description: asString(data['description']),
  };
}

export function mapSubcategory(snapshot: DocumentSnapshot): Subcategory {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    categoryId: asString(data['categoryId']),
    name: asString(data['name']),
    description: asString(data['description']),
    isNecessary: data['isNecessary'] === true,
  };
}

export function mapExpense(snapshot: DocumentSnapshot): Expense {
  const data = snapshot.data(SNAPSHOT_READ_OPTIONS) ?? {};
  return {
    id: snapshot.id,
    amount: asNumber(data['amount']),
    currency: asCurrency(data['currency']),
    categoryId: asString(data['categoryId']),
    categoryName: asString(data['categoryName']),
    subcategoryId: asString(data['subcategoryId']),
    subcategoryName: asString(data['subcategoryName']),
    person: asString(data['person']),
    description: asString(data['description']),
    date: asDate(data['date']),
    amounts: asAmounts(data['amounts']),
    ratesDate: typeof data['ratesDate'] === 'string' ? data['ratesDate'] : null,
    // Only the app writes `ratesDate`, and it writes `null` only for the fallback rates.
    approximateAmounts: data['ratesDate'] === null,
    isPending: snapshot.metadata.hasPendingWrites,
  };
}

export function toExpenseDocumentUpdate(draft: ExpenseDraft, conversion?: ExpenseConversion): ExpenseDocumentUpdate {
  return {
    amount: draft.amount,
    currency: draft.currency,
    categoryId: draft.categoryId,
    categoryName: draft.categoryName,
    subcategoryId: draft.subcategoryId,
    subcategoryName: draft.subcategoryName,
    person: draft.person,
    description: draft.description,
    date: Timestamp.fromDate(draft.date),
    ...conversion,
  };
}

export function toExpenseDocument(
  draft: ExpenseDraft,
  conversion: ExpenseConversion,
  userId: string,
): NewExpenseDocument {
  return {
    ...toExpenseDocumentUpdate(draft),
    ...conversion,
    source: EXPENSE_SOURCES.app,
    createdBy: userId,
    createdAt: serverTimestamp(),
  };
}
