"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/page.module.css';
import { mockDecks, mockCards } from '@/lib/mockData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function FlashcardLibrary() {
  const router = useRouter();
  const now = Date.now();
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(mockDecks.length / PAGE_SIZE);
  const paged = mockDecks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Grid */}
      <div className={styles.grid}>
        {paged.map(deck => {
          const cardsInDeck = mockCards.filter(c => c.deckId === deck.id);
          const total = cardsInDeck.length;
          const dueCount = cardsInDeck.filter(c => c.sm2Data.nextReviewDate <= now).length;
          const mastered = cardsInDeck.filter(c => c.sm2Data.repetitions >= 2).length;
          const masterPct = total === 0 ? 0 : Math.round((mastered / total) * 100);

          return (
            <div key={deck.id} className={styles.deckCard}>
              <div className={styles.headerRow}>
                <div className={styles.iconWrap} style={{ background: deck.color }}>
                  🗂️
                </div>
                {dueCount > 0 && (
                  <div className={styles.badge}>🔥 {dueCount} cần ôn</div>
                )}
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
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <span className={styles.pageInfo}>
            {page} / {totalPages}
          </span>

          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </main>
  );
}
