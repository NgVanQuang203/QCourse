"use client";

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Deck } from '@/lib/mockData';
import styles from './ImportModal.module.css';
import qStyles from './EditQuizModal.module.css';
import { X, Upload, FileText, ChevronRight, Check, AlertCircle, Eye } from 'lucide-react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

interface ParsedQ {
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

interface Props {
  deckId: string | null;
  allDecks: Deck[];
  onClose: () => void;
}

/**
 * Accepted formats (each line = 1 question):
 *   Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A
 *   Câu hỏi | A1 | B1 | C1 | D1 | 2        (1-indexed number)
 *   Câu hỏi | A1 | B1 | C1 | D1 | B        (letter)
 */
function parseQuiz(raw: string): ParsedQ[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedQ[] = [];
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 6) continue;
    const [question, a, b, c, d, ans] = parts;
    if (!question || !a || !b || !c || !d) continue;
    const options: [string, string, string, string] = [a, b, c, d];
    let correct: 0 | 1 | 2 | 3 = 0;
    const ansU = ans.toUpperCase().trim();
    if (['A','B','C','D'].includes(ansU)) {
      correct = ['A','B','C','D'].indexOf(ansU) as 0|1|2|3;
    } else if (['1','2','3','4'].includes(ansU)) {
      correct = (parseInt(ansU) - 1) as 0|1|2|3;
    } else if (['0','1','2','3'].includes(ansU)) {
      correct = parseInt(ansU) as 0|1|2|3;
    }
    results.push({ question, options, correct });
  }
  return results;
}

export default function ImportQuizModal({ deckId, allDecks, onClose }: Props) {
  const { cards, addCard } = useStore();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId ?? allDecks[0]?.id ?? '');
  const [tab, setTab] = useState<'text' | 'csv'>('text');
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedQ[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const EXAMPLE = `Thủ đô của Việt Nam là gì? | Hà Nội | TP. Hồ Chí Minh | Đà Nẵng | Huế | A
Năm độc lập của Việt Nam? | 1945 | 1954 | 1975 | 1986 | A
Sông dài nhất Việt Nam? | Sông Hồng | Sông Mê Kông | Sông Đà | Sông Mã | B`;

  const handleParse = () => {
    const q = parseQuiz(rawText);
    setPreview(q);
    setShowPreview(true);
  };

  const handleFile = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const text = (e.target?.result as string) ?? '';
      const q = parseQuiz(text);
      setPreview(q);
      setShowPreview(true);
    };
    r.readAsText(file, 'utf-8');
  };

  const handleImport = () => {
    if (!selectedDeckId || preview.length === 0) return;
    let count = 0;
    for (const q of preview) {
      addCard({
        deckId: selectedDeckId,
        front: q.question,
        back: q.options[q.correct],
        options: [...q.options],
        correctOptionIndex: q.correct,
      });
      count++;
    }
    setImported(count);
    setTimeout(onClose, 1800);
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>📥 Import câu hỏi trắc nghiệm</h2>
            <p className={styles.subtitle}>Tự động phân tích định dạng cột phân cách bởi <code>|</code></p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20}/></button>
        </div>

        <div className={styles.body}>
          {imported !== null ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>🎉</div>
              <h3 className={styles.successTitle}>Import thành công!</h3>
              <p className={styles.successDesc}>Đã thêm <strong>{imported}</strong> câu hỏi vào đề thi</p>
            </div>
          ) : (
            <>
              {/* Deck selector */}
              {!deckId && (
                <div className={styles.deckSelect}>
                  <label className={styles.label}>Import vào đề thi</label>
                  <select className={styles.select} value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
                    {allDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* Format spec */}
              <div className={qStyles.qHint} style={{ marginBottom: 0 }}>
                📐 <strong>Định dạng mỗi dòng:</strong>{' '}
                <code>Câu hỏi | Đáp án A | B | C | D | Đáp án đúng</code><br />
                Đáp án đúng có thể là: <code>A / B / C / D</code> hoặc <code>1 / 2 / 3 / 4</code>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`} onClick={() => setTab('text')}>
                  <FileText size={14}/> Nhập văn bản
                </button>
                <button className={`${styles.tab} ${tab === 'csv' ? styles.tabActive : ''}`} onClick={() => setTab('csv')}>
                  <Upload size={14}/> File CSV/TXT
                </button>
              </div>

              {/* Text */}
              {tab === 'text' && (
                <div className={styles.textSection}>
                  <textarea className={styles.bigTextarea} value={rawText} rows={8} spellCheck={false}
                    placeholder={EXAMPLE}
                    onChange={e => { setRawText(e.target.value); setShowPreview(false); }} />
                  <div className={styles.textActions}>
                    <button className={styles.btnGhost} onClick={() => setRawText(EXAMPLE)}>Dùng mẫu</button>
                    <button className={styles.btnPreview} disabled={!rawText.trim()} onClick={handleParse}>
                      <Eye size={13}/> Xem trước ({parseQuiz(rawText).length} câu)
                    </button>
                  </div>
                </div>
              )}

              {/* CSV */}
              {tab === 'csv' && (
                <div className={styles.csvSection}>
                  <div
                    className={`${styles.dropZone} ${dragging ? styles.dropActive : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    <div className={styles.dropIcon}>📂</div>
                    <div className={styles.dropTitle}>Kéo thả hoặc nhấn để chọn file</div>
                    <div className={styles.dropSub}>Hỗ trợ .csv · .txt · Mã hoá UTF-8</div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {showPreview && preview.length > 0 && (
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewTitle}>Xem trước · {preview.length} câu hỏi</span>
                    <button className={styles.btnGhost} onClick={() => setShowPreview(false)}>Ẩn</button>
                  </div>
                  <div className={styles.previewList}>
                    {preview.slice(0, 5).map((q, i) => (
                      <div key={i} className={styles.previewRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                          <div className={styles.previewNum}>{i + 1}</div>
                          <div className={styles.previewFront}>{q.question}</div>
                        </div>
                        <div className={qStyles.optionPreview} style={{ paddingLeft: '1.5rem' }}>
                          {q.options.map((opt, oi) => (
                            <span key={oi} className={`${qStyles.optPrev} ${oi === q.correct ? qStyles.optPrevCorrect : ''}`}>
                              {OPTION_LETTERS[oi]}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {preview.length > 5 && (
                      <div className={styles.previewMore}>...và {preview.length - 5} câu hỏi nữa</div>
                    )}
                  </div>
                </div>
              )}

              {showPreview && preview.length === 0 && (
                <div className={styles.parseError}>
                  <AlertCircle size={15}/> Không đọc được dữ liệu — kiểm tra lại định dạng (cần tối thiểu 6 cột phân cách bởi |)
                </div>
              )}
            </>
          )}
        </div>

        {imported === null && (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose}>Huỷ</button>
            <button className={styles.btnImport} disabled={preview.length === 0 || !selectedDeckId} onClick={handleImport}>
              <Check size={14}/> Import {preview.length > 0 ? `${preview.length} câu` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
