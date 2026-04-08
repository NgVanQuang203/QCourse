"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/page.module.css';
import libStyles from '../flashcard/lib.module.css';
import { useStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Plus, Upload, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import EditQuizModal from '@/components/EditQuizModal';
import ImportQuizModal from '@/components/ImportQuizModal';

const PAGE_SIZE = 10;

export default function QuizLibrary() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editDeck, setEditDeck] = useState<string | null>(null);
  const [importDeck, setImportDeck] = useState<string | null>(null);

  const { decks, isLoading, deleteDeck } = useStore();

  const totalPages = Math.ceil(decks.length / PAGE_SIZE);
  const paged = decks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (deckId: string) => {
    if (confirm('Xoá bộ bài này?')) { deleteDeck(deckId); setMenuOpenId(null); }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Đang chuẩn bị đề thi...</p>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Phòng Thi Trắc Nghiệm</h1>
          <p className={styles.heroDesc}>
            Chọn đề thi phù hợp và thử sức với bộ câu hỏi được thiết kế chuẩn.
            Bộ đếm thời gian thực tế và review bài sau nộp giúp bạn tiến bộ vượt bậc.
          </p>
        </div>
        <div className={styles.heroIcon}>🎯</div>
      </div>

      {/* Action bar */}
      <div className={libStyles.actionBar}>
        <span className={libStyles.deckCount}>{decks.length} đề thi</span>
        <div className={libStyles.actionGroup}>
          <button className={libStyles.btnImport} onClick={() => setImportDeck('__pick')}>
            <Upload size={15} /> Import
          </button>
          <button className={libStyles.btnCreate} onClick={() => setEditDeck('new')}>
            <Plus size={15} /> Tạo đề thi
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {paged.map(deck => {
          const total = (deck as any)._count?.cards ?? 0;
          return (
            <div key={deck.id} className={styles.deckCard}>
              <div className={styles.headerRow}>
                <div className={styles.iconWrap} style={{ background: deck.color }}>📝</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <div className={libStyles.menuWrap}>
                    <button className={libStyles.menuBtn} onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === deck.id ? null : deck.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {menuOpenId === deck.id && (
                      <div className={libStyles.menuDropdown}>
                        <button className={libStyles.menuItem} onClick={() => { setEditDeck(deck.id); setMenuOpenId(null); }}>
                          <Edit2 size={14} /> Chỉnh sửa
                        </button>
                        <button className={libStyles.menuItem} onClick={() => { setImportDeck(deck.id); setMenuOpenId(null); }}>
                          <Upload size={14} /> Import câu hỏi
                        </button>
                        <button className={`${libStyles.menuItem} ${libStyles.menuDanger}`} onClick={() => handleDelete(deck.id)}>
                          <Trash2 size={14} /> Xoá
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
                  <span className={styles.statLabel}>câu hỏi</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{(total) * (deck.timeLimitSec || 60)}s</span>
                  <span className={styles.statLabel}>thời gian</span>
                </div>
              </div>

              <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => router.push(`/quiz/${deck.id}`)}>
                  🏆 Thi ngay
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={18} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={18} /></button>
        </div>
      )}

      {editDeck !== null && (
        <EditQuizModal deckId={editDeck === 'new' ? null : editDeck} onClose={() => setEditDeck(null)} />
      )}
      {importDeck !== null && (
        <ImportQuizModal deckId={importDeck === '__pick' ? null : importDeck} allDecks={decks} onClose={() => setImportDeck(null)} />
      )}
    </main>
  );
}
