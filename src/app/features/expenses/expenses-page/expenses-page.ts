import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RECENT_EXPENSES_PAGE_SIZE } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES } from '../../../core/constants/messages';
import { DATE_FORMATS } from '../../../core/constants/ui.constants';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { groupExpensesByDay } from '../../../core/utils/statistics.utils';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { ExpenseListItem } from '../expense-list-item/expense-list-item';

@Component({
  selector: 'app-expenses-page',
  imports: [DatePipe, ExpenseListItem, StateMessage],
  templateUrl: './expenses-page.html',
  styleUrl: './expenses-page.scss',
})
export class ExpensesPage {
  private readonly expensesRepository = inject(ExpensesRepository);

  private readonly limit = signal(RECENT_EXPENSES_PAGE_SIZE);
  protected readonly state = this.expensesRepository.recent(this.limit);

  protected readonly dayFormat = DATE_FORMATS.dayHeader;
  protected readonly emptyMessage = EMPTY_STATE_MESSAGES.expenses;
  protected readonly days = computed(() => groupExpensesByDay(this.state().data));
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
  });
  /** A full page means there may be more documents. */
  protected readonly canLoadMore = computed(() => this.state().data.length >= this.limit());

  protected loadMore(): void {
    this.limit.update((value) => value + RECENT_EXPENSES_PAGE_SIZE);
  }
}
