import { Injectable, computed, inject } from '@angular/core';
import { collection, orderBy, query } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from '../constants/firestore.constants';
import { FIRESTORE } from '../firebase/firebase.tokens';
import { liveQuery } from '../firebase/live-data';
import { Category, Subcategory } from '../models/category.model';
import { AuthService } from '../services/auth.service';
import { mapCategory, mapSubcategory } from './mappers';

@Injectable({ providedIn: 'root' })
export class CategoriesRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);

  private readonly categoriesState = liveQuery(
    () =>
      this.auth.isAuthenticated()
        ? query(collection(this.db, FIRESTORE_COLLECTIONS.categories), orderBy(FIRESTORE_FIELDS.name))
        : null,
    mapCategory,
  );

  private readonly subcategoriesState = liveQuery(
    () =>
      this.auth.isAuthenticated()
        ? query(collection(this.db, FIRESTORE_COLLECTIONS.subcategories), orderBy(FIRESTORE_FIELDS.name))
        : null,
    mapSubcategory,
  );

  readonly categories = computed<Category[]>(() => this.categoriesState().data);
  readonly subcategories = computed<Subcategory[]>(() => this.subcategoriesState().data);
  readonly loading = computed(() => this.categoriesState().loading || this.subcategoriesState().loading);
  readonly error = computed(() => this.categoriesState().error ?? this.subcategoriesState().error);

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
}
