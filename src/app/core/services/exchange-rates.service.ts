import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  EXCHANGE_RATES_TIMEOUT_MS,
  EXCHANGE_RATES_TTL_MS,
  FALLBACK_EUR_RATES,
  HISTORICAL_RATES_CACHE_SIZE,
  LATEST_RATES_URLS,
  historicalRatesUrls,
} from '../constants/exchange-rates.constants';
import { CURRENCIES } from '../constants/expense.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  CachedExchangeRates,
  CurrencyApiResponse,
  EurRates,
  HistoricalRatesCache,
  RatesSnapshot,
} from '../models/exchange-rates.model';
import { toDateInputValue } from '../utils/date.utils';
import { NetworkStatusService } from './network-status.service';
import { StorageService } from './storage.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** A rate of 0, a missing currency or garbage would turn every conversion into NaN or Infinity. */
const isValidRates = (rates: unknown): rates is EurRates =>
  typeof rates === 'object' &&
  rates !== null &&
  CURRENCIES.every((code) => isValidRate((rates as Partial<EurRates>)[code]));

@Injectable({ providedIn: 'root' })
export class ExchangeRatesService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly network = inject(NetworkStatusService);

  /**
   * Rates for the given `YYYY-MM-DD` day: that day's rates for past days, the latest ones for today
   * (or when the day's rates are unavailable). Never fails: falls back to cached, then built-in rates.
   */
  async getRates(day: string = toDateInputValue(new Date())): Promise<RatesSnapshot> {
    if (day < toDateInputValue(new Date())) {
      const historical = await this.getHistoricalRates(day);
      if (historical) {
        return historical;
      }
    }
    return this.getLatestRates();
  }

  private async getHistoricalRates(day: string): Promise<RatesSnapshot | null> {
    const cache = this.storage.get<HistoricalRatesCache>(STORAGE_KEYS.historicalRates) ?? {};
    const cached = cache[day];
    if (isValidRates(cached)) {
      return { rates: cached, date: day };
    }
    if (!this.network.online()) {
      return null;
    }

    const fetched = await this.fetchFirst(historicalRatesUrls(day));
    if (fetched) {
      this.cacheHistorical(cache, day, fetched.rates);
    }
    return fetched;
  }

  private async getLatestRates(): Promise<RatesSnapshot> {
    const cached = this.storage.get<CachedExchangeRates>(STORAGE_KEYS.exchangeRates);
    const validCached = cached && isValidRates(cached.rates) && DATE_PATTERN.test(cached.date) ? cached : null;

    if (validCached && Date.now() - validCached.fetchedAt < EXCHANGE_RATES_TTL_MS) {
      return { rates: validCached.rates, date: validCached.date };
    }

    const fetched = this.network.online() ? await this.fetchFirst(LATEST_RATES_URLS) : null;
    if (fetched?.date) {
      this.storage.set<CachedExchangeRates>(STORAGE_KEYS.exchangeRates, {
        rates: fetched.rates,
        date: fetched.date,
        fetchedAt: Date.now(),
      });
      return fetched;
    }
    // Stale rates are still better than the built-in ones; `date` tells how stale they are.
    return validCached
      ? { rates: validCached.rates, date: validCached.date }
      : { rates: FALLBACK_EUR_RATES, date: null };
  }

  /** The first mirror that returns complete, valid rates. */
  private async fetchFirst(urls: readonly string[]): Promise<RatesSnapshot | null> {
    for (const url of urls) {
      try {
        const response = await firstValueFrom(
          this.http.get<CurrencyApiResponse>(url).pipe(timeout(EXCHANGE_RATES_TIMEOUT_MS)),
        );
        const snapshot = this.toSnapshot(response);
        if (snapshot) {
          return snapshot;
        }
      } catch {
        // Try the next mirror.
      }
    }
    return null;
  }

  /** `null` unless every supported currency has a valid rate: mixing in fallback rates would hide it. */
  private toSnapshot(response: CurrencyApiResponse): RatesSnapshot | null {
    if (!DATE_PATTERN.test(response?.date) || typeof response.eur !== 'object' || response.eur === null) {
      return null;
    }
    const rates = Object.fromEntries(CURRENCIES.map((code) => [code, response.eur[code.toLowerCase()]]));
    return isValidRates(rates) ? { rates, date: response.date } : null;
  }

  private cacheHistorical(cache: HistoricalRatesCache, day: string, rates: EurRates): void {
    const days = Object.keys({ ...cache, [day]: rates })
      .sort()
      .slice(-HISTORICAL_RATES_CACHE_SIZE);
    const next = Object.fromEntries(days.map((key) => [key, key === day ? rates : cache[key]]));
    this.storage.set<HistoricalRatesCache>(STORAGE_KEYS.historicalRates, next);
  }
}
