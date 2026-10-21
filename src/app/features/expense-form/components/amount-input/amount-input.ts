import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

@Component({
  selector: 'app-amount-input',
  imports: [FormField],
  template: `
    <input
      class="amount-input__field"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      placeholder="0"
      aria-label="Сумма"
      [formField]="field()"
    />
    <span class="amount-input__currency">{{ currency() }}</span>
  `,
  styleUrl: './amount-input.scss',
})
export class AmountInput {
  readonly field = input.required<FieldTree<string>>();
  readonly currency = input.required<string>();
}
