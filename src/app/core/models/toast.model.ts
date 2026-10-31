export type ToastType = 'success' | 'info' | 'error';

/** A button next to the message, e.g. "Отменить". */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  message: string;
  type: ToastType;
  action?: ToastAction;
}
