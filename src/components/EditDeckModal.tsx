"use client";

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Deck } from '@/lib/mockData';
import styles from './EditDeckModal.module.css';
import { X, Plus, Trash2, Save, Edit3, ChevronDown, ChevronUp, Check, RefreshCcw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

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

interface Props {
  deckId: string | null; // null = create new
  mode: 'flashcard' | 'quiz';
  initialFolderId?: string | null;
  onClose: () => void;
}

export default function EditDeckModal({ deckId, mode, initialFolderId, onClose }: Props) {
  const { decks, cards, addDeck, updateDeck, addCard, updateCard, deleteCard } = useStore();
  const isNew = deckId === null;
  const existingDeck = decks.find(d => d.id === deckId);
  const deckCards = deckId ? cards.filter(c => c.deckId === deckId) : [];

  // Deck form
  const [deckForm, setDeckForm] = useState({
    name: existingDeck?.name ?? '',
    description: existingDeck?.description ?? '',
    color: existingDeck?.color ?? GRADIENT_PRESETS[0],
  });

  // Card being edited inline
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardToDeleteId, setCardToDeleteId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({ front: '', back: '', option1: '', option2: '', option3: '', option4: '', correct: 0 });
  const [addingCard, setAddingCard] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    front: '',
    back: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct: 0
  });

  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'cards'>('info');
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(deckId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (isNew && !currentDeckId) {
        const targetFolderId = (initialFolderId === 'all') ? null : initialFolderId;
        const newId = await addDeck({ 
          ...deckForm, 
          folderId: targetFolderId ?? null, 
          type: mode === 'quiz' ? 'QUIZ' : 'FLASHCARD' 
        });
        if (newId) {
          setCurrentDeckId(newId);
          setActiveSection('cards');
        }
      } else if (currentDeckId) {
        await updateDeck(currentDeckId, deckForm);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    setEditingCardId(cardId);
    const opts = card.options ?? ['', '', '', ''];
    setCardForm({
      front: card.front,
      back: card.back,
      option1: opts[0] ?? '',
      option2: opts[1] ?? '',
      option3: opts[2] ?? '',
      option4: opts[3] ?? '',
      correct: card.correctOptionIndex ?? 0,
    });
  };

  const handleSaveCard = async () => {
    if (!editingCardId || !cardForm.front.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const opts = mode === 'quiz' ? [cardForm.option1, cardForm.option2, cardForm.option3, cardForm.option4].filter(Boolean) : undefined;
      await updateCard(editingCardId, {
        front: cardForm.front,
        back: cardForm.back,
        ...(mode === 'quiz' && opts ? { options: opts, correctOptionIndex: cardForm.correct } : {}),
      });
      setEditingCardId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCard = async () => {
    if (!newCardForm.front.trim() || !currentDeckId || isSaving) return;
    setIsSaving(true);
    try {
      const opts = mode === 'quiz' ? [newCardForm.option1, newCardForm.option2, newCardForm.option3, newCardForm.option4].filter(Boolean) : undefined;
      await addCard({
        deckId: currentDeckId,
        front: newCardForm.front,
        back: mode === 'quiz' ? (opts?.[newCardForm.correct] ?? '') : newCardForm.back,
        ...(mode === 'quiz' && opts ? { options: opts, correctOptionIndex: newCardForm.correct } : {}),
      });
      setNewCardForm({ front: '', back: '', option1: '', option2: '', option3: '', option4: '', correct: 0 });
      setAddingCard(false);
    } finally {
      setIsSaving(true); // Wait for fetchDeckCards to finish in addCard action? Actually addCard calls it internally.
      setIsSaving(false);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setCardToDeleteId(cardId);
  };
  
  const confirmDeleteCard = async () => {
    if (!cardToDeleteId || isSaving) return;
    setIsSaving(true);
    try {
      await deleteCard(cardToDeleteId);
      setCardToDeleteId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const currentCards = currentDeckId ? cards.filter(c => c.deckId === currentDeckId) : [];

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{isNew ? '✨ Tạo bộ bài mới' : '✏️ Chỉnh sửa bộ bài'}</h2>
            <p className={styles.subtitle}>{isNew ? 'Điền thông tin và thêm thẻ vào bộ bài' : existingDeck?.name}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeSection === 'info' ? styles.tabActive : ''}`} onClick={() => setActiveSection('info')}>
            📋 Thông tin
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'cards' ? styles.tabActive : ''}`}
            onClick={() => setActiveSection('cards')}
            disabled={isNew && !currentDeckId}
          >
            🗂️ Thẻ ({currentCards.length})
          </button>
        </div>

        <div className={styles.body}>
          {/* ── INFO TAB ── */}
          {activeSection === 'info' && (
            <div className={styles.section}>
              {saved && (
                <div className={styles.savedAlert}><Check size={14} /> Đã lưu thành công!</div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Tên bộ bài *</label>
                <input className={styles.input} value={deckForm.name} onChange={e => setDeckForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Tiếng Anh IELTS B2" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mô tả</label>
                <textarea className={styles.textarea} value={deckForm.description} onChange={e => setDeckForm(f => ({ ...f, description: e.target.value }))} placeholder="Ghi chú về nội dung bộ bài..." rows={2} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Màu bộ bài</label>
                <div className={styles.colorGrid}>
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button
                      key={i}
                      className={`${styles.colorItem} ${deckForm.color === g ? styles.colorActive : ''}`}
                      style={{ background: g }}
                      onClick={() => setDeckForm(f => ({ ...f, color: g }))}
                    >
                      {deckForm.color === g && <Check size={16} color="white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button className={styles.btnCancel} onClick={onClose}>Huỷ</button>
                <button className={styles.btnSave} onClick={handleSaveDeck} disabled={!deckForm.name.trim() || isSaving}>
                  {isSaving ? <RefreshCcw size={15} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Save size={15} />}
                  {isSaving ? 'Đang lưu...' : (isNew && !currentDeckId ? 'Tạo & thêm thẻ →' : 'Lưu thay đổi')}
                </button>
              </div>
            </div>
          )}

          {/* ── CARDS TAB ── */}
          {activeSection === 'cards' && (
            <div className={styles.section}>
              {/* Add card button */}
              {!addingCard && (
                <button className={styles.addCardBtn} onClick={() => setAddingCard(true)}>
                  <Plus size={16} /> Thêm thẻ mới
                </button>
              )}

              {/* New card form */}
              {addingCard && (
                <div className={styles.newCardForm}>
                  <div className={styles.cardFormGrid}>
                    <div>
                      <label className={styles.smallLabel}>Mặt trước (câu hỏi)</label>
                      <textarea className={styles.cardInput} value={newCardForm.front} onChange={e => setNewCardForm(f => ({ ...f, front: e.target.value }))} placeholder="Nhập câu hỏi..." rows={2} autoFocus />
                    </div>
                    <div>
                      <label className={styles.smallLabel}>{mode === 'quiz' ? 'Giải thích (không bắt buộc)' : 'Mặt sau (đáp án)'}</label>
                      <textarea className={styles.cardInput} value={newCardForm.back} onChange={e => setNewCardForm(f => ({ ...f, back: e.target.value }))} placeholder={mode === 'quiz' ? 'Giải thích lý do đúng...' : 'Nhập đáp án...'} rows={2} />
                    </div>
                  </div>

                  {mode === 'quiz' && (
                    <div className={styles.optionsGrid}>
                      {(['A','B','C','D'] as const).map((letter, oi) => {
                        const key = `option${oi + 1}` as keyof typeof newCardForm;
                        return (
                          <div key={letter} className={styles.optionRow}>
                            <button
                              className={`${styles.optionMark} ${newCardForm.correct === oi ? styles.optionCorrect : ''}`}
                              onClick={() => setNewCardForm(f => ({ ...f, correct: oi }))}
                              type="button"
                            >{letter}</button>
                            <input className={styles.optionInput} value={String(newCardForm[key])} onChange={e => setNewCardForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`Đáp án ${letter}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className={styles.newCardActions}>
                    <button className={styles.btnGhost} onClick={() => setAddingCard(false)}><X size={14} /> Huỷ</button>
                    <button className={styles.btnSave} onClick={handleAddCard} disabled={!newCardForm.front.trim() || isSaving}>
                      {isSaving ? <RefreshCcw size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Plus size={14} />}
                      {isSaving ? 'Đang thêm...' : 'Thêm thẻ'}
                    </button>
                  </div>
                </div>
              )}

              {/* Card list */}
              <div className={styles.cardList}>
                {currentCards.length === 0 && (
                  <div className={styles.emptyCards}>
                    <span style={{ fontSize: '2.5rem' }}>🗂️</span>
                    <p>Chưa có thẻ nào. Hãy thêm thẻ đầu tiên!</p>
                  </div>
                )}
                {currentCards.map((card, idx) => (
                  <div key={card.id} className={`${styles.cardItem} ${editingCardId === card.id ? styles.cardItemEditing : ''}`}>
                    {editingCardId === card.id ? (
                      /* Edit mode */
                      <div className={styles.cardEditForm}>
                        <div className={styles.cardFormGrid}>
                          <div>
                            <label className={styles.smallLabel}>Mặt trước</label>
                            <textarea className={styles.cardInput} value={cardForm.front} onChange={e => setCardForm(f => ({ ...f, front: e.target.value }))} rows={2} />
                          </div>
                          <div>
                            <label className={styles.smallLabel}>Mặt sau / Đáp án đúng</label>
                            <textarea className={styles.cardInput} value={cardForm.back} onChange={e => setCardForm(f => ({ ...f, back: e.target.value }))} rows={2} />
                          </div>
                        </div>
                        {mode === 'quiz' && (
                          <div className={styles.optionsGrid}>
                            {(['A','B','C','D'] as const).map((letter, oi) => {
                              const key = `option${oi + 1}` as keyof typeof cardForm;
                              return (
                                <div key={letter} className={styles.optionRow}>
                                  <button
                                    className={`${styles.optionMark} ${cardForm.correct === oi ? styles.optionCorrect : ''}`}
                                    onClick={() => setCardForm(f => ({ ...f, correct: oi }))}
                                    type="button"
                                  >{letter}</button>
                                  <input className={styles.optionInput} value={String(cardForm[key])} onChange={e => setCardForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`Đáp án ${letter}`} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className={styles.newCardActions}>
                          <button className={styles.btnGhost} onClick={() => setEditingCardId(null)}><X size={14} /> Huỷ</button>
                          <button className={styles.btnSave} onClick={handleSaveCard} disabled={isSaving}>
                            {isSaving ? <RefreshCcw size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Save size={14} />}
                            {isSaving ? 'Đang lưu...' : 'Lưu thẻ'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className={styles.cardViewRow}>
                        <div className={styles.cardNum}>{idx + 1}</div>
                        <div className={styles.cardTexts}>
                          <div className={styles.cardFront}>{card.front}</div>
                          <div className={styles.cardBack}>{card.back}</div>
                        </div>
                        <div className={styles.cardActions}>
                          <button className={styles.iconBtnSm} onClick={() => handleStartEditCard(card.id)} title="Sửa"><Edit3 size={14} /></button>
                          <button className={`${styles.iconBtnSm} ${styles.iconDanger}`} onClick={() => handleDeleteCard(card.id)} title="Xoá"><Trash2 size={14} /></button>
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
        isOpen={!!cardToDeleteId}
        title="Xoá thẻ này?"
        message="Nội dung thẻ này sẽ bị xoá vĩnh viễn khỏi bộ bài."
        confirmLabel="Xoá thẻ"
        variant="danger"
        isLoading={isSaving}
        onConfirm={confirmDeleteCard}
        onCancel={() => setCardToDeleteId(null)}
      />
    </div>
  );
}
