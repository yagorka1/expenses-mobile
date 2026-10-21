import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyCode, STATISTICS_CURRENCIES } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES } from '../../../core/constants/messages';
import {
  CUSTOM_STATISTICS_PERIOD,
  DEFAULT_STATISTICS_PERIOD,
  STATISTICS_PERIOD_SELECTION_OPTIONS,
} from '../../../core/constants/ui.constants';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { EurRates } from '../../../core/models/exchange-rates.model';
import { SelectOption } from '../../../core/models/select-option.model';
import { StatisticsPeriodSelection } from '../../../core/models/statistics.model';
import { ExchangeRatesService } from '../../../core/services/exchange-rates.service';
import { TodayService } from '../../../core/services/today.service';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { fromDateInputValue, getDateInputRange, getPeriodRange, toDateInputValue } from '../../../core/utils/date.utils';
import { getDataErrorMessage } from '../../../core/utils/firebase-error.utils';
import { buildStatistics } from '../../../core/utils/statistics.utils';
import { ChipSelect } from '../../../shared/components/chip-select/chip-select';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { BreakdownList } from '../breakdown-list/breakdown-list';
import { SummaryCard } from '../summary-card/summary-card';

@Component({
  selector: 'app-statistics-page',
  imports: [ChipSelect, StateMessage, SummaryCard, BreakdownList],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.scss',
})
export class StatisticsPage {
  private readonly expensesRepository = inject(ExpensesRepository);
  private readonly preferences = inject(UserPreferencesService);
  private readonly exchangeRates = inject(ExchangeRatesService);

  protected readonly periodOptions = STATISTICS_PERIOD_SELECTION_OPTIONS;
  protected readonly currencyOptions: readonly SelectOption<CurrencyCode>[] = STATISTICS_CURRENCIES.map((code) => ({
    value: code,
    label: code,
  }));
  protected readonly emptyMessage = EMPTY_STATE_MESSAGES.statistics;
  protected readonly today = inject(TodayService).date;

  protected readonly period = signal<StatisticsPeriodSelection>(DEFAULT_STATISTICS_PERIOD);
  protected readonly currency = signal<CurrencyCode>(this.preferences.statisticsCurrency);
  /** `YYYY-MM-DD` bounds of the custom period; it starts as the current month up to today. */
  protected readonly customFrom = signal(toDateInputValue(getPeriodRange('month').from));
  protected readonly customTo = signal(this.today());
  /**
   * For expenses without a stored conversion into the selected currency (migrated ones). Known right
   * away, so totals never jump; replaced by fresh rates once they load.
   */
  private readonly fallbackRates = signal<EurRates>(this.exchangeRates.peek(this.today()).rates);

  protected readonly isCustomPeriod = computed(() => this.period() === CUSTOM_STATISTICS_PERIOD);
  protected readonly range = computed(() => {
    const period = this.period();
    return period === CUSTOM_STATISTICS_PERIOD
      ? getDateInputRange(this.customFrom(), this.customTo())
      : getPeriodRange(period, fromDateInputValue(this.today()));
  });
  protected readonly state = this.expensesRepository.inRange(this.range);
  protected readonly statistics = computed(() =>
    buildStatistics(this.state().data, this.currency(), this.fallbackRates()),
  );
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
  });

  constructor() {
    this.exchangeRates.exact(this.today()).then((exact) => {
      if (exact) {
        this.fallbackRates.set(exact.rates);
      }
    });

    effect(() => {
      this.preferences.statisticsCurrency = this.currency();
    });
  }

  /** A cleared date input reports an empty value; the previous date is kept then. */
  protected onDatePick(bound: 'from' | 'to', event: Event): void {
    const { value } = event.target as HTMLInputElement;
    if (value) {
      (bound === 'from' ? this.customFrom : this.customTo).set(value);
    }
  }
}
