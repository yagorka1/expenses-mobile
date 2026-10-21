import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  BASE_CURRENCY,
  EXCHANGE_RATES_TIMEOUT_MS,
  EXCHANGE_RATES_TTL_MS,
  EXCHANGE_RATES_URL,
  FALLBACK_EUR_RATES,
  FIXED_EUR_RATES,
  MARKET_CURRENCIES,
} from '../constants/exchange-rates.constants';
import { CURRENCIES } from '../constants/expense.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { CachedExchangeRates, EurRates, FrankfurterResponse } from '../models/exchange-rates.model';
import { NetworkStatusService } from './network-status.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ExchangeRatesService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly network = inject(NetworkStatusService);

  /** Fresh cached rates if possible, otherwise fetched ones; never fails (falls back to cached/static rates). */
  async getEurRates(): Promise<EurRates> {
    const cached = this.storage.get<CachedExchangeRates>(STORAGE_KEYS.exchangeRates);
    const fallback = cached?.rates ?? FALLBACK_EUR_RATES;

    if (cached && Date.now() - cached.fetchedAt < EXCHANGE_RATES_TTL_MS) {
      return cached.rates;
    }
    if (!this.network.online()) {
      return fallback;
    }

    try {
      const response = await firstValueFrom(
        this.http
          .get<FrankfurterResponse>(EXCHANGE_RATES_URL, {
            params: { base: BASE_CURRENCY, symbols: MARKET_CURRENCIES.join(',') },
          })
          .pipe(timeout(EXCHANGE_RATES_TIMEOUT_MS)),
      );
      const rates = this.toEurRates(response, fallback);
      this.storage.set<CachedExchangeRates>(STORAGE_KEYS.exchangeRates, { rates, fetchedAt: Date.now() });
      return rates;
    } catch {
      return fallback;
    }
  }

  private toEurRates(response: FrankfurterResponse, fallback: EurRates): EurRates {
    return Object.fromEntries(
      CURRENCIES.map((code) => [
        code,
        code === BASE_CURRENCY ? 1 : (FIXED_EUR_RATES[code] ?? response.rates[code] ?? fallback[code]),
      ]),
    ) as EurRates;
  }
}
