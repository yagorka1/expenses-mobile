export const FIRESTORE_COLLECTIONS = {
  expenses: 'expenses',
  categories: 'categories',
  subcategories: 'subcategories',
} as const;

export const FIRESTORE_FIELDS = {
  date: 'date',
  name: 'name',
  person: 'person',
  categoryId: 'categoryId',
  subcategoryId: 'subcategoryId',
  ratesDate: 'ratesDate',
} as const;
