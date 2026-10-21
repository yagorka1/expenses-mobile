import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FALLBACK_EUR_RATES, LATEST_RATES_URLS, historicalRatesUrls } from '../constants/exchange-rates.constants';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { CachedExchangeRates, CurrencyApiResponse, EurRates } from '../models/exchange-rates.model';
import { ExchangeRatesService } from './exchange-rates.service';
import { NetworkStatusService } from './network-status.service';

const HOUR_MS = 60 * 60 * 1_000;
const RATES: EurRates = { EUR: 1, USD: 1.12, PLN: 4.37, RSD: 117.45, BYN: 3.34 };

const response = (date: string): CurrencyApiResponse => ({
  date,
  eur: { eur: 1, usd: 1.12, pln: 4.37, rsd: 117.45, byn: 3.34, uah: 48.1 },
});

/** Lets the service handle a settled request before the next expectation. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('ExchangeRatesService', () => {
  const online = signal(true);
  let service: ExchangeRatesService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 15));
    localStorage.clear();
    online.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NetworkStatusService, useValue: { online } },
      ],
    });
    service = TestBed.inject(ExchangeRatesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('stands in with the built-in rates when nothing is cached', () => {
    expect(service.peek('2026-10-20')).toEqual({ rates: FALLBACK_EUR_RATES, date: null });
  });

  it("fetches a past day's rates once and serves them from the cache afterwards", async () => {
    const exact = service.exact('2026-10-20');
    http.expectOne(historicalRatesUrls('2026-10-20')[0]).flush(response('2026-10-20'));

    expect(await exact).toEqual({ rates: RATES, date: '2026-10-20' });
    expect(service.peek('2026-10-20')).toEqual({ rates: RATES, date: '2026-10-20' });
  });

  it('tries the mirror when the first source fails', async () => {
    const exact = service.exact('2026-10-20');
    http.expectOne(historicalRatesUrls('2026-10-20')[0]).flush('', { status: 404, statusText: 'Not Found' });
    await settle();
    http.expectOne(historicalRatesUrls('2026-10-20')[1]).flush(response('2026-10-20'));

    expect((await exact)?.date).toBe('2026-10-20');
  });

  it('rejects rates without every supported currency', async () => {
    const exact = service.exact('2026-10-20');
    for (const url of historicalRatesUrls('2026-10-20')) {
      http.expectOne(url).flush({ date: '2026-10-20', eur: { eur: 1, usd: 1.12 } });
      await settle();
    }

    expect(await exact).toBeNull();
  });

  it('shares one request between a prefetch and a save', async () => {
    service.prefetch('2026-10-20');
    const exact = service.exact('2026-10-20');
    http.expectOne(historicalRatesUrls('2026-10-20')[0]).flush(response('2026-10-20'));

    expect((await exact)?.date).toBe('2026-10-20');
  });

  it('uses the latest rates for today and only within their TTL', async () => {
    const exact = service.exact('2026-10-21');
    http.expectOne(LATEST_RATES_URLS[0]).flush(response('2026-10-21'));
    expect((await exact)?.date).toBe('2026-10-21');

    vi.setSystemTime(new Date(2026, 9, 22, 4));
    expect(service.peek('2026-10-22')).toEqual({ rates: RATES, date: null });
  });

  it('uses the latest rates for days before the history of the API', async () => {
    const exact = service.exact('2023-05-01');
    http.expectOne(LATEST_RATES_URLS[0]).flush(response('2026-10-21'));

    expect((await exact)?.date).toBe('2026-10-21');
  });

  it('only stands in with the last known rates while offline', async () => {
    const stale: CachedExchangeRates = { rates: RATES, date: '2026-10-18', fetchedAt: Date.now() - 72 * HOUR_MS };
    localStorage.setItem(STORAGE_KEYS.exchangeRates, JSON.stringify(stale));
    online.set(false);

    expect(await service.exact('2026-10-20')).toBeNull();
    expect(service.peek('2026-10-20')).toEqual({ rates: RATES, date: null });
  });
});
