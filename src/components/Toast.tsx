"use client";

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './Toast.module.css';
import { registerToastListener } from '@/lib/toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  exiting: boolean;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItemComponent({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[toast.type];

  const typeClass = {
    success: styles.toastSuccess,
    error: styles.toastError,
    warning: styles.toastWarning,
    info: styles.toastInfo,
  }[toast.type];

  return (
    <div
      className={`${styles.toast} ${typeClass} ${toast.exiting ? styles.toastExiting : ''}`}
    >
      <div className={styles.toastIcon}>
        <Icon size={16} />
      </div>
      <div className={styles.toastBody}>
        <div className={styles.toastTitle}>{toast.title}</div>
        {toast.message && <div className={styles.toastMsg}>{toast.message}</div>}
      </div>
      <button className={styles.toastClose} onClick={() => onRemove(toast.id)}>
        <X size={14} />
      </button>
      <div
        className={styles.toastBar}
        style={{ '--duration': `${toast.duration}ms` } as React.CSSProperties}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 260);
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const item: ToastItem = { id, type, title, message, duration, exiting: false };
    setToasts(prev => [...prev, item]);
    const timer = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, timer);
  }, [remove]);

  // Connect the singleton emitter so non-React code (e.g. store) can trigger toasts
  useEffect(() => {
    return registerToastListener((type, title, message) => add(type, title, message));
  }, [add]);

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className={styles.toastRoot} role="region" aria-label="Thông báo">
        {toasts.map(t => (
          <ToastItemComponent key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
