// src/lib/toast.ts
// Singleton toast emitter — works anywhere, inside or outside React tree.

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
type ToastListener = (type: ToastType, title: string, message?: string) => string | undefined;

let _listener: ToastListener | null = null;
let _dismissListener: ((id: string) => void) | null = null;

/** Register the active toast renderer (called by ToastProvider). */
export function registerToastListener(onAdd: ToastListener, onDismiss: (id: string) => void): () => void {
  _listener = onAdd;
  _dismissListener = onDismiss;
  return () => { _listener = null; _dismissListener = null; };
}

/** Drop-in utility — call from anywhere including non-React code. */
export const toast = {
  success: (title: string, message?: string) => _listener?.('success', title, message),
  error:   (title: string, message?: string) => _listener?.('error',   title, message),
  warning: (title: string, message?: string) => _listener?.('warning', title, message),
  info:    (title: string, message?: string) => _listener?.('info',    title, message),
  loading: (title: string, message?: string) => _listener?.('loading', title, message),

  dismiss: (id: string) => {
    if (id) _dismissListener?.(id);
  },

  promise: async <T>(
    promise: Promise<T>,
    { loading, success, error }: { loading: string; success: (data: T) => string; error: (err: any) => string }
  ) => {
    const loadingId = _listener?.('loading', loading);
    try {
      const result = await promise;
      if (loadingId) _dismissListener?.(loadingId);
      _listener?.('success', success(result));
      return result;
    } catch (err) {
      if (loadingId) _dismissListener?.(loadingId);
      _listener?.('error', error(err));
      throw err;
    }
  }
};
