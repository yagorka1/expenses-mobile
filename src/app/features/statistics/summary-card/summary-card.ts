import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { DATE_FORMATS } from '../../../core/constants/ui.constants';
import { DateRange } from '../../../core/models/statistics.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-summary-card',
  imports: [DatePipe, MoneyPipe],
  template: `
    <span class="summary__range">
      {{ range().from | date: dateFormat() }} — {{ range().to | date: dateFormat() }}
    </span>
    <span class="summary__total">{{ total() | money: currency() }}</span>
    <span class="summary__count">Трат: {{ count() }}</span>
  `,
  styleUrl: './summary-card.scss',
  host: { class: 'card' },
})
export class SummaryCard {
  readonly total = input.required<number>();
  readonly count = input.required<number>();
  readonly currency = input.required<string>();
  readonly range = input.required<DateRange>();

  /** The year is shown only when the range reaches outside the current one. */
  protected readonly dateFormat = computed(() => {
    const { from, to } = this.range();
    const currentYear = new Date().getFullYear();
    return from.getFullYear() === currentYear && to.getFullYear() === currentYear
      ? DATE_FORMATS.short
      : DATE_FORMATS.shortWithYear;
  });
}
