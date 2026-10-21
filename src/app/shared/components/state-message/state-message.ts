import { Component, input } from '@angular/core';

export type StateMessageType = 'loading' | 'empty' | 'error';

@Component({
  selector: 'app-state-message',
  template: `
    @if (type() === 'loading') {
      <span class="state-message__spinner" aria-hidden="true"></span>
    }
    <p class="state-message__text">{{ message() }}</p>
  `,
  styleUrl: './state-message.scss',
  host: {
    '[class]': '"state-message state-message--" + type()',
    '[attr.role]': 'type() === "error" ? "alert" : "status"',
  },
})
export class StateMessage {
  readonly type = input.required<StateMessageType>();
  readonly message = input('');
}
