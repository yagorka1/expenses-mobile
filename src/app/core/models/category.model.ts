import { Expense } from './expense.model';

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  isNecessary: boolean;
}

/** Shape of a document in the `categories` collection (shared with the bot and the migration script). */
export type CategoryDocument = Omit<Category, 'id'>;

/** Shape of a document in the `subcategories` collection. */
export type SubcategoryDocument = Omit<Subcategory, 'id'>;

/** Current names of an expense's category and subcategory, looked up by id. */
export interface CategoryNames {
  category(expense: Expense): string;
  subcategory(expense: Expense): string;
}
