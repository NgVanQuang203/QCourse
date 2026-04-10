"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Trash2, ArrowLeft, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen, title, message, confirmLabel = 'Xác nhận',
  variant = 'danger', isLoading = false, onConfirm, onCancel
}: Props) {
  const isDanger = variant === 'danger';
  const color = isDanger ? 'var(--danger)' : 'var(--warning)';
  const Icon = isDanger ? Trash2 : RefreshCcw;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(9,9,11,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
        >
          <motion.div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '420px',
              textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            {/* Close */}
            {!isLoading && (
              <button
                onClick={onCancel}
                style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  opacity: 0.4, color: 'var(--foreground)', padding: '0.25rem',
                }}
              >
                <X size={18} />
              </button>
            )}

            {/* Icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <AlertTriangle size={30} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '2rem', lineHeight: 1.6 }}>
              {message}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={onCancel}
                disabled={isLoading}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', borderRadius: '12px', padding: '0.8rem',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto',
                }}
              >
                <ArrowLeft size={15} /> Huỷ bỏ
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  background: color, border: 'none',
                  color: 'white', borderRadius: '12px', padding: '0.8rem',
                  fontWeight: 700, fontSize: '0.9rem', cursor: isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <RefreshCcw size={15} style={{ animation: 'spin 1.2s linear infinite' }} />
                ) : (
                  <Icon size={15} />
                )}
                {isLoading ? 'Đang xử lý...' : confirmLabel}
              </button>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
