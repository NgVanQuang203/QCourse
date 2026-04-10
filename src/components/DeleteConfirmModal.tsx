import { AlertTriangle, Trash2, ArrowLeft, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  deckName: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ isOpen, deckName, isLoading = false, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
        >
          <motion.div
            style={{
              background: 'rgba(var(--surface-rgb), 0.75)',
              backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderTop: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '28px', padding: '2rem', width: '90%', maxWidth: '420px',
              textAlign: 'center', boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
              position: 'relative', overflow: 'hidden'
            }}
            initial={{ scale: 0.88, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Xoá mục này?
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', opacity: 0.6, marginBottom: '2rem', lineHeight: 1.5 }}>
              Bạn đang xoá <strong style={{ color: 'var(--foreground)', opacity: 1 }}>"{deckName}"</strong>. Toàn bộ dữ liệu bên trong sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={onCancel}
                disabled={isLoading}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', borderRadius: '12px', padding: '0.75rem',
                  fontWeight: 700, fontSize: '0.95rem', cursor: isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: isLoading ? 0.5 : 1, transition: 'all 0.2s ease',
                  pointerEvents: isLoading ? 'none' : 'auto',
                }}
              >
                <ArrowLeft size={16} /> Huỷ bỏ
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  background: 'var(--danger)', border: 'none',
                  color: 'white', borderRadius: '12px', padding: '0.75rem',
                  fontWeight: 700, fontSize: '0.95rem', cursor: isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: isLoading ? 0.7 : 1, transition: 'all 0.2s ease'
                }}
              >
                {isLoading ? (
                  <RefreshCcw size={16} style={{ animation: 'spin 1.2s linear infinite' }} />
                ) : (
                  <Trash2 size={16} />
                )}
                {isLoading ? 'Đang xoá...' : 'Xoá vĩnh viễn'}
              </button>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
