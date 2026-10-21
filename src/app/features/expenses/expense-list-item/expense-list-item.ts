import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTE_LINKS } from '../../../core/constants/app-routes';
import { Expense } from '../../../core/models/expense.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-expense-list-item',
  imports: [RouterLink, MoneyPipe],
  templateUrl: './expense-list-item.html',
  styleUrl: './expense-list-item.scss',
})
export class ExpenseListItem {
  readonly expense = input.required<Expense>();

  protected readonly link = computed(() => ROUTE_LINKS.expenseDetails(this.expense().id));
}
