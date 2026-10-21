import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  EXCHANGE_RATES_TIMEOUT_MS,
  EXCHANGE_RATES_TTL_MS,
  FALLBACK_EUR_RATES,
  HISTORICAL_RATES_CACHE_SIZE,
  LATEST_RATES_URLS,
  RATES_HISTORY_START,
  historicalRatesUrls,
} from '../constants/exchange-rates.constants';
import { CURRENCIES } from '../constants/expense.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  CachedExchangeRates,
  CurrencyApiResponse,
  EurRates,
  HistoricalRatesCache,
  PublishedRates,
  RatesSnapshot,
} from '../models/exchange-rates.model';
import { toDateInputValue } from '../utils/date.utils';
import { NetworkStatusService } from './network-status.service';
import { StorageService } from './storage.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Key of the latest rates among the requests in flight (days are `YYYY-MM-DD`). */
const LATEST_REQUEST_KEY = 'latest';

const isValidRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** A rate of 0, a missing currency or garbage would turn every conversion into NaN or Infinity. */
const isValidRates = (rates: unknown): rates is EurRates =>
  typeof rates === 'object' &&
  rates !== null &&
  CURRENCIES.every((code) => isValidRate((rates as Partial<EurRates>)[code]));

/** Today's rates may not be published yet and the API has nothing before its history: both use the latest rates. */
const usesLatestRates = (day: string): boolean => day >= toDateInputValue(new Date()) || day < RATES_HISTORY_START;

/**
 * The exact rates of a `YYYY-MM-DD` day are the ones published for that day; today and days before
 * the API's history use the latest rates fetched within the TTL instead.
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRatesService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly network = inject(NetworkStatusService);
  /** So that a prefetch and a save right after it don't fetch the same rates twice. */
  private readonly requests = new Map<string, Promise<PublishedRates | null>>();

  /**
   * The day's rates without waiting for the network: the exact ones when they're cached, otherwise
   * the latest known or built-in rates as a stand-in (`date: null`).
   */
  peek(day: string): RatesSnapshot {
    return this.cachedExact(day) ?? { rates: this.cachedLatest()?.rates ?? FALLBACK_EUR_RATES, date: null };
  }

  /** The day's exact rates from the cache or the network; `null` while they can't be had (offline, not published yet). */
  exact(day: string): Promise<PublishedRates | null> {
    const cached = this.cachedExact(day);
    if (cached) {
      return Promise.resolve(cached);
    }
    if (!this.network.online()) {
      return Promise.resolve(null);
    }

    const latest = usesLatestRates(day);
    const key = latest ? LATEST_REQUEST_KEY : day;
    let request = this.requests.get(key);
    if (!request) {
      request = (latest ? this.fetchLatest() : this.fetchHistorical(day)).finally(() => this.requests.delete(key));
      this.requests.set(key, request);
    }
    return request;
  }

  /** Loads the day's rates in the background, so that saving an expense finds them in the cache. */
  prefetch(day: string): void {
    void this.exact(day);
  }

  private cachedExact(day: string): PublishedRates | null {
    if (usesLatestRates(day)) {
      const latest = this.cachedLatest();
      return latest && Date.now() - latest.fetchedAt < EXCHANGE_RATES_TTL_MS
        ? { rates: latest.rates, date: latest.date }
        : null;
    }
    const rates = this.historicalCache()[day];
    return isValidRates(rates) ? { rates, date: day } : null;
  }

  private cachedLatest(): CachedExchangeRates | null {
    const cached = this.storage.get<CachedExchangeRates>(STORAGE_KEYS.exchangeRates);
    return cached && isValidRates(cached.rates) && DATE_PATTERN.test(cached.date) ? cached : null;
  }

  private historicalCache(): HistoricalRatesCache {
    return this.storage.get<HistoricalRatesCache>(STORAGE_KEYS.historicalRates) ?? {};
  }

  private async fetchLatest(): Promise<PublishedRates | null> {
    const fetched = await this.fetchFirst(LATEST_RATES_URLS);
    if (fetched) {
      this.storage.set<CachedExchangeRates>(STORAGE_KEYS.exchangeRates, { ...fetched, fetchedAt: Date.now() });
    }
    return fetched;
  }

  private async fetchHistorical(day: string): Promise<PublishedRates | null> {
    const fetched = await this.fetchFirst(historicalRatesUrls(day));
    // Another day's rates would be cached under the wrong key.
    if (fetched?.date !== day) {
      return null;
    }
    this.cacheHistorical(day, fetched.rates);
    return fetched;
  }

  /** The first mirror that returns complete, valid rates. */
  private async fetchFirst(urls: readonly string[]): Promise<PublishedRates | null> {
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
  private toSnapshot(response: CurrencyApiResponse): PublishedRates | null {
    if (!DATE_PATTERN.test(response?.date) || typeof response.eur !== 'object' || response.eur === null) {
      return null;
    }
    const rates = Object.fromEntries(CURRENCIES.map((code) => [code, response.eur[code.toLowerCase()]]));
    return isValidRates(rates) ? { rates, date: response.date } : null;
  }

  /** Keeps the newest days; the cache is re-read because other requests may have added days meanwhile. */
  private cacheHistorical(day: string, rates: EurRates): void {
    const cache: HistoricalRatesCache = { ...this.historicalCache(), [day]: rates };
    const days = Object.keys(cache).sort().slice(-HISTORICAL_RATES_CACHE_SIZE);
    this.storage.set<HistoricalRatesCache>(
      STORAGE_KEYS.historicalRates,
      Object.fromEntries(days.map((key) => [key, cache[key]])),
    );
  }
}
