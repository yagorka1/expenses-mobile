import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { DATE_FORMATS } from '../../../core/constants/ui.constants';
import { DateRange } from '../../../core/models/statistics.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-summary-card',
  imports: [DatePipe, MoneyPipe],
  template: `
    <span class="summary__range">
      {{ range().from | date: dateFormat }} — {{ range().to | date: dateFormat }}
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

  protected readonly dateFormat = DATE_FORMATS.short;
}
