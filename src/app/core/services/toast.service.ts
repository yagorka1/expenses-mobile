import { Injectable, signal } from '@angular/core';
import { TOAST_DURATION_MS } from '../constants/ui.constants';
import { Toast, ToastType } from '../models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly current = signal<Toast | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  readonly toast = this.current.asReadonly();

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(): void {
    clearTimeout(this.hideTimer);
    this.current.set(null);
  }

  private show(message: string, type: ToastType): void {
    clearTimeout(this.hideTimer);
    this.current.set({ message, type });
    this.hideTimer = setTimeout(() => this.current.set(null), TOAST_DURATION_MS);
  }
}
