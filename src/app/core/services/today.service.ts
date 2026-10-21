import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { addDays, toDateInputValue } from '../utils/date.utils';

/** Delay after midnight before re-reading the date, so the timer never fires a moment too early. */
const MIDNIGHT_MARGIN_MS = 1_000;

const msUntilMidnight = (now: Date): number => {
  const midnight = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
  return midnight.getTime() - now.getTime() + MIDNIGHT_MARGIN_MS;
};

/**
 * Today's local date as `YYYY-MM-DD`. An installed PWA stays open for days, so the value
 * follows midnight and is re-read whenever the app comes back from the background.
 */
@Injectable({ providedIn: 'root' })
export class TodayService {
  private readonly document = inject(DOCUMENT);
  private readonly value = signal(toDateInputValue(new Date()));
  private timer?: ReturnType<typeof setTimeout>;

  readonly date = this.value.asReadonly();

  constructor() {
    // Timers are frozen while the app is in the background, hence the visibility check too.
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'visible') {
        this.refresh();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    this.scheduleRefresh();

    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(this.timer);
    });
  }

  private refresh(): void {
    this.value.set(toDateInputValue(new Date()));
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), msUntilMidnight(new Date()));
  }
}
