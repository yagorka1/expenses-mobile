import { Injectable, inject } from '@angular/core';
import {
  CURRENCIES,
  CurrencyCode,
  DEFAULT_CURRENCY,
  DEFAULT_STATISTICS_CURRENCY,
  PERSONS,
  STATISTICS_CURRENCIES,
} from '../constants/expense.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

/** Remembers the last choices so the next expense needs fewer taps. */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly storage = inject(StorageService);

  get lastCurrency(): CurrencyCode {
    return this.pick(STORAGE_KEYS.lastCurrency, CURRENCIES, DEFAULT_CURRENCY);
  }

  set lastCurrency(value: CurrencyCode) {
    this.storage.set(STORAGE_KEYS.lastCurrency, value);
  }

  get lastPerson(): string {
    return this.pick(STORAGE_KEYS.lastPerson, PERSONS, '');
  }

  set lastPerson(value: string) {
    this.storage.set(STORAGE_KEYS.lastPerson, value);
  }

  get statisticsCurrency(): CurrencyCode {
    return this.pick(STORAGE_KEYS.statisticsCurrency, STATISTICS_CURRENCIES, DEFAULT_STATISTICS_CURRENCY);
  }

  set statisticsCurrency(value: CurrencyCode) {
    this.storage.set(STORAGE_KEYS.statisticsCurrency, value);
  }

  private pick<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const stored = this.storage.get<T>(key);
    return stored !== null && allowed.includes(stored) ? stored : fallback;
  }
}
