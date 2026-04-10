"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import styles from './EditDeckModal.module.css';
import qStyles from './EditQuizModal.module.css';
import { X, Plus, Trash2, Save, Edit3, Check, RefreshCcw, Upload } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ImportQuizModal from './ImportQuizModal';


const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explain?: string;
}

interface Props {
  deckId: string | null;
  initialFolderId?: string | null;
  onClose: () => void;
}

function emptyQuestion(): QuizQuestion {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    question: '',
    options: ['', '', '', ''],
    correct: 0,
  };
}

const setOpt = (form: QuizQuestion, i: number, val: string): QuizQuestion => {
  const opts = [...form.options] as [string, string, string, string];
  opts[i] = val;
  return { ...form, options: opts };
};

const QuestionForm = ({ q, setQ, onSave, onCancel, saveLabel, isSaving }: {
  q: QuizQuestion;
  setQ: (q: QuizQuestion) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  isSaving?: boolean;
}) => (
  <div className={qStyles.qForm}>
    <div className={qStyles.qFormGroup}>
      <label className={qStyles.qLabel}>Câu hỏi *</label>
      <textarea
        className={qStyles.qTextarea}
        value={q.question}
        onChange={e => setQ({ ...q, question: e.target.value })}
        placeholder="Nhập nội dung câu hỏi..."
        rows={2}
        autoFocus
        disabled={isSaving}
      />
    </div>

    <div className={qStyles.optionsGrid}>
      {OPTION_LETTERS.map((letter, i) => (
        <div key={i} className={qStyles.optionRow}>
          <button
            type="button"
            className={`${qStyles.optionBadge} ${q.correct === i ? qStyles.optionCorrect : ''}`}
            onClick={() => setQ({ ...q, correct: i as 0|1|2|3 })}
            title="Đặt làm đáp án đúng"
            disabled={isSaving}
          >
            {q.correct === i ? <Check size={12}/> : letter}
          </button>
          <input
            className={qStyles.optionInput}
            value={q.options[i]}
            onChange={e => setQ(setOpt(q, i, e.target.value))}
            placeholder={`Đáp án ${letter}...`}
            disabled={isSaving}
          />
        </div>
      ))}
    </div>

    <div className={qStyles.qHint}>
      💡 Nhấn vào chữ <strong>A · B · C · D</strong> để chọn đáp án đúng (ô xanh)
    </div>

    <div className={qStyles.qActions}>
      <button className={qStyles.btnGhost} onClick={onCancel} disabled={isSaving}><X size={13}/> Huỷ</button>
      <button 
        className={qStyles.btnSave} 
        disabled={!q.question.trim() || q.options.some(o => !o.trim()) || isSaving} 
        onClick={onSave}
      >
        {isSaving ? <RefreshCcw size={13} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Save size={13}/>}
        {isSaving ? 'Đang lưu...' : saveLabel}
      </button>
    </div>
  </div>
);

export default function EditQuizModal({ deckId, initialFolderId, onClose }: Props) {
  const { decks, cards, addDeck, updateDeck, addCard, updateCard, deleteCard } = useStore();

  const isNew = deckId === null;
  const existingDeck = decks.find(d => d.id === deckId);

  // Deck form
  const [deckForm, setDeckForm] = useState({
    name: existingDeck?.name ?? '',
    description: existingDeck?.description ?? '',
    color: existingDeck?.color ?? GRADIENT_PRESETS[0],
    timeLimitSec: 60,    // seconds per question
  });

  const [section, setSection] = useState<'info' | 'questions'>('info');
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(deckId);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);


  // Questions draft (only populated this session for new questions)
  // For existing: load from cards
  const existingCards = currentDeckId ? cards.filter(c => c.deckId === currentDeckId) : [];

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionToDeleteId, setQuestionToDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuizQuestion>(emptyQuestion());
  const [addingNew, setAddingNew] = useState(false);
  const [newQ, setNewQ] = useState<QuizQuestion>(emptyQuestion());

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (isNew && !currentDeckId) {
        const targetFolderId = (initialFolderId === 'all') ? null : initialFolderId;
        const id = await addDeck({ 
          name: deckForm.name, 
          description: deckForm.description, 
          color: deckForm.color, 
          timeLimitSec: deckForm.timeLimitSec, 
          folderId: targetFolderId ?? undefined, 
          type: 'QUIZ' 
        });
        setCurrentDeckId(id as string);
        setSection('questions');
      } else if (currentDeckId) {
        await updateDeck(currentDeckId, { name: deckForm.name, description: deckForm.description, color: deckForm.color, timeLimitSec: deckForm.timeLimitSec });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    setEditingId(cardId);
    setEditForm({
      id: cardId,
      question: card.front,
      options: (card.options && card.options.length >= 4
        ? [card.options[0], card.options[1], card.options[2], card.options[3]]
        : [card.back, '', '', '']) as [string, string, string, string],
      correct: (card.correctOptionIndex ?? 0) as 0 | 1 | 2 | 3,
      explain: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.question.trim() || editForm.options.some(o => !o.trim()) || isSaving) return;
    setIsSaving(true);
    try {
      const correctBack = editForm.options[editForm.correct];
      await updateCard(editingId, {
        front: editForm.question,
        back: correctBack,
        options: [...editForm.options],
        correctOptionIndex: editForm.correct,
      });
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!newQ.question.trim() || !currentDeckId || newQ.options.some(o => !o.trim()) || isSaving) return;
    setIsSaving(true);
    try {
      const correctBack = newQ.options[newQ.correct];
      await addCard({
        deckId: currentDeckId,
        front: newQ.question,
        back: correctBack,
        options: [...newQ.options],
        correctOptionIndex: newQ.correct,
      });
      setNewQ(emptyQuestion());
      setAddingNew(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setQuestionToDeleteId(id);
  };

  const confirmDeleteQuestion = () => {
    if (questionToDeleteId) deleteCard(questionToDeleteId);
    setQuestionToDeleteId(null);
  };

// QuestionForm has been extracted outside the component.

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${styles.modal} ${qStyles.wideModal}`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{isNew ? '🎯 Tạo đề thi mới' : '✏️ Chỉnh sửa đề thi'}</h2>
            <p className={styles.subtitle}>{isNew ? 'Tạo đề và soạn câu hỏi trắc nghiệm' : existingDeck?.name}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${section === 'info' ? styles.tabActive : ''}`} onClick={() => setSection('info')}>
            📋 Thông tin đề
          </button>
          <button
            className={`${styles.tab} ${section === 'questions' ? styles.tabActive : ''}`}
            onClick={() => setSection('questions')}
            disabled={isNew && !currentDeckId}
          >
            ❓ Câu hỏi ({existingCards.length})
          </button>
        </div>

        <div className={styles.body}>
          {/* ── INFO TAB ── */}
          {section === 'info' && (
            <div className={styles.section}>
              {saved && <div className={styles.savedAlert}><Check size={13}/> Đã lưu!</div>}

              <div className={styles.formGroup}>
                <label className={styles.label}>Tên đề thi *</label>
                <input className={styles.input} value={deckForm.name}
                  onChange={e => setDeckForm(f => ({...f, name: e.target.value}))}
                  placeholder="VD: Đề thi Lịch sử lớp 12 — HK1"/>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mô tả</label>
                <textarea className={styles.textarea} value={deckForm.description}
                  onChange={e => setDeckForm(f => ({...f, description: e.target.value}))}
                  placeholder="Nội dung đề, phạm vi thi, độ khó..." rows={2}/>
              </div>

              <div className={qStyles.timeRow}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Thời gian / câu hỏi (giây)</label>
                  <div className={qStyles.timeInputRow}>
                    <button className={qStyles.timeBtn} onClick={() => setDeckForm(f => ({...f, timeLimitSec: Math.max(15, f.timeLimitSec - 15)}))}>−</button>
                    <div className={qStyles.timeDisplay}>{deckForm.timeLimitSec}s</div>
                    <button className={qStyles.timeBtn} onClick={() => setDeckForm(f => ({...f, timeLimitSec: Math.min(300, f.timeLimitSec + 15)}))}>+</button>
                    <span className={qStyles.timePre}>Phổ biến:</span>
                    {[30,60,90,120].map(s => (
                      <button key={s} className={`${qStyles.timePreset} ${deckForm.timeLimitSec === s ? qStyles.timePresetActive : ''}`}
                        onClick={() => setDeckForm(f => ({...f, timeLimitSec: s}))}>{s}s</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Màu đề thi</label>
                <div className={styles.colorGrid}>
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button key={i}
                      className={`${styles.colorItem} ${deckForm.color === g ? styles.colorActive : ''}`}
                      style={{ background: g }}
                      onClick={() => setDeckForm(f => ({...f, color: g}))}>
                      {deckForm.color === g && <Check size={14} color="white"/>}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button className={styles.btnCancel} onClick={onClose}>Huỷ</button>
                <button className={styles.btnSave} disabled={!deckForm.name.trim() || isSaving} onClick={handleSaveDeck}>
                  {isSaving ? <RefreshCcw size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Save size={14}/>}
                  {isSaving ? 'Đang lưu...' : (isNew && !currentDeckId ? 'Tạo & soạn câu hỏi →' : 'Lưu thay đổi')}
                </button>
              </div>
            </div>
          )}

          {/* ── QUESTIONS TAB ── */}
          {section === 'questions' && (
            <div className={styles.section}>
              {/* Add question */}
              {!addingNew && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button className={styles.addCardBtn} style={{ marginBottom: 0 }} onClick={() => { setAddingNew(true); setNewQ(emptyQuestion()); }}>
                    <Plus size={15}/> Thêm câu hỏi mới
                  </button>
                  <button className={styles.btnGhost} onClick={() => setShowImport(true)} style={{ flex: 1, padding: '0.7rem' }}>
                    <Upload size={14} /> Nhập nhanh
                  </button>
                </div>
              )}


              {addingNew && (
                <div className={qStyles.newQWrap}>
                  <QuestionForm
                    q={newQ}
                    setQ={setNewQ}
                    onSave={handleAddNew}
                    onCancel={() => setAddingNew(false)}
                    saveLabel="Thêm câu hỏi"
                    isSaving={isSaving}
                  />
                </div>
              )}

              {/* Question list */}
              <div className={styles.cardList}>
                {existingCards.length === 0 && (
                  <div className={styles.emptyCards}>
                    <span style={{fontSize:'2.5rem'}}>❓</span>
                    <p>Chưa có câu hỏi. Hãy thêm câu hỏi đầu tiên!</p>
                  </div>
                )}

                {existingCards.map((card, idx) => (
                  <div key={card.id} className={`${styles.cardItem} ${editingId === card.id ? styles.cardItemEditing : ''}`}>
                    {editingId === card.id ? (
                      <div style={{ padding: '0.75rem' }}>
                        <QuestionForm
                          q={editForm}
                          setQ={setEditForm}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingId(null)}
                          saveLabel="Lưu câu hỏi"
                          isSaving={isSaving}
                        />
                      </div>
                    ) : (
                      <div className={styles.cardViewRow}>
                        <div className={styles.cardNum}>{idx + 1}</div>
                        <div className={styles.cardTexts}>
                          <div className={styles.cardFront}>{card.front}</div>
                          <div className={qStyles.optionPreview}>
                            {(card.options ?? [card.back]).map((opt, oi) => (
                              <span key={oi} className={`${qStyles.optPrev} ${oi === (card.correctOptionIndex ?? 0) ? qStyles.optPrevCorrect : ''}`}>
                                {OPTION_LETTERS[oi]}. {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={styles.cardActions}>
                          <button className={styles.iconBtnSm} onClick={() => handleStartEdit(card.id)}><Edit3 size={13}/></button>
                          <button className={`${styles.iconBtnSm} ${styles.iconDanger}`} onClick={() => handleDelete(card.id)}><Trash2 size={13}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={!!questionToDeleteId}
        title="Xoá câu hỏi này?"
        message="Nội dung câu hỏi này sẽ bị xoá vĩnh viễn khỏi bộ đề thi."
        confirmLabel="Xoá câu hỏi"
        variant="danger"
        isLoading={isSaving}
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDeleteId(null)}
      />

      {showImport && currentDeckId && (
        <ImportQuizModal
          deckId={currentDeckId}
          allDecks={decks.filter(d => d.id === currentDeckId)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>

  );
}
