"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/page.module.css';
import { mockDecks, mockCards } from '@/lib/mockData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function QuizLibrary() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(mockDecks.length / PAGE_SIZE);
  const paged = mockDecks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className={styles.container}>
      {/* Hero */}
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

      {/* Grid */}
      <div className={styles.grid}>
        {paged.map(deck => {
          const cardsInDeck = mockCards.filter(c => c.deckId === deck.id);
          const total = cardsInDeck.length;

          return (
            <div key={deck.id} className={styles.deckCard}>
              <div className={styles.headerRow}>
                <div className={styles.iconWrap} style={{ background: deck.color }}>
                  📝
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
                  <span className={styles.statValue}>{total * 60}s</span>
                  <span className={styles.statLabel}>thời gian</span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => router.push(`/quiz/${deck.id}`)}
                >
                  🏆 Thi ngay
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
