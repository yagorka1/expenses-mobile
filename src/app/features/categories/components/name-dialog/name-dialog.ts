import { Component, ElementRef, effect, input, model, signal, untracked, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate } from '@angular/forms/signals';
import { CATEGORY_NAME_MAX_LENGTH } from '../../../../core/constants/category.constants';
import { CONFIRM_MESSAGES, VALIDATION_MESSAGES } from '../../../../core/constants/messages';
import { FieldError } from '../../../../shared/components/field-error/field-error';

/** Resolves to `true` when the dialog may close, `false` to keep it open (e.g. the save failed). */
export type NameDialogSave = (name: string) => Promise<boolean>;

interface NameFormModel {
  name: string;
}

const normalize = (name: string): string => name.trim().toLocaleLowerCase();

/** Asks for a category or subcategory name on top of the native `<dialog>`, like `ConfirmDialog`. */
@Component({
  selector: 'app-name-dialog',
  imports: [FormField, FormRoot, FieldError],
  templateUrl: './name-dialog.html',
  styleUrl: './name-dialog.scss',
})
export class NameDialog {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly hint = input('');
  readonly initialName = input('');
  /** Names of the siblings: the bot picks categories by name, so they must stay unique. */
  readonly takenNames = input<readonly string[]>([]);
  readonly save = input.required<NameDialogSave>();

  protected readonly cancelLabel = CONFIRM_MESSAGES.cancel;
  protected readonly model = signal<NameFormModel>({ name: '' });
  protected readonly nameForm = form(
    this.model,
    (path) => {
      maxLength(path.name, CATEGORY_NAME_MAX_LENGTH, { message: VALIDATION_MESSAGES.nameTooLong });
      validate(path.name, ({ value }) => {
        const name = normalize(value());
        // Unlike `required`, also rejects a name of spaces only.
        if (!name) {
          return { kind: 'blank', message: VALIDATION_MESSAGES.nameRequired };
        }
        const taken = this.takenNames().some((other) => normalize(other) === name);
        return taken ? { kind: 'taken', message: VALIDATION_MESSAGES.nameTaken } : undefined;
      });
    },
    { submission: { action: () => this.submit() } },
  );

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        untracked(() => {
          this.model.set({ name: this.initialName() });
          this.nameForm().reset();
        });
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
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

  private async submit(): Promise<undefined> {
    if (await this.save()(this.model().name.trim())) {
      this.open.set(false);
    }
    return undefined;
  }
}
