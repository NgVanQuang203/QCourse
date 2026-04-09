"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card } from '@/lib/mockData';
import styles from './flashcard.module.css';
import { BrainCircuit, ArrowLeft, Keyboard } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FlashcardMode() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [swipeAnim, setSwipeAnim] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Thống kê phiên học
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const { decks, fetchDeckCards, isLoading: storeLoading, refreshStats } = useStore();
  const [loading, setLoading] = useState(true);

  const deck = decks.find(d => d.id === deckId);

  useEffect(() => {
    const load = async () => {
      if (deckId) {
        setLoading(true);
        const cards = await fetchDeckCards(deckId);
        if (cards) {
          const now = Date.now();
          const due = cards.filter(c => c.sm2Data.nextReviewDate <= now);
          setQueue(due);
        }
        setLoading(false);
      }
    };
    load();
  }, [deckId, fetchDeckCards]);

  const currentCard = queue[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleEvaluate = useCallback(async (quality: number) => {
    if (!currentCard || !isFlipped || swipeAnim) return;

    // Submit review to API
    try {
      fetch(`/api/cards/${currentCard.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality, minutesSession: 1 }),
      }).then(() => refreshStats());
    } catch (err) {
      console.error("Failed to save review:", err);
    }

    setStats(prev => ({
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      wrong: prev.wrong + (quality < 3 ? 1 : 0)
    }));

    // Determine swipe direction
    let dir: 'down'|'left'|'up'|'right' = 'up';
    if (quality === 1) dir = 'down';
    else if (quality === 3) dir = 'left';
    else if (quality === 4) dir = 'up';
    else if (quality === 5) dir = 'right';
    
    setSwipeAnim(dir);

    // If quality is poor ("học lại"), append it to the end of the queue
    if (quality < 3) {
      setQueue(prev => [...prev, currentCard]);
    }

    setTimeout(() => {
      setIsResetting(true);
      setSwipeAnim(null);
      setIsFlipped(false);
      
      setQueue(updatedQueue => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < updatedQueue.length) {
          setCurrentIndex(nextIdx);
        } else {
          setIsDone(true);
          // Trigger confetti on finish
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
          });
        }
        return updatedQueue;
      });

      // Restore transitions after DOM update
      setTimeout(() => setIsResetting(false), 50);
    }, 400); // 400ms matches the CSS transition duration
  }, [currentCard, currentIndex, isFlipped, swipeAnim, refreshStats]);

  // ── KEYBOARD SHORTCUTS ──────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Prevent when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleFlip();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (isFlipped) handleEvaluate(1); // Quên hẳn
          break;
        case 'Digit2':
        case 'Numpad2':
          if (isFlipped) handleEvaluate(3); // Khó
          break;
        case 'Digit3':
        case 'Numpad3':
          if (isFlipped) handleEvaluate(4); // Tốt
          break;
        case 'Digit4':
        case 'Numpad4':
          if (isFlipped) handleEvaluate(5); // Dễ
          break;
        case 'Escape':
          router.push('/library/flashcard');
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleFlip, handleEvaluate, isFlipped, router]);

  if (storeLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--nav-height))', gap: '1.5rem' }}>
        <div style={{ fontSize: '3rem', animation: 'bounce 1.4s ease-in-out infinite' }}>🧠</div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.5 }}>Đang tải bộ thẻ...</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        `}</style>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'grayscale(1)', opacity: 0.5 }}>📭</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Không tìm thấy bộ bài</h2>
          <p style={{ opacity: 0.5, marginBottom: '2.5rem', lineHeight: 1.5 }}>
            Bộ thẻ này không tồn tại hoặc có thể đã bị xóa. Vui lòng kiểm tra lại đường dẫn.
          </p>
          <button
            onClick={() => router.push('/library/flashcard')}
            style={{ 
              background: 'var(--primary)', color: 'white', padding: '0.85rem 1.5rem', 
              borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
            }}
          >
            <ArrowLeft size={16} /> Quay lại thư viện
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push('/library/flashcard')}
          title="Quay lại thư viện"
        >
          <ArrowLeft size={16} />
          <span className={styles.backLabel}>Quay lại</span>
        </button>

        <div className={styles.titleGroup}>
          <div className={styles.deckTitle}>{deck.name}</div>
          <div className={styles.deckSubtitle}>{deck.description}</div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressText}>
            Thẻ {isDone ? queue.length : currentIndex + 1} / {queue.length}
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${queue.length === 0 ? 100 : ((isDone ? queue.length : currentIndex) / queue.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className={styles.mainArea}>
        {isDone || queue.length === 0 ? (
          <div className={styles.completeContainer}>
            <BrainCircuit size={60} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 className={styles.completeTitle}>Tuyệt vời!</h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
              {queue.length === 0 ? 'Hiện tại không có thẻ nào đến hạn ôn tập.' : 'Bạn đã hoàn thành phiên học.'}
            </p>

            {queue.length > 0 && (
              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{Math.round((stats.correct / queue.length) * 100)}%</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Nhớ tốt</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{Math.round((stats.wrong / queue.length) * 100)}%</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Hay quên</div>
                </div>
              </div>
            )}

            <button
              style={{ background: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
              onClick={() => router.push('/library/flashcard')}
            >
              Về thư viện Flashcard
            </button>
          </div>
        ) : (
          <>
            {/* Keyboard hint bar */}
            <div className={styles.keyHintBar}>
              <button className={styles.keyHintToggle} onClick={() => setShowHints(h => !h)}>
                <Keyboard size={13} />
                Phím tắt
              </button>
              {showHints && (
                <div className={styles.keyHintList}>
                  <span className={styles.keyHint}><kbd>Space</kbd> Lật thẻ</span>
                  <span className={styles.keyHint}><kbd>1</kbd> Quên</span>
                  <span className={styles.keyHint}><kbd>2</kbd> Khó</span>
                  <span className={styles.keyHint}><kbd>3</kbd> Tốt</span>
                  <span className={styles.keyHint}><kbd>4</kbd> Dễ</span>
                  <span className={styles.keyHint}><kbd>Esc</kbd> Thoát</span>
                </div>
              )}
            </div>

            <div className={styles.scene}>
              <div
                className={`
                  ${styles.card} 
                  ${isFlipped ? styles.isFlipped : ''} 
                  ${swipeAnim ? styles[`swipe-${swipeAnim}`] : ''} 
                  ${isResetting ? styles['no-transition'] : ''}
                `}
                onClick={!swipeAnim ? handleFlip : undefined}
              >
                <div className={`${styles.cardFace} ${styles.cardFront}`}>
                  <div className={styles.cardQuestion}>{currentCard.front}</div>
                  {!isFlipped && (
                    <div className={styles.hint}>👆 Nhấn vào thẻ hoặc nhấn <kbd>Space</kbd> để lật</div>
                  )}
                </div>
                <div className={`${styles.cardFace} ${styles.cardBack}`}>
                  <div className={styles.cardAnswer}>{currentCard.back}</div>
                  <div className={styles.hint}>↩️ Nhấn để quay lại câu hỏi</div>
                </div>
              </div>
            </div>

            <div className={`${styles.controls} ${isFlipped ? styles.visible : ''}`}>
              <button className={`${styles.evalBtn} ${styles.btnFail}`} onClick={() => handleEvaluate(1)}>
                <span className={styles.evalKey}>1</span>
                Lại (1m)
                <span className={styles.evalDesc}>Quên hẳn</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnHard}`} onClick={() => handleEvaluate(3)}>
                <span className={styles.evalKey}>2</span>
                Khó (10m)
                <span className={styles.evalDesc}>Nghĩ lâu</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnGood}`} onClick={() => handleEvaluate(4)}>
                <span className={styles.evalKey}>3</span>
                Tốt (1d)
                <span className={styles.evalDesc}>Nhớ rõ</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnPerfect}`} onClick={() => handleEvaluate(5)}>
                <span className={styles.evalKey}>4</span>
                Dễ (4d)
                <span className={styles.evalDesc}>Rất dễ</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
