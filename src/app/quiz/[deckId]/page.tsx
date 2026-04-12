"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import styles from './quiz.module.css';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle,
  Send, Trophy, RotateCcw, Home, Check, X, Flag,
  BookOpen, AlertTriangle, Loader2, Play, History,
  RotateCw, Menu, Layout
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
  const [quizCards, setQuizCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const generateQuizCards = useCallback((rawCards: any[]) => {
    if (!rawCards.length) return [];
    const shuffledQuestions = shuffle([...rawCards]);
    return shuffledQuestions.map(c => {
      if (c.options && Array.isArray(c.options) && c.options.length > 0) {
        const correctText = c.options[c.correctOptionIndex];
        const finalOptions = shuffle([...c.options]);
        return { ...c, options: finalOptions, correctOptionIndex: finalOptions.indexOf(correctText) };
      }
      const otherAnswers = rawCards.filter(o => o.id !== c.id).map(o => o.back);
      const optionsStr = [c.back, ...shuffle(otherAnswers).slice(0, 3)];
      const finalOptions = shuffle(optionsStr);
      return { ...c, options: finalOptions, correctOptionIndex: finalOptions.indexOf(c.back) };
    });
  }, []);

  const [isLobby, setIsLobby] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [histLoading, setHistLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [showHistoryList, setShowHistoryList] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (deckId) {
        setLoading(true);
        const fetchedCards = await fetchDeckCards(deckId);
        if (fetchedCards) {
          setCards(fetchedCards);
          setQuizCards(generateQuizCards(fetchedCards));
        }
        setLoading(false);
      }
    };
    load();
  }, [deckId, fetchDeckCards, generateQuizCards]);

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

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    if (quizCards.length > 0 && !timerStarted) {
      const totalSec = (deck as any)?.timeLimitSec || 600;
      setTimeLeft(totalSec);
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
    setIsSubmitting(true);
    const formattedAnswers = quizCards.map(c => ({
      cardId: c.id,
      front: c.front || '',
      options: c.options || [],
      chosenIndex: answers[c.id] ?? -1,
      correctIndex: c.correctOptionIndex,
      timeSec: 10,
    }));

    try {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          answers: formattedAnswers,
        }),
      });
      refreshStats();
      setIsSubmitted(true);
      setShowResultModal(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
      });
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedIdx(idx);
      setActiveQuestionIdx(idx);
      setTimeout(() => setHighlightedIdx(null), 1000);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setShowResultModal(false);
    const totalSec = (deck as any)?.timeLimitSec || 600;
    const newQuiz = generateQuizCards(cards);
    setQuizCards(newQuiz);
    setTimeLeft(totalSec);
    setTimerStarted(true);
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
      <div className={styles.lobbyContainer} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--quiz-bg)', zIndex: 10 }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'grayscale(1)', opacity: 0.5 }}>📭</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Không tìm thấy đề thi</h2>
          <p style={{ opacity: 0.5, marginBottom: '2.5rem', lineHeight: 1.5 }}>Đề thi trắc nghiệm này không tồn tại hoặc có thể đã bị xóa.</p>
          <button onClick={handleBackToLibrary} style={{ background: 'var(--primary)', color: 'white', padding: '0.85rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
            <ArrowLeft size={16} /> Quay lại thư viện
          </button>
        </div>
      </div>
    );
  }

  if (quizCards.length === 0) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.quizHeader}>
          <button className={styles.backBtn} onClick={handleBackToLibrary}><ArrowLeft size={16} /><span>Quay lại</span></button>
          <div className={styles.quizHeaderCenter}><div className={styles.quizHeaderTitle}>{deck.name}</div></div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyOrb} />
          <motion.div className={styles.emptyContent} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className={styles.emptyIconWrap}><BookOpen size={40} /></div>
            <h2 className={styles.emptyTitle}>Bộ bài chưa có câu hỏi</h2>
            <p className={styles.emptyDesc}>Bộ bài hiện chưa có thẻ nào được thêm vào.</p>
            <button className={styles.emptyBtnPrimary} onClick={handleBackToLibrary}><ArrowLeft size={15} /> Quay lại thư viện</button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLobby) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.lobbyContainer}>
          <motion.div className={styles.lobbyCard} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={styles.lobbyIcon}>🎯</div>
            <h1 className={styles.lobbyTitle}>{deck.name}</h1>
            <div className={styles.lobbyMetaGrid}>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Số câu hỏi</span>
                <span className={styles.lobbyMetaVal}>{quizCards.length}</span>
              </div>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Thời gian</span>
                <span className={styles.lobbyMetaVal}>
                  {(deck as any)?.timeLimitSec 
                    ? Math.floor((deck as any).timeLimitSec / 60) + ' phút' 
                    : 'Không giới hạn'}
                </span>
              </div>
              <div className={styles.lobbyMetaItem}>
                <span className={styles.lobbyMetaLabel}>Kỷ lục</span>
                <span className={styles.lobbyMetaValHighlight}>
                  {((highScore / quizCards.length) * 10).toFixed(1)} điểm
                </span>
              </div>
            </div>
            <div className={styles.lobbyButtons}>
              <button className={styles.btnHistoryTrigger} onClick={() => setShowHistoryList(true)}>
                <History size={18} /> Lịch sử thi
              </button>
              <button className={styles.btnStartQuiz} onClick={() => { setIsLobby(false); setTimerStarted(true); }}>
                <Play size={18} fill="currentColor" /> BẮT ĐẦU
              </button>
            </div>
          </motion.div>
        </div>
        <AnimatePresence>
          {showHistoryList && (
            <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistoryList(false)}>
              <motion.div className={styles.historyListCard} initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 20 }} onClick={e => e.stopPropagation()}>
                <div className={styles.historyDetailHeader}>
                  <h2 className={styles.resultTitle}>Lịch sử gần đây</h2>
                  <button className={styles.modalCloseBtn} onClick={() => setShowHistoryList(false)}>
                    <X size={24} />
                  </button>
                </div>
                  {histLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className={styles.spinner} /></div>
                  ) : history.length > 0 ? (
                    <div className={styles.historyListBody}>
                      {history.slice(0, 5).map((h, i) => {
                        const dateObj = new Date(h.createdAt);
                        const dateStr = dateObj.toLocaleDateString('vi-VN');
                        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const durationStr = h.durationSec ? `${Math.floor(h.durationSec / 60)}p ${h.durationSec % 60}s` : '--';
                        
                        return (
                          <button key={i} className={styles.historyItemPopup} onClick={() => setSelectedAttempt(h)}>
                            <div className={styles.histItemLeft}>
                              <div className={styles.histItemDate}><Clock size={14} /> {dateStr} - {timeStr}</div>
                              <div className={styles.histItemTime}><Play size={10} fill="currentColor" /> {durationStr} • {deck.name}</div>
                            </div>
                            <div className={styles.histItemRight}>
                              <div className={styles.histItemScore}>{h.score}/{h.totalQuestions}</div>
                              <div className={`${styles.histItemGrade} ${h.grade === 'A' ? styles.gradeA : (h.grade === 'F' ? styles.gradeF : '')}`} 
                                   style={{ background: h.grade === 'A' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: h.grade === 'A' ? 'var(--qz-success)' : 'var(--qz-danger)' }}>
                                {h.grade}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Chưa có dữ liệu bài thi.</div>
                  )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {selectedAttempt && (() => {
            const grade = selectedAttempt.grade;
            const tierColor = (grade === 'A' || grade === 'B') ? '#10b981' : (grade === 'C' || grade === 'D') ? '#f59e0b' : '#ef4444';
            
            return (
              <motion.div 
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAttempt(null)}
              >
                <motion.div 
                  className={styles.historyDetailCard}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className={styles.historyDetailHeader}>
                    <h2 className={styles.resultTitle}>Chi tiết kết quả</h2>
                    <button className={styles.modalCloseBtn} onClick={() => setSelectedAttempt(null)}>
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className={styles.statRow}>
                    <div className={styles.statBox} style={{ borderColor: `${tierColor}44` }}>
                      <span className={styles.statBoxNum} style={{ color: tierColor }}>{selectedAttempt.score}/{selectedAttempt.totalQuestions}</span>
                      <span className={styles.statBoxText}>SỐ CÂU ĐÚNG</span>
                    </div>
                    <div className={styles.statBox} style={{ borderColor: `${tierColor}44` }}>
                      <span className={styles.statBoxNum} style={{ color: tierColor }}>{Math.round((selectedAttempt.score / selectedAttempt.totalQuestions) * 100)}%</span>
                      <span className={styles.statBoxText}>TỶ LỆ ĐÚNG</span>
                    </div>
                    <div className={styles.statBox} style={{ borderColor: tierColor }}>
                      <span className={styles.statBoxNum} style={{ color: tierColor }}>{selectedAttempt.grade}</span>
                      <span className={styles.statBoxText}>XẾP LOẠI</span>
                    </div>
                  </div>

                  <div className={styles.historyDetailBody}>
                    {selectedAttempt.answers && selectedAttempt.answers.length > 0 ? (
                      selectedAttempt.answers.map((ans: any, idx: number) => {
                        const isCorrect = ans.chosenIndex === ans.correctIndex;
                        return (
                          <div key={idx} className={`${styles.reviewCard} ${isCorrect ? styles.reviewCorrectBd : styles.reviewWrongBd}`}>
                            <div className={styles.questionHeader} style={{ marginBottom: '1rem' }}>
                              <span className={styles.questionBadge} style={{ fontSize: '0.65rem' }}>Câu {idx + 1}</span>
                              <div className={styles.questionStatus} style={{ color: isCorrect ? 'var(--qz-success)' : 'var(--qz-danger)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isCorrect ? <Check size={14} /> : <X size={14} />}
                                {isCorrect ? 'CHÍNH XÁC' : 'CHƯA ĐÚNG'}
                              </div>
                            </div>
                            <p className={styles.reviewQuestionText}>{ans.front}</p>
                            <div className={styles.optionsList} style={{ gap: '0.35rem' }}>
                              {ans.options?.map((opt: string, oIdx: number) => {
                                const isChosen = ans.chosenIndex === oIdx;
                                const isRightOne = ans.correctIndex === oIdx;
                                return (
                                  <div 
                                    key={oIdx} 
                                    className={`${styles.reviewOpt} ${isRightOne ? styles.isCorrect : (isChosen ? styles.isIncorrect : '')}`}
                                  >
                                    <div className={styles.optionMarker} style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>{String.fromCharCode(65 + oIdx)}</div>
                                    <span>{opt}</span>
                                    {isRightOne && <Check size={14} className={styles.statusIcon} />}
                                    {isChosen && !isRightOne && <X size={14} className={styles.statusIcon} />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Không có dữ liệu chi tiết cho lần thi này.</div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    );
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSelectOption = (cardId: string, optIdx: number, questionIdx: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [cardId]: optIdx }));
    if (questionIdx < quizCards.length - 1) setTimeout(() => scrollToQuestion(questionIdx + 1), 500);
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

  const sidebarContent = (
    <>
       <div className={styles.panelBody}>
          {/* Progress Card */}
          <div className={styles.statCard}>
            <div className={styles.progressWideWrapper}>
              <div className={styles.progressHeader}>
                <div className={styles.statTitle}>TIẾN ĐỘ</div>
                <span className={styles.progressValue}>{progressPct}%</span>
              </div>
              <div className={styles.progressBarTrack}>
                <motion.div 
                  className={styles.progressBarFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statMain}>{answeredCount} / {quizCards.length} CÂU</div>
            </div>
          </div>

          {/* Question Map */}
          <div className={styles.gridSection}>
            <div className={styles.gridHeader}>
              <div className={styles.gridTitle}>Bản đồ câu hỏi</div>
              <div className={styles.gridCount}>{answeredCount}/{quizCards.length}</div>
            </div>
            
            <div className={styles.gridLegend}>
               <div className={styles.legendItem}><div className={styles.legendDot} /> <span>Chưa làm</span></div>
               <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles.answered}`} /> <span>Đã chọn</span></div>
               {isSubmitted && (
                 <>
                   <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles.correct}`} /> <span>Đúng</span></div>
                   <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles.wrong}`} /> <span>Sai</span></div>
                 </>
               )}
            </div>

            <div className={styles.grid}>
              {quizCards.map((c, i) => {
                const isChosen = answers[c.id] !== undefined;
                const isActive = activeQuestionIdx === i;
                const isCorrect = answers[c.id] === c.correctOptionIndex;
                
                let btnClass = styles.navBtn;
                if (isActive) btnClass += ` ${styles.active}`;
                
                if (isSubmitted) {
                  if (isCorrect) btnClass += ` ${styles.resultCorrect}`;
                  else btnClass += ` ${styles.resultWrong}`;
                } else if (isChosen) {
                  btnClass += ` ${styles.answered}`;
                }

                return (
                  <button 
                    key={c.id} 
                    className={btnClass} 
                    onClick={() => {
                      scrollToQuestion(i);
                      setShowMobileNav(false);
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
       </div>

       <div className={styles.panelFooter}>
            {!isSubmitted ? (
              <button 
                className={`${styles.submitBtn} ${progressPct === 100 ? styles.btnPulse : ''}`} 
                onClick={() => {
                  handleSubmit();
                  setShowMobileNav(false);
                }} 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className={styles.spinner} /> : (
                  <>
                    <Send size={18} />
                    <span>Nộp bài thi</span>
                  </>
                )}
              </button>
            ) : (
              <button className={styles.submitBtn} onClick={() => {
                setShowResultModal(true);
                setShowMobileNav(false);
              }}>
                <Trophy size={18} />
                <span>Xem kết quả</span>
              </button>
            )}
       </div>
    </>
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}><ArrowLeft size={20} /><span>Thoát</span></button>
        </div>
        <div className={styles.headerCenter}>
          <div className={styles.quizHeaderTitle}>{deck.name}</div>
          <div className={styles.quizHeaderSub}>{answeredCount} / {quizCards.length} CÂU</div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.timerChip} ${isWarning ? styles.timerWarning : ''}`}>
            <Clock size={20} />
            <span>{isSubmitted ? 'X' : formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className={styles.progressContainer}><div className={styles.progressTrack} style={{ width: `${progressPct}%` }} /></div>
      </div>

      <div className={styles.container}>
        <main className={styles.mainContent}>
          <div className={styles.quizArea}>
            {quizCards.map((card, idx) => {
              const isChosen = answers[card.id] !== undefined;
              const isCorrect = answers[card.id] === card.correctOptionIndex;
              
              let cardCls = styles.questionCard;
              if (highlightedIdx === idx) cardCls += ` ${styles.questionCardHighlight}`;
              if (isSubmitted) {
                cardCls += isCorrect ? ` ${styles.resultCorrectCard}` : ` ${styles.resultWrongCard}`;
              }

              return (
                <motion.div key={card.id} id={`q-${idx}`} className={cardCls}>
                  <div className={styles.questionHeader}>
                    <span className={styles.questionBadge}>Câu {idx + 1}</span>
                    {isSubmitted && (
                      <div className={`${styles.questionStatusLabel} ${isCorrect ? styles.txtSuccess : styles.txtDanger}`}>
                        {isChosen ? (isCorrect ? 'CHÍNH XÁC' : 'SAI') : 'CHƯA CHỌN'}
                        {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </div>
                    )}
                  </div>
                  <p className={styles.questionText}>{card.front}</p>
                <div className={styles.optionsList}>
                  {card.options?.map((opt: string, optIdx: number) => {
                    const isSelected = answers[card.id] === optIdx;
                    const isCorrectAnswer = card.correctOptionIndex === optIdx;
                    
                    let cls = styles.optionBtn;
                    if (isSelected) cls += ` ${styles.selected}`;
                    
                    if (isSubmitted) {
                      if (isCorrectAnswer) cls += ` ${styles.isCorrect}`;
                      else if (isSelected) cls += ` ${styles.isIncorrect}`;
                    }

                    return (
                      <button key={optIdx} className={cls} onClick={() => handleSelectOption(card.id, optIdx, idx)} disabled={isSubmitted}>
                        <div className={styles.optionMarker}>{String.fromCharCode(65 + optIdx)}</div>
                        <span>{opt}</span>
                        {isSubmitted && isCorrectAnswer && <Check size={18} style={{ marginLeft: 'auto', color: 'var(--qz-success)' }} />}
                        {isSubmitted && isSelected && !isCorrectAnswer && <X size={18} style={{ marginLeft: 'auto', color: 'var(--qz-danger)' }} />}
                      </button>
                    );
                  })}
                </div>
                </motion.div>
              );
            })}
          </div>
        </main>
        
        {/* Desktop Sidebar */}
        <aside className={styles.navPanel}>
           {sidebarContent}
        </aside>

        {/* Mobile FAB */}
        <div className={styles.mobileActions}>
          <button 
            className={`${styles.fab} ${progressPct === 100 && !isSubmitted ? styles.fabPulse : ''}`} 
            onClick={() => setShowMobileNav(true)}
          >
            <div className={styles.fabInner}>
              <Layout size={24} />
              <div className={styles.fabBadge}>{answeredCount}/{quizCards.length}</div>
            </div>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {showMobileNav && (
            <div className={styles.drawerOverlay} onClick={() => setShowMobileNav(false)}>
              <motion.div 
                className={styles.drawerContent}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.drawerHeader}>
                   <div className={styles.drawerHandle} />
                   <div className={styles.drawerHeaderTop}>
                     <h3 className={styles.drawerTitle}>Bản đồ câu hỏi</h3>
                     <button className={styles.drawerClose} onClick={() => setShowMobileNav(false)}>
                       <X size={20} />
                     </button>
                   </div>
                </div>
                <div className={styles.drawerBody}>
                   {sidebarContent}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExitConfirm(false)}>
            <motion.div className={styles.confirmCard} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className={styles.confirmIcon}>
                <AlertTriangle size={32} />
              </div>
              <h3 className={styles.confirmTitle}>Thoát bài thi?</h3>
              <p className={styles.confirmDesc}>Tiến độ làm bài hiện tại sẽ bị mất và không được lưu vào lịch sử.</p>
              <div className={styles.confirmBtns}>
                <button className={styles.confirmBtnCancel} onClick={() => setShowExitConfirm(false)}>Tiếp tục thi</button>
                <button className={styles.confirmBtnExit} onClick={handleBackToLibrary}><ArrowLeft size={16} /> Thoát ngay</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResultModal && (() => {
          const score = calculateScore();
          const p10 = Number(score.point10);
          const tierColor = p10 >= 8 ? '#10b981' : p10 >= 5 ? '#f59e0b' : '#ef4444';
          const scoreLabel = p10 >= 8 ? 'Xuất sắc!' : p10 >= 5 ? 'Khá tốt!' : 'Cần cố gắng!';
          const statusIcon = p10 >= 8 ? <Trophy size={36} color="#fbbf24" /> : p10 >= 5 ? <Check size={36} color="#10b981" /> : <AlertTriangle size={36} color="#ef4444" />;

          return (
            <motion.div className={styles.resultOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className={styles.orb} style={{ background: `radial-gradient(circle, ${tierColor} 0%, transparent 70%)`, opacity: 0.3 }} />
              <motion.div className={styles.resultCard} initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}>
                <div className={styles.resultHeader}>
                   <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{statusIcon}</div>
                   <h2 className={styles.resultTitle} style={{ color: tierColor }}>{scoreLabel}</h2>
                   <p className={styles.resultDeckName}>{deck.name}</p>
                </div>
                <div className={styles.scoreLarge} style={{ color: tierColor }}>{score.point10}</div>
                <div className={styles.scoreLabel}>ĐIỂM SỐ</div>
                <div className={styles.statsGrid}>
                   <div className={styles.statItem}><div className={styles.statVal} style={{ color: '#059669' }}>{score.correct}</div><div className={styles.statLbl}>Đúng</div></div>
                   <div className={styles.statItem}><div className={styles.statVal} style={{ color: '#dc2626' }}>{score.wrong}</div><div className={styles.statLbl}>Sai</div></div>
                   <div className={styles.statItem}><div className={styles.statVal} style={{ color: tierColor }}>{score.pct}%</div><div className={styles.statLbl}>Tỉ lệ</div></div>
                </div>
                <div className={styles.modalBtns}>
                  <button className={styles.btnPrimary} onClick={handleRestart}><RotateCcw size={20} /> Thi lại</button>
                  <div className={styles.btnRow}><button className={styles.btnSecondary} onClick={() => setShowResultModal(false)}><Flag size={18} /> Xem lỗi</button><button className={styles.btnSecondary} onClick={handleBackToLibrary}><BookOpen size={18} /> Thư viện</button></div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
