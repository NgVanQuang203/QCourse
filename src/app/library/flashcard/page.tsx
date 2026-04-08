"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/page.module.css';
import loadingStyles from '@/app/loading.module.css';
import libStyles from './lib.module.css';
import { useStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Plus, Upload, MoreVertical, Edit2, Trash2, BookOpen, X, RefreshCcw } from 'lucide-react';
import EditDeckModal from '@/components/EditDeckModal';
import ImportModal from '@/components/ImportModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

const PAGE_SIZE = 12;
const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
];

export default function FlashcardLibrary() {
  const router = useRouter();
  const now = Date.now();
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [resetDeckId, setResetDeckId] = useState<string | null>(null);
  const [editDeck, setEditDeck] = useState<string | null>(null); // deckId to edit, or 'new'
  const [importDeck, setImportDeck] = useState<string | null>(null); // deckId to import into

  const { decks, isLoading, deleteDeck, refreshStats } = useStore();
  const flashDecks = decks.filter(d => !d.type || d.type === 'FLASHCARD');

  const totalPages = Math.ceil(flashDecks.length / PAGE_SIZE);
  const paged = flashDecks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmDelete = async () => {
    if (deleteDeckId) {
      await deleteDeck(deleteDeckId);
      setDeleteDeckId(null);
      setMenuOpenId(null);
    }
  };

  const confirmReset = async (deckId: string) => {
    if (confirm('Làm mới toàn bộ tiến độ học tập (về 0%) của bộ bài này?')) {
      await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
      await refreshStats(); // Sync automatically via store
    }
  };

  if (isLoading) {
    return (
      <div className={loadingStyles.skeletonContainer}>
        <div className={loadingStyles.skeletonHero} />
        <div className={loadingStyles.skeletonBar} />
        <div className={loadingStyles.skeletonGrid}>
          <div className={loadingStyles.skeletonCard} />
          <div className={loadingStyles.skeletonCard} />
          <div className={loadingStyles.skeletonCard} />
        </div>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Thư Viện Flashcard</h1>
          <p className={styles.heroDesc}>
            Chọn một bộ thẻ bên dưới để bắt đầu phiên ôn luyện. Thuật toán SM-2
            sẽ thông minh sắp xếp thứ tự thẻ tối ưu nhất cho trí nhớ của bạn.
          </p>
        </div>
        <div className={styles.heroIcon}>🧠</div>
      </div>

      {/* Action bar */}
      <div className={libStyles.actionBar}>
        <span className={libStyles.deckCount}>{flashDecks.length} bộ bài</span>
        <div className={libStyles.actionGroup}>
          <button className={libStyles.btnImport} onClick={() => setImportDeck('__pick')}>
            <Upload size={15} /> Import
          </button>
          <button className={libStyles.btnCreate} onClick={() => setEditDeck('new')}>
            <Plus size={15} /> Tạo bộ bài
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {paged.map(deck => {
          const total = (deck as any)._count?.cards ?? 0;
          const dueCount = deck.dueCount ?? 0;
          const masteredCount = deck.masteredCount ?? 0;
          const masterPct = total === 0 ? 0 : Math.round((masteredCount / total) * 100);

          return (
            <div key={deck.id} className={styles.deckCard}>
              <div className={styles.headerRow}>
                <div className={styles.iconWrap} style={{ background: deck.color }}>🗂️</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {dueCount > 0 && <div className={styles.badge}>🔥 {dueCount}</div>}
                  {/* Kebab menu */}
                  <div className={libStyles.menuWrap}>
                    <button
                      className={libStyles.menuBtn}
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === deck.id ? null : deck.id); }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpenId === deck.id && (
                      <div className={libStyles.menuDropdown}>
                        <button className={libStyles.menuItem} onClick={() => { setEditDeck(deck.id); setMenuOpenId(null); }}>
                          <Edit2 size={14} /> Chỉnh sửa
                        </button>
                        <button className={libStyles.menuItem} onClick={() => { setImportDeck(deck.id); setMenuOpenId(null); }}>
                          <Upload size={14} /> Import thẻ
                        </button>
                        <button className={libStyles.menuItem} onClick={() => { confirmReset(deck.id); setMenuOpenId(null); }}>
                          <RefreshCcw size={14} /> Reset tiến độ
                        </button>
                        <button className={`${libStyles.menuItem} ${libStyles.menuDanger}`} onClick={() => { setDeleteDeckId(deck.id); setMenuOpenId(null); }}>
                          <Trash2 size={14} /> Xoá bộ bài
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.deckTitle}>{deck.name}</div>
              <div className={styles.deckDesc}>{deck.description}</div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{total}</span>
                  <span className={styles.statLabel}>thẻ</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${styles.green}`}>{masterPct}%</span>
                  <span className={styles.statLabel}>hoàn thành</span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setEditDeck(deck.id)}
                  style={{ flex: 'none', padding: '0.55rem 0.85rem' }}
                >
                  <BookOpen size={14} />
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => router.push(`/flashcard/${deck.id}`)}
                >
                  🚀 Học ngay
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modals */}
      {editDeck !== null && (
        <EditDeckModal
          mode="flashcard"
          deckId={editDeck === 'new' ? null : editDeck}
          onClose={() => setEditDeck(null)}
        />
      )}
      {importDeck !== null && (
        <ImportModal
          deckId={importDeck === '__pick' ? null : importDeck}
          allDecks={flashDecks}
          onClose={() => setImportDeck(null)}
        />
      )}
      <DeleteConfirmModal
        isOpen={!!deleteDeckId}
        deckName={flashDecks.find(d => d.id === deleteDeckId)?.name || ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDeckId(null)}
      />
    </main>
  );
}
