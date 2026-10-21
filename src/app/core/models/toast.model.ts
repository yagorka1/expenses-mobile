export type ToastType = 'success' | 'info' | 'error';

export interface Toast {
  message: string;
  type: ToastType;
}
