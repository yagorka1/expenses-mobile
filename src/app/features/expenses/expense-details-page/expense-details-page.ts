import { DatePipe, Location } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTE_LINKS } from '../../../core/constants/app-routes';
import { CURRENCIES } from '../../../core/constants/expense.constants';
import { CONFIRM_MESSAGES, EMPTY_STATE_MESSAGES, TOAST_MESSAGES } from '../../../core/constants/messages';
import { DATE_FORMATS } from '../../../core/constants/ui.constants';
import { CategoriesRepository } from '../../../core/data/categories.repository';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ToastService } from '../../../core/services/toast.service';
import { fromDateInputValue } from '../../../core/utils/date.utils';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-expense-details-page',
  imports: [DatePipe, RouterLink, MoneyPipe, ConfirmDialog, StateMessage],
  templateUrl: './expense-details-page.html',
  styleUrl: './expense-details-page.scss',
})
export class ExpenseDetailsPage {
  private readonly expensesRepository = inject(ExpensesRepository);
  protected readonly names = inject(CategoriesRepository).names;
  private readonly location = inject(Location);
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);

  /** Bound from the `:id` route param. */
  readonly id = input.required<string>();

  protected readonly state = this.expensesRepository.byId(this.id);
  protected readonly confirmDeleteOpen = signal(false);
  protected readonly confirmMessages = CONFIRM_MESSAGES;
  protected readonly editLink = computed(() => ROUTE_LINKS.editExpense(this.id()));
  protected readonly dateFormat = DATE_FORMATS.full;
  protected readonly notFoundMessage = EMPTY_STATE_MESSAGES.expenseNotFound;
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
  });
  protected readonly ratesDate = computed(() => {
    const date = this.state().data?.ratesDate;
    return date ? fromDateInputValue(date) : null;
  });
  /** Equivalents in the other currencies, in the app's currency order. */
  protected readonly conversions = computed(() => {
    const expense = this.state().data;
    if (!expense) {
      return [];
    }
    return CURRENCIES.filter((code) => code !== expense.currency && expense.amounts[code] !== undefined).map(
      (code) => ({ code, amount: expense.amounts[code] }),
    );
  });

  protected back(): void {
    this.location.back();
  }

  protected askDelete(): void {
    this.confirmDeleteOpen.set(true);
  }

  protected delete(): void {
    const write = this.expensesRepository.remove(this.id());
    write.synced.catch(() => this.toast.error(TOAST_MESSAGES.expenseDeleteFailed));

    this.toast.success(this.network.online() ? TOAST_MESSAGES.expenseDeleted : TOAST_MESSAGES.expenseDeleteQueued);
    this.location.back();
  }
}
