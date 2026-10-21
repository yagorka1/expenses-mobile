import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyCode, STATISTICS_CURRENCIES } from '../../../core/constants/expense.constants';
import { EMPTY_STATE_MESSAGES } from '../../../core/constants/messages';
import { DEFAULT_STATISTICS_PERIOD, STATISTICS_PERIOD_OPTIONS } from '../../../core/constants/ui.constants';
import { ExpensesRepository } from '../../../core/data/expenses.repository';
import { SelectOption } from '../../../core/models/select-option.model';
import { StatisticsPeriod } from '../../../core/models/statistics.model';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { getPeriodRange } from '../../../core/utils/date.utils';
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
})
export class StatisticsPage {
  private readonly expensesRepository = inject(ExpensesRepository);
  private readonly preferences = inject(UserPreferencesService);

  protected readonly periodOptions = STATISTICS_PERIOD_OPTIONS;
  protected readonly currencyOptions: readonly SelectOption<CurrencyCode>[] = STATISTICS_CURRENCIES.map((code) => ({
    value: code,
    label: code,
  }));
  protected readonly emptyMessage = EMPTY_STATE_MESSAGES.statistics;

  protected readonly period = signal<StatisticsPeriod>(DEFAULT_STATISTICS_PERIOD);
  protected readonly currency = signal<CurrencyCode>(this.preferences.statisticsCurrency);

  protected readonly range = computed(() => getPeriodRange(this.period()));
  protected readonly state = this.expensesRepository.inRange(this.range);
  protected readonly statistics = computed(() => buildStatistics(this.state().data, this.currency()));
  protected readonly errorMessage = computed(() => {
    const error = this.state().error;
    return error ? getDataErrorMessage(error) : null;
  });

  constructor() {
    effect(() => {
      this.preferences.statisticsCurrency = this.currency();
    });
  }
}
