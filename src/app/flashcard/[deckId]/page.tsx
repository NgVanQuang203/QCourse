"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card } from '@/lib/mockData';
import styles from './flashcard.module.css';
import { BrainCircuit, ArrowLeft, Keyboard, Edit2, Trash2, Copy, SkipForward, FolderInput, Plus, MoreHorizontal } from 'lucide-react';
import confetti from 'canvas-confetti';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';
import { AnimatePresence } from 'framer-motion';
import EditDeckModal from '@/components/EditDeckModal';
import { predictFSRS, formatInterval, Rating, State } from '@/lib/algorithms/fsrs';
import { toast } from '@/lib/toast';

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
  const [initialQueueLength, setInitialQueueLength] = useState(0);
  const [cardsFinished, setCardsFinished] = useState(0);

  // Thống kê phiên học
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [editCardMode, setEditCardMode] = useState(false);

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
          setInitialQueueLength(due.length);
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

  // Calculate FSRS predictions for the current card
  const predictions = currentCard?.sm2Data ? predictFSRS({
    stability: currentCard.sm2Data.stability || 0,
    difficulty: currentCard.sm2Data.difficulty || 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: currentCard.sm2Data.reps || currentCard.sm2Data.repetitions || 0,
    lapses: currentCard.sm2Data.lapses || 0,
    state: (currentCard.sm2Data.state as State) || (currentCard.sm2Data.repetitions > 0 ? State.Review : State.New),
    lastReview: currentCard.sm2Data.nextReviewDate ? new Date(currentCard.sm2Data.nextReviewDate - (currentCard.sm2Data.interval || 0) * 24 * 60 * 60 * 1000) : undefined,
    nextDueDate: new Date(currentCard.sm2Data.nextReviewDate),
  }) : null;

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
    if (quality === Rating.Again) {
      setQueue(prev => [...prev, currentCard]);
    } else {
      setCardsFinished(prev => prev + 1);
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
          if (isFlipped) handleEvaluate(Rating.Again); // Quên hẳn
          break;
        case 'Digit2':
        case 'Numpad2':
          if (isFlipped) handleEvaluate(Rating.Hard); // Khó
          break;
        case 'Digit3':
        case 'Numpad3':
          if (isFlipped) handleEvaluate(Rating.Good); // Tốt
          break;
        case 'Digit4':
        case 'Numpad4':
          if (isFlipped) handleEvaluate(Rating.Easy); // Dễ
          break;
        case 'Escape':
          const backPath = deck?.folderId ? `/library/flashcard?folder=${deck.folderId}` : '/library/flashcard';
          router.push(backPath);
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

  const onCardContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentCard) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Chỉnh sửa thẻ', icon: <Edit2 size={14}/>, onClick: () => setEditCardMode(true) },
        { label: 'Sao chép mặt trước', icon: <Copy size={14}/>, onClick: () => { navigator.clipboard.writeText(currentCard.front); toast.success('Đã sao chép'); } },
        { label: 'Bỏ qua thẻ này', icon: <SkipForward size={14}/>, onClick: () => { handleEvaluate(4); } }, // Skip as "Good" or add a dedicated skip logic
        { divider: true, label: '', onClick: () => {} },
        { label: 'Thoát học tập', icon: <ArrowLeft size={14}/>, variant: 'danger', onClick: () => router.push(deck?.folderId ? `/library/flashcard?folder=${deck.folderId}` : '/library/flashcard') },
      ]
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(deck?.folderId ? `/library/flashcard?folder=${deck.folderId}` : '/library/flashcard')}
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
            Thẻ {Math.min(initialQueueLength, cardsFinished + 1)} / {initialQueueLength}
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ 
                width: `${initialQueueLength === 0 ? 100 : Math.min(100, (cardsFinished / initialQueueLength) * 100)}%` 
              }}
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
              onClick={() => router.push(deck?.folderId ? `/library/flashcard?folder=${deck.folderId}` : '/library/flashcard')}
            >
              Về vị trí bộ thẻ
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
                onContextMenu={onCardContextMenu}
              >
                <div className={`${styles.cardFace} ${styles.cardFront}`}>
                  <div className={styles.cardQuestion}>{currentCard.front}</div>
                  {!isFlipped && (
                    <div className={styles.hint}>👆 Nhấn vào thẻ hoặc <kbd>Space</kbd> / <kbd>Chuột phải</kbd></div>
                  )}
                </div>
                <div className={`${styles.cardFace} ${styles.cardBack}`}>
                  <div className={styles.cardAnswer}>{currentCard.back}</div>
                  <div className={styles.hint}>↩️ Nhấn để quay lại câu hỏi</div>
                </div>
              </div>
            </div>

            <div className={`${styles.controls} ${isFlipped ? styles.visible : ''}`}>
              <button 
                className={`${styles.evalBtn} ${styles.btnFail}`} 
                onClick={() => handleEvaluate(Rating.Again)}
                title="Học lại: Thẻ sẽ xuất hiện lại ngay lập tức"
              >
                <span className={styles.evalKey}>1</span>
                Lại ({predictions ? formatInterval(predictions.again.scheduledDays) : '1m'})
                <span className={styles.evalDesc}>Quên hẳn</span>
              </button>
              <button 
                className={`${styles.evalBtn} ${styles.btnHard}`} 
                onClick={() => handleEvaluate(Rating.Hard)}
                title="Khó: Bạn mất nhiều thời gian để nhớ ra"
              >
                <span className={styles.evalKey}>2</span>
                Khó ({predictions ? formatInterval(predictions.hard.scheduledDays) : '10m'})
                <span className={styles.evalDesc}>Nghĩ lâu</span>
              </button>
              <button 
                className={`${styles.evalBtn} ${styles.btnGood}`} 
                onClick={() => handleEvaluate(Rating.Good)}
                title="Tốt: Bạn nhớ rõ nhưng cần ôn lại sớm"
              >
                <span className={styles.evalKey}>3</span>
                Tốt ({predictions ? formatInterval(predictions.good.scheduledDays) : '1d'})
                <span className={styles.evalDesc}>Nhớ rõ</span>
              </button>
              <button 
                className={`${styles.evalBtn} ${styles.btnPerfect}`} 
                onClick={() => handleEvaluate(Rating.Easy)}
                title="Dễ: Rất dễ dàng, thẻ sẽ lặp lại sau vài ngày"
              >
                <span className={styles.evalKey}>4</span>
                Dễ ({predictions ? formatInterval(predictions.easy.scheduledDays) : '4d'})
                <span className={styles.evalDesc}>Rất dễ</span>
              </button>
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {editCardMode && (
        <EditDeckModal
          deckId={deckId}
          mode="flashcard"
          onClose={() => {
            setEditCardMode(false);
            // Refresh cards if they were edited
            fetchDeckCards(deckId).then(cards => {
               if (cards) {
                 const now = Date.now();
                 // We don't want to shuffle the whole queue, just update the current card if needed
                 setQueue(prev => {
                   const updated = [...prev];
                   const fresh = cards.find(c => c.id === currentCard?.id);
                   if (fresh) updated[currentIndex] = fresh;
                   return updated;
                 });
               }
            });
          }}
        />
      )}
    </div>
  );
}
