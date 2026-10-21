import { DatePipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { PERSONS, RECENT_EXPENSES_PAGE_SIZE } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES } from '../../../core/constants/messages';
import {
  ANY_FILTER_LABEL,
  ANY_FILTER_VALUE,
  DATE_FORMATS,
  EMPTY_EXPENSE_FILTER,
  EXPENSE_PERIOD_FILTER_OPTIONS,
} from '../../../core/constants/ui.constants';
import { CategoriesRepository } from '../../../core/data/categories.repository';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { ExpenseFilter, ExpensePeriodFilter } from '../../../core/models/expense-filter.model';
import { SelectOption } from '../../../core/models/select-option.model';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { groupExpensesByDay } from '../../../core/utils/statistics.utils';
import { ChipSelect } from '../../../shared/components/chip-select/chip-select';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { ExpenseListItem } from '../expense-list-item/expense-list-item';

const ANY_OPTION: SelectOption = { value: ANY_FILTER_VALUE, label: ANY_FILTER_LABEL };

@Component({
  selector: 'app-expenses-page',
  imports: [DatePipe, ChipSelect, ExpenseListItem, StateMessage],
  templateUrl: './expenses-page.html',
  styleUrl: './expenses-page.scss',
})
export class ExpensesPage {
  private readonly expensesRepository = inject(ExpensesRepository);
  private readonly categoriesRepository = inject(CategoriesRepository);

  protected readonly period = signal<ExpensePeriodFilter>(EMPTY_EXPENSE_FILTER.period);
  protected readonly person = signal(EMPTY_EXPENSE_FILTER.person);
  protected readonly categoryId = signal(EMPTY_EXPENSE_FILTER.categoryId);
  /** Cleared whenever the category changes: subcategories belong to one category. */
  protected readonly subcategoryId = linkedSignal({
    source: this.categoryId,
    computation: () => EMPTY_EXPENSE_FILTER.subcategoryId,
  });
  protected readonly filtersOpen = signal(false);

  private readonly filter = computed<ExpenseFilter>(() => ({
    period: this.period(),
    person: this.person(),
    categoryId: this.categoryId(),
    subcategoryId: this.subcategoryId(),
  }));
  /** Starts from the first page again whenever the filter changes. */
  private readonly limit = linkedSignal({ source: this.filter, computation: () => RECENT_EXPENSES_PAGE_SIZE });
  protected readonly state = this.expensesRepository.recent(this.filter, this.limit);

  protected readonly periodOptions = EXPENSE_PERIOD_FILTER_OPTIONS;
  protected readonly personOptions: readonly SelectOption[] = [
    ANY_OPTION,
    ...PERSONS.map((value) => ({ value, label: value })),
  ];
  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    ANY_OPTION,
    ...this.categoriesRepository.categories().map(({ id, name }) => ({ value: id, label: name })),
  ]);
  protected readonly subcategoryOptions = computed<SelectOption[]>(() => [
    ANY_OPTION,
    ...this.categoriesRepository
      .subcategoriesOf(this.categoryId())
      .map(({ id, name }) => ({ value: id, label: name })),
  ]);
  protected readonly activeFiltersCount = computed(
    () => Object.values(this.filter()).filter((value) => value !== ANY_FILTER_VALUE).length,
  );

  protected readonly dayFormat = DATE_FORMATS.dayHeader;
  protected readonly emptyMessage = computed(() =>
    this.activeFiltersCount() ? EMPTY_STATE_MESSAGES.filteredExpenses : EMPTY_STATE_MESSAGES.expenses,
  );
  protected readonly days = computed(() => groupExpensesByDay(this.state().data));
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
  });
  /** A full page means there may be more documents. */
  protected readonly canLoadMore = computed(() => this.state().data.length >= this.limit());

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected resetFilters(): void {
    this.period.set(EMPTY_EXPENSE_FILTER.period);
    this.person.set(EMPTY_EXPENSE_FILTER.person);
    this.categoryId.set(EMPTY_EXPENSE_FILTER.categoryId);
    this.subcategoryId.set(EMPTY_EXPENSE_FILTER.subcategoryId);
  }

  protected loadMore(): void {
    this.limit.update((value) => value + RECENT_EXPENSES_PAGE_SIZE);
  }
}
