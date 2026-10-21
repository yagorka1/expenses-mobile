import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  template: `
    @if (toastService.toast(); as toast) {
      <button type="button" class="toast" [class]="'toast toast--' + toast.type" (click)="toastService.dismiss()">
        {{ toast.message }}
      </button>
    }
  `,
  styleUrl: './toast-outlet.scss',
  host: { 'aria-live': 'polite' },
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}
