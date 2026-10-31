import { Injectable, signal } from '@angular/core';
import { TOAST_DURATION_MS } from '../constants/ui.constants';
import { Toast, ToastAction, ToastType } from '../models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly current = signal<Toast | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  readonly toast = this.current.asReadonly();

  /** With an `action`, pass how long it makes sense as `durationMs`: the button goes away with the toast. */
  success(message: string, action?: ToastAction, durationMs = TOAST_DURATION_MS): void {
    this.show(message, 'success', action, durationMs);
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

  /** The current toast's button: hides the toast, then runs the action (which may show another toast). */
  runAction(): void {
    const action = this.current()?.action;
    this.dismiss();
    action?.run();
  }

  private show(message: string, type: ToastType, action?: ToastAction, durationMs = TOAST_DURATION_MS): void {
    clearTimeout(this.hideTimer);
    this.current.set({ message, type, action });
    this.hideTimer = setTimeout(() => this.current.set(null), durationMs);
  }
}
