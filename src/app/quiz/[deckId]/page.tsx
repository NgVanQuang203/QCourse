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
  
  const deck = decks.find(d => d.id === deckId);

  const handleBackToLibrary = () => {
    refreshStats();
    router.push('/library/quiz');
  };

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lobby States
  const [isLobby, setIsLobby] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [histLoading, setHistLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (deckId) {
        setLoading(true);
        const fetchedCards = await fetchDeckCards(deckId);
        // Shuffle the questions right away
        if (fetchedCards) setCards(shuffle([...fetchedCards]));
        setLoading(false);
      }
    };
    load();
  }, [deckId, fetchDeckCards]);

  useEffect(() => {
    if (deckId) {
      fetch(`/api/quiz/${deckId}/history`)
        .then(res => res.json())
        .then(data => {
          setHistory(data.attempts || []);
          setHighScore(data.highestScore || 0);
          setHistLoading(false);
        })
        .catch(() => setHistLoading(false));
    }
  }, [deckId]);

  const quizCards = useMemo(() => {
    if (!cards.length) return [];
    return cards.map(c => {
      if (c.options && Array.isArray(c.options) && c.options.length > 0) {
        // Shuffle explicit quiz options
        const correctText = c.options[c.correctOptionIndex];
        const finalOptions = shuffle([...c.options]);
        return { ...c, options: finalOptions, correctOptionIndex: finalOptions.indexOf(correctText) };
      }
      // Fallback for flashcard-style quiz
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
      front: c.front || '',
      options: c.options || [],
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
  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setShowResultModal(false);
    const perQuestion = (deck as any)?.timeLimitSec || 60;
    setTimeLeft(quizCards.length * perQuestion);
    setCards(shuffle([...cards]));
    setTimerStarted(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (!isSubmitted && Object.keys(answers).length > 0) {
      setShowExitConfirm(true);
    } else {
      handleBackToLibrary();
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
            onClick={handleBackToLibrary}
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
          <button className={styles.backBtn} onClick={handleBackToLibrary}>
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
                onClick={handleBackToLibrary}
              >
                <ArrowLeft size={15} /> Quay lại thư viện
              </button>
              <button
                className={styles.emptyBtnSecondary}
                onClick={handleBackToLibrary}
              >
                <BookOpen size={15} /> Thư viện trắc nghiệm
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── LOBBY STATE (START SCREEN) ──
  if (isLobby) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.quizHeader}>
          <button className={styles.backBtn} onClick={handleBackToLibrary}>
            <ArrowLeft size={16} />
            <span className={styles.backLabel}>Quay lại</span>
          </button>
        </div>
        <div className={styles.lobbyContainer}>
          <motion.div 
            className={styles.lobbyCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.lobbyIcon}>⏱️</div>
            <h1 className={styles.lobbyTitle}>{deck.name}</h1>
            {deck.description && <p className={styles.lobbyDesc}>{deck.description}</p>}
            
            <div className={styles.lobbyMetaGrid}>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Số câu hỏi</span>
                <span className={styles.lobbyMetaVal}>{quizCards.length}</span>
              </div>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Thời gian</span>
                <span className={styles.lobbyMetaVal}>{(deck as any)?.timeLimitSec ? Math.floor((deck as any).timeLimitSec / 60) + ' phút' : 'Không giới hạn'}</span>
              </div>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Kỷ lục cao nhất</span>
                <span className={styles.lobbyMetaVal} style={{ color: 'var(--primary)' }}>
                  {quizCards.length > 0 ? ((highScore / quizCards.length) * 10).toFixed(1) + ' điểm' : '0 điểm'}
                </span>
              </div>
            </div>

            <div className={styles.lobbyHistory}>
              <h3 className={styles.historyTitle}>Lịch sử 5 lần thi gần nhất</h3>
              {histLoading ? (
                <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>Đang tải lịch sử...</div>
              ) : history.length > 0 ? (
                <div className={styles.historyList}>
                  {history.slice(0, 5).map((h, i) => {
                    const dateStr = new Date(h.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={i} 
                        className={`${styles.historyItem} ${styles.historyItemClickable}`}
                        onClick={() => setSelectedAttempt(h)}
                      >
                        <div className={styles.historyItemDate}>{dateStr}</div>
                        <div className={styles.historyItemScore}>{h.score}/{h.totalQuestions}</div>
                        <div className={`${styles.historyItemGrade} ${styles['grade' + h.grade]}`}>{h.grade}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.historyEmpty}>Bạn chưa thi bài này lần nào.</div>
              )}
            </div>

            <button 
              className={styles.btnStartQuiz} 
              onClick={() => {
                setIsLobby(false);
                setTimeLeft(quizCards.length * ((deck as any)?.timeLimitSec || 60));
                setTimerStarted(true);
              }}
            >
              🚀 BẮT ĐẦU LÀM BÀI
            </button>
          </motion.div>
        </div>

        {/* ── CHI TIẾT LỊCH SỬ THI (MODAL) ── */}
        <AnimatePresence>
          {selectedAttempt && (
            <motion.div 
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAttempt(null)}
            >
              <motion.div 
                className={styles.historyDetailCard}
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.historyDetailHeader}>
                  <h2>Lịch sử chi tiết</h2>
                  <button className={styles.closeBtn} onClick={() => setSelectedAttempt(null)}><X size={20} /></button>
                </div>
                
                <div className={styles.statRow} style={{ marginTop: '0.5rem' }}>
                  <div className={styles.statBox} style={{ background: 'var(--primary-light)' }}>
                    <span className={styles.statBoxNum} style={{ color: 'var(--primary)' }}>{selectedAttempt.score}/{selectedAttempt.totalQuestions}</span>
                    <span className={styles.statBoxText} style={{ color: 'var(--primary)' }}>SỐ CÂU ĐÚNG</span>
                  </div>
                  <div className={`${styles.statBox} ${styles.correct}`}>
                    <span className={styles.statBoxNum}>{Math.round((selectedAttempt.score / selectedAttempt.totalQuestions) * 100)}%</span>
                    <span className={styles.statBoxText}>TỶ LỆ ĐÚNG</span>
                  </div>
                  <div className={styles.statBox} style={{ background: 'var(--surface-hover)' }}>
                    <span className={styles.statBoxNum} style={{ color: 'var(--foreground)' }}>{selectedAttempt.grade}</span>
                    <span className={styles.statBoxText}>XẾP LOẠI</span>
                  </div>
                </div>

                <div className={styles.historyDetailBody}>
                  {selectedAttempt.answers && selectedAttempt.answers.length > 0 ? (
                    selectedAttempt.answers.map((ans: any, idx: number) => {
                      if (!ans.front) {
                        return (
                          <div key={idx} className={styles.legacyReviewItem}>
                            <strong>Câu {idx + 1}:</strong> Dữ liệu phiên bản cũ không lưu bộ câu hỏi chi tiết. 
                            <span style={{color: ans.chosenIndex === ans.correctIndex ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                              {ans.chosenIndex === ans.correctIndex ? ' (Đúng)' : ' (Sai)'}
                            </span>
                          </div>
                        );
                      }

                      const isCorrect = ans.chosenIndex === ans.correctIndex;
                      return (
                        <div key={idx} className={`${styles.reviewCard} ${isCorrect ? styles.reviewCorrectBd : styles.reviewWrongBd}`}>
                          <div className={styles.questionHeader} style={{ marginBottom: '0.75rem' }}>
                            <span className={styles.questionBadge}>Câu {idx + 1}</span>
                            <span className={styles.questionStatus} style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                              {isCorrect ? <><CheckCircle2 size={13} /> Chính xác</> : <><XCircle size={13} /> Sai</>}
                            </span>
                          </div>
                          <p className={styles.questionText} style={{ marginBottom: '1rem', fontSize: '1rem' }}>{ans.front}</p>
                          <div className={styles.optionsList} style={{ gap: '0.4rem' }}>
                            {ans.options?.map((opt: string, oIdx: number) => {
                              const isChosen = ans.chosenIndex === oIdx;
                              const isRightOne = ans.correctIndex === oIdx;
                              let cls = styles.reviewOpt;
                              if (isRightOne) cls += ` ${styles.reviewOptCorrect}`;
                              else if (isChosen && !isRightOne) cls += ` ${styles.reviewOptWrong}`;
                              
                              return (
                                <div key={oIdx} className={cls}>
                                  <div className={styles.optionMarker} style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>{String.fromCharCode(65 + oIdx)}</div>
                                  <span style={{ fontSize: '0.9rem' }}>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.legacyReviewItem}>Không có dữ liệu câu trả lời (Có thể đã chọn bỏ qua hết).</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  onClick={handleBackToLibrary}
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
                  <button className={styles.modalBtnSecondary} onClick={handleRestart}>
                    <RotateCcw size={14} /> Thi lại
                  </button>
                  <button className={styles.modalBtnSecondary} onClick={() => setShowResultModal(false)}>
                    <RotateCcw size={14} /> Xem lại lỗi
                  </button>
                  <button className={styles.modalBtnPrimary} onClick={handleBackToLibrary}>
                    <BookOpen size={14} /> Thư viện
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
