import { Component, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { SelectOption } from '../../../core/models/select-option.model';

/** Single choice as a row of chips. Works with `[formField]` and with `[(value)]`. */
@Component({
  selector: 'app-chip-select',
  templateUrl: './chip-select.html',
  styleUrl: './chip-select.scss',
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'label() || null',
  },
})
export class ChipSelect<T extends string = string> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly label = input('');
  readonly disabled = input(false);

  protected select(option: T): void {
    this.value.set(option);
  }
}
