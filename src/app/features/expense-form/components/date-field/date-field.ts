import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { DATE_FORMATS } from '../../../../core/constants/ui.constants';
import { TodayService } from '../../../../core/services/today.service';
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
  protected readonly today = inject(TodayService).date;
  protected readonly quickOptions = computed(() => [
    { value: this.today(), label: 'Сегодня' },
    { value: toDateInputValue(addDays(fromDateInputValue(this.today()), -1)), label: 'Вчера' },
  ]);

  protected readonly customDate = computed(() => {
    const value = this.value();
    const isQuick = this.quickOptions().some((option) => option.value === value);
    return value && !isQuick ? fromDateInputValue(value) : null;
  });

  protected select(value: string): void {
    this.value.set(value);
  }

  /** Chrome opens the picker only from its own calendar icon, which is invisible here. */
  protected openPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    try {
      input.showPicker?.();
    } catch {
      // Unsupported or not allowed (e.g. already open): the native tap behaviour still applies.
    }
  }

  protected onPick(event: Event): void {
    const { value } = event.target as HTMLInputElement;
    if (value) {
      this.value.set(value);
    }
  }
}
