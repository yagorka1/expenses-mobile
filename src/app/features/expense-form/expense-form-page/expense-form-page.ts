import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { CURRENCIES, PERSONS } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES, TOAST_MESSAGES } from '../../../core/constants/messages';
import { CategoriesRepository } from '../../../core/data/categories.repository';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { SelectOption } from '../../../core/models/select-option.model';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { toDateInputValue } from '../../../core/utils/date.utils';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { ChipSelect } from '../../../shared/components/chip-select/chip-select';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { AmountInput } from '../components/amount-input/amount-input';
import { DateField } from '../components/date-field/date-field';
import { ExpenseFormModel, expenseFormSchema, toExpenseDraft } from '../expense-form';

const toOptions = (values: readonly string[]): SelectOption[] => values.map((value) => ({ value, label: value }));

@Component({
  selector: 'app-expense-form-page',
  imports: [FormField, FormRoot, AmountInput, ChipSelect, DateField, FieldError, StateMessage],
  templateUrl: './expense-form-page.html',
  styleUrl: './expense-form-page.scss',
})
export class ExpenseFormPage {
  private readonly categoriesRepository = inject(CategoriesRepository);
  private readonly expensesRepository = inject(ExpensesRepository);
  private readonly preferences = inject(UserPreferencesService);
  private readonly network = inject(NetworkStatusService);
  private readonly toast = inject(ToastService);

  protected readonly model = signal<ExpenseFormModel>(this.createInitialModel());
  protected readonly expenseForm = form(this.model, expenseFormSchema, {
    submission: { action: () => this.save() },
  });

  protected readonly emptyCategoriesMessage = EMPTY_STATE_MESSAGES.categories;
  protected readonly currencyOptions = toOptions(CURRENCIES);
  protected readonly personOptions = toOptions(PERSONS);

  protected readonly categoriesLoading = this.categoriesRepository.loading;
  protected readonly categoriesError = computed(() => {
    const error = this.categoriesRepository.error();
    return error ? getDataErrorMessage(error) : null;
  });
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categoriesRepository.categories().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly subcategoryOptions = computed<SelectOption[]>(() =>
    this.categoriesRepository
      .subcategoriesOf(this.model().categoryId)
      .map(({ id, name }) => ({ value: id, label: name })),
  );

  protected onCategoryChange(): void {
    const options = this.subcategoryOptions();
    // A single subcategory is selected automatically to save a tap.
    this.expenseForm.subcategoryId().value.set(options.length === 1 ? options[0].value : '');
  }

  private async save(): Promise<undefined> {
    const model = this.model();
    const category = this.categoriesRepository.findCategory(model.categoryId);
    const subcategory = this.categoriesRepository.findSubcategory(model.subcategoryId);
    if (!category || !subcategory) {
      this.toast.error(TOAST_MESSAGES.expenseSaveFailed);
      return undefined;
    }

    try {
      const write = await this.expensesRepository.add(toExpenseDraft(model, category, subcategory));
      write.synced.catch(() => this.toast.error(TOAST_MESSAGES.expenseSyncFailed));

      this.toast.success(this.network.online() ? TOAST_MESSAGES.expenseSaved : TOAST_MESSAGES.expenseQueued);
      this.preferences.lastCurrency = model.currency;
      this.preferences.lastPerson = model.person;
      this.resetForNextExpense();
    } catch {
      this.toast.error(TOAST_MESSAGES.expenseSaveFailed);
    }
    return undefined;
  }

  /** Keeps currency, date and person: several expenses are usually entered in a row. */
  private resetForNextExpense(): void {
    this.model.update((current) => ({ ...current, amount: '', categoryId: '', subcategoryId: '', description: '' }));
    this.expenseForm().reset();
  }

  private createInitialModel(): ExpenseFormModel {
    return {
      amount: '',
      currency: this.preferences.lastCurrency,
      categoryId: '',
      subcategoryId: '',
      date: toDateInputValue(new Date()),
      person: this.preferences.lastPerson,
      description: '',
    };
  }
}
