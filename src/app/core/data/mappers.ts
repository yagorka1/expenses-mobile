import { DocumentSnapshot, FieldValue, Timestamp, deleteField, serverTimestamp } from 'firebase/firestore';
import { CURRENCIES, CurrencyCode, DEFAULT_CURRENCY, EXPENSE_SOURCES } from '../constants/expense.constants';
import { Category, CategoryDocument, Subcategory, SubcategoryDocument } from '../models/category.model';
import { CurrencyAmounts, Expense, ExpenseConversion, ExpenseDocument, ExpenseDraft } from '../models/expense.model';

/** What the app writes from a draft; category names aren't stored, they're looked up by id. */
type ExpenseFields = Omit<
  ExpenseDocument,
  'source' | 'createdBy' | 'createdAt' | 'amounts' | 'ratesDate' | 'categoryName' | 'subcategoryName'
>;
type NewExpenseDocument = ExpenseFields &
  ExpenseConversion &
  Pick<ExpenseDocument, 'source' | 'createdBy'> & { createdAt: FieldValue };
/**
 * Fields the app may change; `source`, `createdBy` and `createdAt` stay as they were.
 * `amounts` and `ratesDate` are written only when the conversion was recomputed.
 * The legacy name copies of an old expense are removed: they'd only go stale.
 */
type ExpenseDocumentUpdate = ExpenseFields &
  Partial<ExpenseConversion> & { categoryName: FieldValue; subcategoryName: FieldValue };

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

/** The app only sets names; the other fields get the values the admin used to default to. */
export function toCategoryDocument(name: string): CategoryDocument {
  return { name, description: '' };
}

export function toSubcategoryDocument(categoryId: string, name: string): SubcategoryDocument {
  return { categoryId, name, description: '', isNecessary: false };
}

export function mapExpense(snapshot: DocumentSnapshot): Expense {
  const data = snapshot.data(SNAPSHOT_READ_OPTIONS) ?? {};
  return {
    id: snapshot.id,
    amount: asNumber(data['amount']),
    currency: asCurrency(data['currency']),
    categoryId: asString(data['categoryId']),
    subcategoryId: asString(data['subcategoryId']),
    storedCategoryName: asString(data['categoryName']),
    storedSubcategoryName: asString(data['subcategoryName']),
    person: asString(data['person']),
    description: asString(data['description']),
    date: asDate(data['date']),
    // Estimated locally until the server confirms a new expense, so it sorts as the latest one.
    createdAt: asDate(data['createdAt']),
    amounts: asAmounts(data['amounts']),
    ratesDate: typeof data['ratesDate'] === 'string' ? data['ratesDate'] : null,
    // Only the app writes `ratesDate`, and it writes `null` only when the exact rates weren't loaded.
    approximateAmounts: data['ratesDate'] === null,
    isPending: snapshot.metadata.hasPendingWrites,
  };
}

function toExpenseFields(draft: ExpenseDraft): ExpenseFields {
  return {
    amount: draft.amount,
    currency: draft.currency,
    categoryId: draft.categoryId,
    subcategoryId: draft.subcategoryId,
    person: draft.person,
    description: draft.description,
    date: Timestamp.fromDate(draft.date),
  };
}

export function toExpenseDocumentUpdate(draft: ExpenseDraft, conversion?: ExpenseConversion): ExpenseDocumentUpdate {
  return {
    ...toExpenseFields(draft),
    ...conversion,
    categoryName: deleteField(),
    subcategoryName: deleteField(),
  };
}

export function toExpenseDocument(
  draft: ExpenseDraft,
  conversion: ExpenseConversion,
  userId: string,
): NewExpenseDocument {
  return {
    ...toExpenseFields(draft),
    ...conversion,
    source: EXPENSE_SOURCES.app,
    createdBy: userId,
    createdAt: serverTimestamp(),
  };
}
