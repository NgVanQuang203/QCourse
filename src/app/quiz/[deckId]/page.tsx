"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import styles from './quiz.module.css';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle,
  Send, Trophy, RotateCcw, Home, Check, X, Flag,
  BookOpen, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function QuizMode() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const { decks, fetchDeckCards, isLoading: storeLoading, refreshStats } = useStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const deck = decks.find(d => d.id === deckId);

  useEffect(() => {
    const load = async () => {
      if (deckId) {
        setLoading(true);
        const fetchedCards = await fetchDeckCards(deckId);
        if (fetchedCards) setCards(fetchedCards);
        setLoading(false);
      }
    };
    load();
  }, [deckId, fetchDeckCards]);

  const quizCards = useMemo(() => {
    if (!cards.length) return [];
    return cards.map(c => {
      if (c.options && Array.isArray(c.options) && c.options.length > 0) return c;
      // Fallback for cards without options (treat as flashcard-style quiz)
      const otherAnswers = cards.filter(o => o.id !== c.id).map(o => o.back);
      const optionsStr = [c.back, ...shuffle(otherAnswers).slice(0, 3)];
      const finalOptions = shuffle(optionsStr);
      return { ...c, options: finalOptions, correctOptionIndex: finalOptions.indexOf(c.back) };
    });
  }, [cards]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Initialize timer when quizCards become available
  useEffect(() => {
    if (quizCards.length > 0 && !timerStarted) {
      const perQuestion = (deck as any)?.timeLimitSec || 60;
      setTimeLeft(quizCards.length * perQuestion);
      setTimerStarted(true);
    }
  }, [quizCards, timerStarted, deck]);

  useEffect(() => {
    if (!timerStarted || isSubmitted || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timerStarted, isSubmitted, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && timerStarted && !isSubmitted) handleSubmit();
  }, [timeLeft]);

  const handleSubmit = async () => {
    const formattedAnswers = quizCards.map(c => ({
      cardId: c.id,
      chosenIndex: answers[c.id] ?? -1,
      correctIndex: c.correctOptionIndex,
      timeSec: 10, // Tạm thời giả định 10s/câu hoặc tính toán chi tiết hơn
    }));

    try {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          answers: formattedAnswers.filter(a => a.chosenIndex !== -1),
        }),
      });
      refreshStats(); // Update profile stats immediately
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }

    setIsSubmitted(true);
    setShowResultModal(true);

    // Call confetti for passing visual feedback
    const { pct } = calculateScore();
    if (pct >= 50) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
        });
      }, 300);
    }
  };

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedIdx(idx);
      setTimeout(() => setHighlightedIdx(null), 1000);
    }
  };

  // Back button: confirm exit if quiz is in progress
  const handleBack = () => {
    if (!isSubmitted && Object.keys(answers).length > 0) {
      setShowExitConfirm(true);
    } else {
      router.push('/library/quiz');
    }
  };

  if (storeLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--nav-height))', gap: '1.5rem' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1.5s ease-in-out infinite' }}>🎯</div>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.5 }}>Đang tải đề thi...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={styles.pageWrapper} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'grayscale(1)', opacity: 0.5 }}>📭</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Không tìm thấy đề thi</h2>
          <p style={{ opacity: 0.5, marginBottom: '2.5rem', lineHeight: 1.5 }}>
            Đề thi trắc nghiệm này không tồn tại hoặc có thể đã bị xóa. Vui lòng kiểm tra lại đường dẫn.
          </p>
          <button
            onClick={() => router.push('/library/quiz')}
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

  // ── BEAUTIFUL EMPTY STATE ──
  if (quizCards.length === 0) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.quizHeader}>
          <button className={styles.backBtn} onClick={() => router.push('/library/quiz')}>
            <ArrowLeft size={16} />
            <span className={styles.backLabel}>Quay lại</span>
          </button>
          <div className={styles.quizHeaderCenter}>
            <div className={styles.quizHeaderTitle}>{deck.name}</div>
          </div>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyOrb} />
          <motion.div
            className={styles.emptyContent}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.emptyIconWrap}>
              <BookOpen size={40} strokeWidth={1.5} />
            </div>
            <h2 className={styles.emptyTitle}>Bộ bài chưa có câu hỏi</h2>
            <p className={styles.emptyDesc}>
              Bộ bài <strong>"{deck.name}"</strong> hiện chưa có thẻ nào được thêm vào.
              Hãy thêm thẻ vào bộ bài để bắt đầu làm trắc nghiệm.
            </p>
            <div className={styles.emptyActions}>
              <button
                className={styles.emptyBtnPrimary}
                onClick={() => router.push('/library/quiz')}
              >
                <ArrowLeft size={15} /> Quay lại thư viện
              </button>
              <button
                className={styles.emptyBtnSecondary}
                onClick={() => router.push('/library/quiz')}
              >
                <BookOpen size={15} /> Thư viện trắc nghiệm
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSelectOption = (cardId: string, optIdx: number, questionIdx: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [cardId]: optIdx }));
    if (questionIdx < quizCards.length - 1) {
      setTimeout(() => scrollToQuestion(questionIdx + 1), 500);
    }
  };

  const calculateScore = () => {
    const correct = quizCards.filter(c => answers[c.id] === c.correctOptionIndex).length;
    return {
      correct,
      wrong: quizCards.length - correct,
      total: quizCards.length,
      point10: ((correct / quizCards.length) * 10).toFixed(1),
      pct: Math.round((correct / quizCards.length) * 100),
    };
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = quizCards.length > 0 ? Math.round((answeredCount / quizCards.length) * 100) : 0;
  const isWarning = timeLeft <= 60 && !isSubmitted;

  return (
    <div className={styles.pageWrapper}>
      {/* ── TOP HEADER BAR ── */}
      <div className={styles.quizHeader}>
        <button className={styles.backBtn} onClick={handleBack}>
          <ArrowLeft size={16} />
          <span className={styles.backLabel}>Quay lại</span>
        </button>

        <div className={styles.quizHeaderCenter}>
          <div className={styles.quizHeaderTitle}>{deck.name}</div>
          <div className={styles.quizHeaderSub}>
            {answeredCount}/{quizCards.length} câu đã trả lời · {progressPct}%
          </div>
        </div>

        <div className={`${styles.timerChip} ${isWarning ? styles.timerWarning : ''}`}>
          <Clock size={16} />
          {isSubmitted ? '✅' : formatTime(timeLeft)}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className={styles.container}>
        {/* Left: scrollable questions */}
        <main className={styles.mainContent}>
          <div className={styles.quizArea}>
            {quizCards.map((card, idx) => {
              const isAnswered = answers[card.id] !== undefined;
              return (
                <div
                  key={card.id}
                  id={`q-${idx}`}
                  className={`${styles.questionCard} ${highlightedIdx === idx ? styles.questionCardHighlight : ''}`}
                >
                  <div className={styles.questionHeader}>
                    <span className={styles.questionBadge}>Câu {idx + 1}</span>
                    {isAnswered && !isSubmitted && (
                      <span className={styles.questionStatus} style={{ color: 'var(--success)' }}>
                        <CheckCircle2 size={13} /> Đã trả lời
                      </span>
                    )}
                    {!isAnswered && !isSubmitted && (
                      <span className={styles.questionStatus} style={{ opacity: 0.4 }}>
                        Chưa trả lời
                      </span>
                    )}
                    {isSubmitted && (
                      <span
                        className={styles.questionStatus}
                        style={{ color: answers[card.id] === card.correctOptionIndex ? 'var(--success)' : 'var(--danger)' }}
                      >
                        {answers[card.id] === card.correctOptionIndex
                          ? <><CheckCircle2 size={13} /> Đúng</>
                          : <><XCircle size={13} /> Sai</>
                        }
                      </span>
                    )}
                  </div>

                  <p className={styles.questionText}>{card.front}</p>

                  <div className={styles.optionsList}>
                    {card.options?.map((opt: string, optIdx: number) => {
                      const isSelected = answers[card.id] === optIdx;
                      const isCorrect = card.correctOptionIndex === optIdx;
                      let cls = styles.optionBtn;
                      if (isSelected) cls += ` ${styles.selected}`;
                      if (isSubmitted && isCorrect) cls += ` ${styles.correctOption}`;
                      else if (isSubmitted && isSelected && !isCorrect) cls += ` ${styles.wrongOption}`;

                      return (
                        <button
                          key={optIdx}
                          className={cls}
                          onClick={() => handleSelectOption(card.id, optIdx, idx)}
                          disabled={isSubmitted}
                        >
                          <div className={styles.optionMarker}>{String.fromCharCode(65 + optIdx)}</div>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isSubmitted && (
                    <div className={`${styles.reviewFeedback} ${answers[card.id] === card.correctOptionIndex ? styles.isCorrect : styles.isIncorrect}`}>
                      {answers[card.id] === card.correctOptionIndex
                        ? <><Check size={16} /> Chính xác! Bạn đã trả lời đúng.</>
                        : <><X size={16} /> Đáp án đúng là: <strong>{String.fromCharCode(65 + (card.correctOptionIndex ?? 0))}. {card.options?.[card.correctOptionIndex ?? 0]}</strong></>
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className={styles.navPanel}>
          {/* Progress strip */}
          <div className={styles.panelProgress}>
            <div className={styles.panelProgressFill} style={{ width: `${progressPct}%` }} />
          </div>

          <div className={styles.panelBody}>
            {/* Stats */}
            <div className={styles.panelStat}>
              <span>Tiến độ</span>
              <span className={styles.panelStatVal}>{answeredCount}/{quizCards.length}</span>
            </div>

            <div>
              <div className={styles.gridTitle}>Bảng điều hướng</div>
              <div className={styles.grid}>
                {quizCards.map((c, i) => {
                  let cls = styles.navBtn;
                  if (answers[c.id] !== undefined && !isSubmitted) cls += ` ${styles.answered}`;
                  if (isSubmitted) {
                    cls += answers[c.id] === c.correctOptionIndex ? ` ${styles.reviewCorrect}` : ` ${styles.reviewIncorrect}`;
                  }
                  return (
                    <motion.button
                      key={c.id}
                      className={cls}
                      onClick={() => scrollToQuestion(i)}
                      whileTap={{ scale: 0.82 }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      {i + 1}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.panelFooter}>
            {!isSubmitted ? (
              <button className={styles.submitBtn} onClick={handleSubmit}>
                <Flag size={15} /> Nộp bài thi
              </button>
            ) : (
              <button className={styles.submitBtn} onClick={() => setShowResultModal(true)}>
                <Trophy size={15} /> Xem lại điểm
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ── EXIT CONFIRM MODAL ── */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowExitConfirm(false); }}
          >
            <motion.div
              className={styles.confirmCard}
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <div className={styles.confirmIcon}>
                <AlertTriangle size={28} />
              </div>
              <h3 className={styles.confirmTitle}>Bạn muốn thoát bài thi?</h3>
              <p className={styles.confirmDesc}>
                Tiến độ làm bài sẽ bị mất. Bạn đã trả lời <strong>{answeredCount}/{quizCards.length}</strong> câu hỏi.
              </p>
              <div className={styles.confirmBtns}>
                <button
                  className={styles.confirmBtnCancel}
                  onClick={() => setShowExitConfirm(false)}
                >
                  Tiếp tục làm bài
                </button>
                <button
                  className={styles.confirmBtnExit}
                  onClick={() => router.push('/library/quiz')}
                >
                  <ArrowLeft size={14} /> Thoát bài thi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESULT MODAL ── */}
      <AnimatePresence>
        {showResultModal && (() => {
          const score = calculateScore();
          const scoreColor = score.pct >= 80 ? 'var(--success)' : score.pct >= 50 ? 'var(--warning)' : 'var(--danger)';
          const scoreBg = score.pct >= 80 ? 'rgba(63,185,80,0.1)' : score.pct >= 50 ? 'rgba(210,153,34,0.1)' : 'rgba(248,81,73,0.1)';
          const scoreEmoji = score.pct >= 80 ? '🏆' : score.pct >= 50 ? '📊' : '📚';

          return (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setShowResultModal(false); }}
            >
              <motion.div
                className={styles.resultCard}
                initial={{ scale: 0.88, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{scoreEmoji}</div>
                <h2 style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Kết quả bài thi</h2>
                <p style={{ opacity: 0.45, fontSize: '0.82rem', marginBottom: '1.5rem' }}>{deck.name}</p>

                <div className={styles.scoreCircle} style={{ background: scoreBg, borderColor: scoreColor }}>
                  <div className={styles.scoreNumber} style={{ color: scoreColor }}>{score.point10}</div>
                  <div className={styles.scoreDenom}>/ 10 điểm</div>
                </div>

                <div className={styles.statRow}>
                  <div className={`${styles.statBox} ${styles.correct}`}>
                    <div className={styles.statBoxNum}>{score.correct}</div>
                    <div className={styles.statBoxText}>✅ Đúng</div>
                  </div>
                  <div className={`${styles.statBox} ${styles.wrong}`}>
                    <div className={styles.statBoxNum}>{score.wrong}</div>
                    <div className={styles.statBoxText}>❌ Sai</div>
                  </div>
                  <div className={styles.statBox} style={{ background: 'var(--surface-hover)' }}>
                    <div className={styles.statBoxNum} style={{ color: scoreColor }}>{score.pct}%</div>
                    <div className={styles.statBoxText}>📈 Tỉ lệ</div>
                  </div>
                </div>

                <div className={styles.modalBtns}>
                  <button className={styles.modalBtnSecondary} onClick={() => setShowResultModal(false)}>
                    <RotateCcw size={14} /> Xem lại lỗi
                  </button>
                  <button className={styles.modalBtnPrimary} onClick={() => router.push('/library/quiz')}>
                    <BookOpen size={14} /> Về thư viện
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
