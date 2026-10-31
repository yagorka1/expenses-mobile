import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  template: `
    @if (toastService.toast(); as toast) {
      @if (toast.action; as action) {
        <div class="toast toast--with-action" [class]="'toast toast--with-action toast--' + toast.type">
          <span class="toast__message">{{ toast.message }}</span>
          <button type="button" class="toast__action" (click)="toastService.runAction()">
            {{ action.label }}
          </button>
        </div>
      } @else {
        <button type="button" class="toast" [class]="'toast toast--' + toast.type" (click)="toastService.dismiss()">
          {{ toast.message }}
        </button>
      }
    }
  `,
  styleUrl: './toast-outlet.scss',
  host: { 'aria-live': 'polite' },
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}
