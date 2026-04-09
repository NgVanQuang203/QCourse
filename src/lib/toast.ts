// src/lib/toast.ts
// Singleton toast emitter — works anywhere, inside or outside React tree.

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastListener = (type: ToastType, title: string, message?: string) => void;

let _listener: ToastListener | null = null;

/** Register the active toast renderer (called by ToastProvider). */
export function registerToastListener(fn: ToastListener): () => void {
  _listener = fn;
  return () => { _listener = null; };
}

/** Drop-in utility — call from anywhere including non-React code. */
export const toast = {
  success: (title: string, message?: string) => _listener?.('success', title, message),
  error:   (title: string, message?: string) => _listener?.('error',   title, message),
  warning: (title: string, message?: string) => _listener?.('warning', title, message),
  info:    (title: string, message?: string) => _listener?.('info',    title, message),
};
