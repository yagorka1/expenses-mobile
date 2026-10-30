import { Component, computed, inject, signal } from '@angular/core';
import { EMPTY_STATE_MESSAGES, TOAST_MESSAGES } from '../../../core/constants/messages';
import { CategoriesRepository } from '../../../core/data/categories.repository';
import { Category, Subcategory } from '../../../core/models/category.model';
import { PendingWrite } from '../../../core/models/expense.model';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ToastService } from '../../../core/services/toast.service';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { NameDialog, NameDialogSave } from '../components/name-dialog/name-dialog';

type NameDialogTarget =
  | { kind: 'newCategory' }
  | { kind: 'newSubcategory'; category: Category }
  | { kind: 'renameCategory'; category: Category }
  | { kind: 'renameSubcategory'; subcategory: Subcategory };

interface NameDialogView {
  title: string;
  hint: string;
  initialName: string;
  takenNames: string[];
}

const RENAME_HINT = 'Название поменяется везде, и в уже записанных тратах тоже';

const namesOf = (items: readonly { id: string; name: string }[], exceptId?: string): string[] =>
  items.filter((item) => item.id !== exceptId).map((item) => item.name);

/** Adds and renames categories and subcategories. Deleting isn't offered: expenses refer to them. */
@Component({
  selector: 'app-categories-page',
  imports: [NameDialog, StateMessage],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
})
export class CategoriesPage {
  private readonly categoriesRepository = inject(CategoriesRepository);
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.categoriesRepository.loading;
  protected readonly errorMessage = computed(() => {
    const error = this.categoriesRepository.error();
    return error ? getDataErrorMessage(error) : null;
  });
  protected readonly emptyMessage = EMPTY_STATE_MESSAGES.noCategories;
  protected readonly noSubcategoriesMessage = EMPTY_STATE_MESSAGES.noSubcategories;
  protected readonly groups = computed(() =>
    this.categoriesRepository.categories().map((category) => ({
      category,
      subcategories: this.categoriesRepository.subcategoriesOf(category.id),
    })),
  );
  /** Ids of the expanded categories. */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly dialogOpen = signal(false);
  private readonly dialogTarget = signal<NameDialogTarget>({ kind: 'newCategory' });
  protected readonly dialog = computed(() => this.describe(this.dialogTarget()));
  protected readonly saveName: NameDialogSave = (name) => this.save(this.dialogTarget(), name);

  protected onToggle(categoryId: string, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    this.expanded.update((ids) => {
      const next = new Set(ids);
      if (open) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  }

  protected addCategory(): void {
    this.openDialog({ kind: 'newCategory' });
  }

  protected addSubcategory(category: Category): void {
    this.openDialog({ kind: 'newSubcategory', category });
  }

  protected renameCategory(category: Category): void {
    this.openDialog({ kind: 'renameCategory', category });
  }

  protected renameSubcategory(subcategory: Subcategory): void {
    this.openDialog({ kind: 'renameSubcategory', subcategory });
  }

  private openDialog(target: NameDialogTarget): void {
    this.dialogTarget.set(target);
    this.dialogOpen.set(true);
  }

  private describe(target: NameDialogTarget): NameDialogView {
    const categories = this.categoriesRepository.categories();
    switch (target.kind) {
      case 'newCategory':
        return { title: 'Новая категория', hint: '', initialName: '', takenNames: namesOf(categories) };
      case 'newSubcategory':
        return {
          title: 'Новая подкатегория',
          hint: `В категории «${target.category.name}»`,
          initialName: '',
          takenNames: namesOf(this.categoriesRepository.subcategoriesOf(target.category.id)),
        };
      case 'renameCategory':
        return {
          title: 'Переименовать категорию',
          hint: RENAME_HINT,
          initialName: target.category.name,
          takenNames: namesOf(categories, target.category.id),
        };
      case 'renameSubcategory':
        return {
          title: 'Переименовать подкатегорию',
          hint: RENAME_HINT,
          initialName: target.subcategory.name,
          takenNames: namesOf(
            this.categoriesRepository.subcategoriesOf(target.subcategory.categoryId),
            target.subcategory.id,
          ),
        };
    }
  }

  private async save(target: NameDialogTarget, name: string): Promise<boolean> {
    switch (target.kind) {
      case 'newCategory':
        return this.write(() => {
          const write = this.categoriesRepository.addCategory(name);
          // A category without subcategories can't be picked yet, so "+ Подкатегория" is shown right away.
          this.expanded.update((ids) => new Set(ids).add(write.id));
          return write;
        }, TOAST_MESSAGES.categoryAdded);
      case 'newSubcategory':
        return this.write(
          () => this.categoriesRepository.addSubcategory(target.category.id, name),
          TOAST_MESSAGES.subcategoryAdded,
        );
      case 'renameCategory':
        return this.write(
          () => this.categoriesRepository.renameCategory(target.category.id, name),
          TOAST_MESSAGES.renamed,
        );
      case 'renameSubcategory':
        return this.write(
          () => this.categoriesRepository.renameSubcategory(target.subcategory.id, name),
          TOAST_MESSAGES.renamed,
        );
    }
  }

  private write(write: () => PendingWrite, savedMessage: string): boolean {
    try {
      write().synced.catch(() => this.toast.error(TOAST_MESSAGES.categorySyncFailed));
    } catch {
      this.toast.error(TOAST_MESSAGES.categorySaveFailed);
      return false;
    }
    this.toast.success(this.network.online() ? savedMessage : TOAST_MESSAGES.categoryQueued);
    return true;
  }
}
