import { DatePipe, Location } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { CURRENCIES } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES } from '../../../core/constants/messages';
import { DATE_FORMATS } from '../../../core/constants/ui.constants';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-expense-details-page',
  imports: [DatePipe, MoneyPipe, StateMessage],
  templateUrl: './expense-details-page.html',
  styleUrl: './expense-details-page.scss',
})
export class ExpenseDetailsPage {
  private readonly expensesRepository = inject(ExpensesRepository);
  private readonly location = inject(Location);

  /** Bound from the `:id` route param. */
  readonly id = input.required<string>();

  protected readonly state = this.expensesRepository.byId(this.id);
  protected readonly dateFormat = DATE_FORMATS.full;
  protected readonly notFoundMessage = EMPTY_STATE_MESSAGES.expenseNotFound;
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
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
}
