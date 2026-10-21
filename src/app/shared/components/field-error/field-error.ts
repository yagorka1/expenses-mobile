import { Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/** Shows the first validation message of a field once it has been touched (or the form submitted). */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message(); as text) {
      <p class="field-error" role="alert">{{ text }}</p>
    }
  `,
  styles: `
    .field-error {
      margin: var(--space-1) 0 0;
      color: var(--color-danger);
      font-size: 13px;
    }
  `,
})
export class FieldError<T> {
  readonly field = input.required<FieldTree<T>>();

  protected readonly message = computed(() => {
    const state = this.field()();
    return state.touched() && state.invalid() ? (state.errors()[0]?.message ?? null) : null;
  });
}
