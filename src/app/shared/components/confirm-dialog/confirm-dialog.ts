import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';
import { CONFIRM_MESSAGES } from '../../../core/constants/messages';

/** Modal confirmation on top of the native `<dialog>`: Esc and a tap on the backdrop cancel it. */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input<string>(CONFIRM_MESSAGES.cancel);
  readonly confirmed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected confirm(): void {
    this.open.set(false);
    this.confirmed.emit();
  }

  protected cancel(): void {
    this.open.set(false);
  }

  /** The dialog has no padding, so only a click outside the content targets the element itself. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.cancel();
    }
  }
}
