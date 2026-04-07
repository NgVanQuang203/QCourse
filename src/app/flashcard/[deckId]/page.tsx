"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockCards, mockDecks, Card } from '@/lib/mockData';
import { calculateSM2 } from '@/lib/sm2';
import styles from './flashcard.module.css';
import { BrainCircuit, ArrowLeft } from 'lucide-react';

export default function FlashcardMode() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDone, setIsDone] = useState(false);
  
  // Thống kê phiên học
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const deck = mockDecks.find(d => d.id === deckId);

  useEffect(() => {
    if (deckId) {
      const now = Date.now();
      const due = mockCards.filter(c => c.deckId === deckId && c.sm2Data.nextReviewDate <= now);
      setQueue(due);
    }
  }, [deckId]);

  if (!deck) return <div>Không tìm thấy bộ bài</div>;

  const currentCard = queue[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleEvaluate = (quality: number) => {
    const newData = calculateSM2(quality, currentCard.sm2Data);
    
    setStats(prev => ({
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      wrong: prev.wrong + (quality < 3 ? 1 : 0)
    }));

    setIsFlipped(false);
    
    setTimeout(() => {
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsDone(true);
      }
    }, 400); 
  };

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
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{Math.round((stats.correct / queue.length)*100)}%</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Nhớ tốt</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{Math.round((stats.wrong / queue.length)*100)}%</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Hay quên</div>
                </div>
              </div>
            )}

            <button 
              style={{ background: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
              onClick={() => router.push('/')}
            >
              Về thư viện
            </button>
          </div>
        ) : (
          <>
            <div className={styles.scene}>
              <div 
                className={`${styles.card} ${isFlipped ? styles.isFlipped : ''}`}
                onClick={handleFlip}
              >
                <div className={`${styles.cardFace} ${styles.cardFront}`}>
                  <div className={styles.cardQuestion}>{currentCard.front}</div>
                  {!isFlipped && (
                    <div className={styles.hint}>👆 Nhấn vào thẻ để lật xem đáp án</div>
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
                Lại (1m)
                <span className={styles.evalDesc}>Quên hẳn</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnHard}`} onClick={() => handleEvaluate(3)}>
                Khó (10m)
                <span className={styles.evalDesc}>Nghĩ lâu</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnGood}`} onClick={() => handleEvaluate(4)}>
                Tốt (1d)
                <span className={styles.evalDesc}>Nhớ rõ</span>
              </button>
              <button className={`${styles.evalBtn} ${styles.btnPerfect}`} onClick={() => handleEvaluate(5)}>
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
