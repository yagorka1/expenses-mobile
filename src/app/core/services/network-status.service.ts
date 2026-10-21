import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly status = signal(this.window?.navigator.onLine ?? true);

  readonly online = this.status.asReadonly();

  constructor() {
    const update = (): void => this.status.set(this.window?.navigator.onLine ?? true);
    this.window?.addEventListener('online', update);
    this.window?.addEventListener('offline', update);

    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('online', update);
      this.window?.removeEventListener('offline', update);
    });
  }
}
