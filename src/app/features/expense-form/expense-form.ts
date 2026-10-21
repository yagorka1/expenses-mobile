import { maxLength, pattern, required, schema, validate } from '@angular/forms/signals';
import { AMOUNT_PATTERN, CurrencyCode, DESCRIPTION_MAX_LENGTH } from '../../core/constants/expense.constants';
import { VALIDATION_MESSAGES } from '../../core/constants/messages';
import { Category, Subcategory } from '../../core/models/category.model';
import { Expense, ExpenseDraft } from '../../core/models/expense.model';
import { parseAmount } from '../../core/utils/currency.utils';
import { fromDateInputValue, toDateInputValue } from '../../core/utils/date.utils';

export interface ExpenseFormModel {
  /** Raw text: the decimal keypad may produce "12,5", so parsing happens on submit. */
  amount: string;
  currency: CurrencyCode;
  categoryId: string;
  subcategoryId: string;
  /** `YYYY-MM-DD` */
  date: string;
  person: string;
  description: string;
}

export const expenseFormSchema = schema<ExpenseFormModel>((path) => {
  required(path.amount, { message: VALIDATION_MESSAGES.amountRequired });
  pattern(path.amount, AMOUNT_PATTERN, { message: VALIDATION_MESSAGES.amountFormat });
  validate(path.amount, ({ value }) =>
    parseAmount(value()) > 0 ? undefined : { kind: 'positive', message: VALIDATION_MESSAGES.amountPositive },
  );
  required(path.currency, { message: VALIDATION_MESSAGES.currencyRequired });
  required(path.categoryId, { message: VALIDATION_MESSAGES.categoryRequired });
  required(path.subcategoryId, { message: VALIDATION_MESSAGES.subcategoryRequired });
  required(path.date, { message: VALIDATION_MESSAGES.dateRequired });
  required(path.person, { message: VALIDATION_MESSAGES.personRequired });
  maxLength(path.description, DESCRIPTION_MAX_LENGTH, { message: VALIDATION_MESSAGES.descriptionTooLong });
});

export function toExpenseFormModel(expense: Expense): ExpenseFormModel {
  return {
    amount: String(expense.amount).replace('.', ','),
    currency: expense.currency,
    categoryId: expense.categoryId,
    subcategoryId: expense.subcategoryId,
    date: toDateInputValue(expense.date),
    person: expense.person,
    description: expense.description,
  };
}

export function toExpenseDraft(model: ExpenseFormModel, category: Category, subcategory: Subcategory): ExpenseDraft {
  return {
    amount: parseAmount(model.amount),
    currency: model.currency,
    categoryId: category.id,
    categoryName: category.name,
    subcategoryId: subcategory.id,
    subcategoryName: subcategory.name,
    person: model.person,
    description: model.description.trim(),
    date: fromDateInputValue(model.date),
  };
}
