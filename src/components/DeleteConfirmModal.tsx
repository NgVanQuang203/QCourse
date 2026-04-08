import { AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  deckName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ isOpen, deckName, onConfirm, onCancel }: Props) {
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
          onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem', width: '90%', maxWidth: '420px',
              textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
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
              Xoá bộ bài này?
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', opacity: 0.6, marginBottom: '2rem', lineHeight: 1.5 }}>
              Bạn đang xoá bộ bài <strong style={{ color: 'var(--foreground)', opacity: 1 }}>"{deckName}"</strong>. Toàn bộ thẻ và dữ liệu ôn tập bên trong sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={onCancel}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', borderRadius: '12px', padding: '0.75rem',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <ArrowLeft size={16} /> Huỷ bỏ
              </button>
              <button
                onClick={onConfirm}
                style={{
                  background: 'var(--danger)', border: 'none',
                  color: 'white', borderRadius: '12px', padding: '0.75rem',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <Trash2 size={16} /> Xoá vĩnh viễn
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
