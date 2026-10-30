import { Injectable, computed, inject } from '@angular/core';
import { collection, doc, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { UNKNOWN_CATEGORY_NAME } from '../constants/category.constants';
import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from '../constants/firestore.constants';
import { FIRESTORE } from '../firebase/firebase.tokens';
import { liveQuery } from '../firebase/live-data';
import { Category, CategoryNames, Subcategory } from '../models/category.model';
import { PendingWrite } from '../models/expense.model';
import { AuthService } from '../services/auth.service';
import { mapCategory, mapSubcategory, toCategoryDocument, toSubcategoryDocument } from './mappers';

@Injectable({ providedIn: 'root' })
export class CategoriesRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly categoriesRef = collection(this.db, FIRESTORE_COLLECTIONS.categories);
  private readonly subcategoriesRef = collection(this.db, FIRESTORE_COLLECTIONS.subcategories);

  private readonly categoriesState = liveQuery(
    () => (this.auth.isAuthenticated() ? query(this.categoriesRef, orderBy(FIRESTORE_FIELDS.name)) : null),
    mapCategory,
  );

  private readonly subcategoriesState = liveQuery(
    () => (this.auth.isAuthenticated() ? query(this.subcategoriesRef, orderBy(FIRESTORE_FIELDS.name)) : null),
    mapSubcategory,
  );

  readonly categories = computed<Category[]>(() => this.categoriesState().data);
  readonly subcategories = computed<Subcategory[]>(() => this.subcategoriesState().data);
  readonly loading = computed(() => this.categoriesState().loading || this.subcategoriesState().loading);
  readonly error = computed(() => this.categoriesState().error ?? this.subcategoriesState().error);

  private readonly categoryNames = computed(
    () => new Map(this.categories().map((category) => [category.id, category.name])),
  );
  private readonly subcategoryNames = computed(
    () => new Map(this.subcategories().map((subcategory) => [subcategory.id, subcategory.name])),
  );

  /**
   * Reactive when called inside `computed` or a template, so a rename shows up everywhere at once.
   * An old expense whose id isn't known falls back to the name it was saved with.
   */
  readonly names: CategoryNames = {
    category: (expense) =>
      this.categoryNames().get(expense.categoryId) || expense.storedCategoryName || UNKNOWN_CATEGORY_NAME,
    subcategory: (expense) =>
      this.subcategoryNames().get(expense.subcategoryId) || expense.storedSubcategoryName || UNKNOWN_CATEGORY_NAME,
  };

  /** Reactive when called inside `computed`. */
  subcategoriesOf(categoryId: string): Subcategory[] {
    return this.subcategories().filter((subcategory) => subcategory.categoryId === categoryId);
  }

  findCategory(id: string): Category | undefined {
    return this.categories().find((category) => category.id === id);
  }

  findSubcategory(id: string): Subcategory | undefined {
    return this.subcategories().find((subcategory) => subcategory.id === id);
  }

  /** Same sync semantics as `ExpensesRepository.add`: works offline too. */
  addCategory(name: string): PendingWrite {
    const ref = doc(this.categoriesRef);
    return { id: ref.id, synced: setDoc(ref, toCategoryDocument(name)) };
  }

  /** Same sync semantics as {@link addCategory}. */
  addSubcategory(categoryId: string, name: string): PendingWrite {
    const ref = doc(this.subcategoriesRef);
    return { id: ref.id, synced: setDoc(ref, toSubcategoryDocument(categoryId, name)) };
  }

  /** Same sync semantics as {@link addCategory}. Expenses refer to it by id, so only this document changes. */
  renameCategory(id: string, name: string): PendingWrite {
    return { id, synced: updateDoc(doc(this.categoriesRef, id), { [FIRESTORE_FIELDS.name]: name }) };
  }

  /** Same as {@link renameCategory}. */
  renameSubcategory(id: string, name: string): PendingWrite {
    return { id, synced: updateDoc(doc(this.subcategoriesRef, id), { [FIRESTORE_FIELDS.name]: name }) };
  }
}
