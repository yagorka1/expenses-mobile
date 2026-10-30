import { maxLength, pattern, required, schema, validate } from '@angular/forms/signals';
import {
  AMOUNT_PATTERN,
  CurrencyCode,
  DESCRIPTION_MAX_LENGTH,
  MIN_EXPENSE_DATE,
} from '../../core/constants/expense.constants';
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
  // The picker limits the dates, but a typed date or a wrong clock can still get past it.
  validate(path.date, ({ value }) => {
    const day = value();
    if (day > toDateInputValue(new Date())) {
      return { kind: 'future', message: VALIDATION_MESSAGES.dateInFuture };
    }
    return day && day < MIN_EXPENSE_DATE ? { kind: 'tooOld', message: VALIDATION_MESSAGES.dateTooOld } : undefined;
  });
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

/** `originalDate` is kept while the day stays the same, so an edit doesn't reset the time to noon. */
export function toExpenseDraft(
  model: ExpenseFormModel,
  category: Category,
  subcategory: Subcategory,
  originalDate?: Date,
): ExpenseDraft {
  const keepDate = originalDate && toDateInputValue(originalDate) === model.date;
  return {
    amount: parseAmount(model.amount),
    currency: model.currency,
    categoryId: category.id,
    subcategoryId: subcategory.id,
    person: model.person,
    description: model.description.trim(),
    date: keepDate ? originalDate : fromDateInputValue(model.date),
  };
}
