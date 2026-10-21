import { DatePipe } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { DATE_FORMATS } from '../../../../core/constants/ui.constants';
import { addDays, fromDateInputValue, toDateInputValue } from '../../../../core/utils/date.utils';

/** "Today" / "Yesterday" chips plus a native date picker; the value is `YYYY-MM-DD`. */
@Component({
  selector: 'app-date-field',
  imports: [DatePipe],
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
  host: { role: 'group', 'aria-label': 'Дата' },
})
export class DateField implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly disabled = input(false);

  protected readonly dateFormat = DATE_FORMATS.short;
  protected readonly today = toDateInputValue(new Date());
  protected readonly quickOptions = [
    { value: this.today, label: 'Сегодня' },
    { value: toDateInputValue(addDays(new Date(), -1)), label: 'Вчера' },
  ];

  protected readonly customDate = computed(() => {
    const value = this.value();
    const isQuick = this.quickOptions.some((option) => option.value === value);
    return value && !isQuick ? fromDateInputValue(value) : null;
  });

  protected select(value: string): void {
    this.value.set(value);
  }

  protected onPick(event: Event): void {
    const { value } = event.target as HTMLInputElement;
    if (value) {
      this.value.set(value);
    }
  }
}
