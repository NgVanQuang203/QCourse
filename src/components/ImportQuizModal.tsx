"use client";

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Deck } from '@/lib/mockData';
import styles from './ImportModal.module.css';
import qStyles from './EditQuizModal.module.css';
import { X, Upload, FileText, ChevronRight, Check, AlertCircle, Eye, RefreshCcw } from 'lucide-react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

interface ParsedQ {
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

interface Props {
  deckId: string | null;
  allDecks: Deck[];
  initialFolderId?: string | null;
  onClose: () => void;
}

/**
 * Accepted formats (each line = 1 question):
 *   Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A
 *   Câu hỏi | A1 | B1 | C1 | D1 | 2        (1-indexed number)
 *   Câu hỏi | A1 | B1 | C1 | D1 | B        (letter)
 * Or JSON format: 
 *   [ { "question": "...", "options": ["A","B","C","D"], "correct": 0 } ]
 */
function parseBetterQuizJSON(raw: string): ParsedQ[] | null {
  try {
    const data = JSON.parse(raw);
    const results: ParsedQ[] = [];
    
    // Helper to find all objects that look like questions in any data structure
    const extractQuestions = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      // If it's an array, check elements
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === 'object' && item) {
            const q = item.question || item.q || item.text || item.content || item.Question || item.Cauhoi || item.cauhoi;
            const opts = item.options || item.choices || item.Options || item.Choices || item.dapan || item.Dapan;
            if (q && opts) {
              processItem(item);
            } else {
              // Deep search if this item is just a container
              extractQuestions(item);
            }
          }
        }
      } else {
        // If it's an object, check if it's a question or search its keys
        const q = obj.question || obj.q || obj.text || obj.content || obj.Question || obj.Cauhoi || obj.cauhoi;
        const opts = obj.options || obj.choices || obj.Options || obj.Choices || obj.dapan || obj.Dapan;
        
        if (q && opts) {
          processItem(obj);
        } else {
          // It's likely a wrapper, search all keys that are arrays
          for (const key in obj) {
            if (Array.isArray(obj[key])) {
              extractQuestions(obj[key]);
            }
          }
        }
      }
    };

    const processItem = (item: any) => {
      const question = item.question || item.q || item.text || item.content || item.Question || item.Cauhoi || item.cauhoi;
      let options = item.options || item.choices || item.Options || item.Choices || item.dapan || item.Dapan;
      let correct = item.correct !== undefined ? item.correct : (item.answer !== undefined ? item.answer : (item.ans !== undefined ? item.ans : (item.Correct !== undefined ? item.Correct : item.DapAnDung)));

      // If options are separate fields a, b, c, d
      if (!options && (item.a || item.A) && (item.b || item.B)) {
        options = [
          item.a || item.A, 
          item.b || item.B, 
          item.c || item.C || '', 
          item.d || item.D || ''
        ].filter(v => v !== undefined);
      }

      if (question && Array.isArray(options) && options.length >= 2) {
        const fullOptions: [string, string, string, string] = [
          String(options[0] || '').trim(),
          String(options[1] || '').trim(),
          String(options[2] || '').trim(),
          String(options[3] || '').trim()
        ];

        let correctIdx: 0|1|2|3 = 0;
        if (typeof correct === 'string') {
          const u = correct.toUpperCase().trim();
          if (['A','B','C','D'].includes(u)) correctIdx = ['A','B','C','D'].indexOf(u) as 0|1|2|3;
          else if (['1','2','3','4'].includes(u)) correctIdx = (parseInt(u) - 1) as 0|1|2|3;
          else if (['0','1','2','3'].includes(u)) correctIdx = parseInt(u) as 0|1|2|3;
        } else if (typeof correct === 'number') {
          if (correct >= 0 && correct <= 3) correctIdx = correct as 0|1|2|3;
          else if (correct >= 1 && correct <= 4) correctIdx = (correct - 1) as 0|1|2|3;
        }

        results.push({ question: String(question).trim(), options: fullOptions, correct: correctIdx });
      }
    };

    extractQuestions(data);
    return results.length > 0 ? results : null;
  } catch(e) { return null; }
}

function parseQuiz(raw: string): ParsedQ[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedQ[] = [];
  for (const line of lines) {
    // Support multiple separators: |, tab, semicolor
    const sep = line.includes('|') ? '|' : line.includes('\t') ? '\t' : (line.split(',').length >= 6) ? ',' : ';';
    const parts = line.split(sep).map(p => p.trim());
    if (parts.length < 2) continue;

    if (parts.length >= 6) {
      const [question, a, b, c, d, ans] = parts;
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
    } else {
      // Fallback for partial data
      const question = parts[0];
      const a = parts[1] || '...';
      const b = parts[2] || '...';
      const c = parts[3] || '...';
      const d = parts[4] || '...';
      results.push({ question, options: [a, b, c, d], correct: 0 });
    }
  }
  return results;
}

export default function ImportQuizModal({ deckId, allDecks, initialFolderId, onClose }: Props) {
  const { importCards, addDeck } = useStore();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId ?? '');
  const [newName, setNewName] = useState(`Đề thi mới - ${new Date().toLocaleDateString('vi-VN')}`);
  const [tab, setTab] = useState<'text' | 'csv' | 'json'>('text');
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedQ[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const EXAMPLE = `Thủ đô của Việt Nam là gì? | Hà Nội | TP. Hồ Chí Minh | Đà Nẵng | Huế | A
Năm độc lập của Việt Nam? | 1945 | 1954 | 1975 | 1986 | A`;

  const EXAMPLE_JSON = `[\n  {\n    "question": "Thủ đô của Việt Nam là gì?",\n    "options": ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Huế"],\n    "correct": 0\n  }\n]`;

  const handleParse = (text: string) => {
    let q = parseBetterQuizJSON(text);
    if (!q) q = parseQuiz(text);
    const results = q || [];
    setPreview(results);
  };

  const onTextChange = (val: string) => {
    setRawText(val);
    let q = parseBetterQuizJSON(val);
    if (!q) q = parseQuiz(val);
    setPreview(q || []);
  };

  const handleFile = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const text = (e.target?.result as string) ?? '';
      setRawText(text);
      let q = parseBetterQuizJSON(text);
      if (!q) q = parseQuiz(text);
      const results = q || [];
      setPreview(results);
      if (results.length > 0) setShowPreviewPopup(true);
    };
    r.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if ((!selectedDeckId && !newName) || preview.length === 0 || isImporting) return;
    
    setIsImporting(true);
    try {
      let targetId = selectedDeckId;
      
      // Create new deck if requested
      if (!targetId) {
        const newId = await addDeck({
          name: newName,
          description: `Đã nhập ${preview.length} câu từ file`,
          color: '#3b82f6',
          type: 'QUIZ',
          folderId: initialFolderId || undefined,
        });
        if (!newId) throw new Error('Failed to create quiz');
        targetId = newId;
      }

      const cardsToImport = preview.map(q => ({
        deckId: targetId,
        front: q.question,
        back: q.options[q.correct],
        options: [...q.options],
        correctOptionIndex: q.correct,
      }));

      const count = await importCards(targetId, cardsToImport as any);
      setImported(count);
      setTimeout(onClose, 1800);
    } catch(err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>📥 Import câu hỏi trắc nghiệm</h2>
            <p className={styles.subtitle}>Tự động nhận diện định dạng <code>JSON</code> hoặc <code>Văn bản</code></p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20}/></button>
        </div>

        <div className={styles.body}>
          {imported !== null ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>🎉</div>
              <h3 className={styles.successTitle}>Import thành công!</h3>
              <p className={styles.successDesc}>Đã tạo đề thi và thêm <strong>{imported}</strong> câu hỏi</p>
            </div>
          ) : (
            <>
              {/* Target Selector / New Name */}
              <div className={styles.deckSelect}>
                {deckId ? (
                  <div className={styles.targetInfo}>
                    Import vào: <strong>{allDecks.find(d => d.id === deckId)?.name}</strong>
                  </div>
                ) : (
                  <div className={styles.importTargetRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Tên đề thi mới</label>
                      <input 
                        type="text" 
                        className={styles.input} 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        placeholder="VD: Đề thi giữa kỳ..."
                      />
                    </div>
                    <div className={styles.field} style={{ flex: '0 0 200px' }}>
                      <label className={styles.label}>Hoặc chọn đề có sẵn</label>
                      <select className={styles.select} value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
                        <option value="">-- Tạo đề mới --</option>
                        {allDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`} onClick={() => setTab('text')}>
                  <FileText size={14}/> Văn bản
                </button>
                <button className={`${styles.tab} ${tab === 'csv' ? styles.tabActive : ''}`} onClick={() => setTab('csv')}>
                  <Upload size={14}/> File .txt/.csv
                </button>
                <button className={`${styles.tab} ${tab === 'json' ? styles.tabActive : ''}`} onClick={() => setTab('json')}>
                  <FileText size={14}/> JSON
                </button>
              </div>

              {/* Text / JSON area */}
              {tab !== 'csv' && (
                <div className={styles.textSection}>
                  <textarea className={styles.bigTextarea} value={rawText} rows={8} spellCheck={false}
                    placeholder={tab === 'json' ? EXAMPLE_JSON : EXAMPLE}
                    onChange={e => onTextChange(e.target.value)} />
                  <div className={styles.textActions}>
                    <button className={styles.btnGhost} onClick={() => onTextChange(tab === 'json' ? EXAMPLE_JSON : EXAMPLE)}>Dùng mẫu</button>
                    <button className={styles.btnPreview} onClick={() => { handleParse(rawText); if (preview.length > 0) setShowPreviewPopup(true); }} disabled={!rawText.trim()}>
                      <Eye size={14} /> Xem trước & Duyệt
                    </button>
                    {preview.length > 0 && <span className={styles.countInfo}>Đã nhận diện: <strong>{preview.length}</strong> câu</span>}
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
                    <input ref={fileRef} type="file" accept=".csv,.txt,.json" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    <div className={styles.dropIcon}>📂</div>
                    <div className={styles.dropTitle}>Kéo thả hoặc nhấn để chọn file</div>
                    <div className={styles.dropSub}>Hỗ trợ .csv, .txt, .json</div>
                  </div>
                </div>
              )}

              {/* Dedicated Preview Popup */}
              {showPreviewPopup && preview.length > 0 && (
                <div className={styles.previewPopupOverlay}>
                  <div className={styles.previewPopupHeader}>
                    <div>
                      <div className={styles.previewPopupTitle}>✨ Xem trước dữ liệu ({preview.length} câu)</div>
                      <p className={styles.subtitle}>Kiểm tra kỹ nội dung trước khi thực hiện Import</p>
                    </div>
                    <button className={styles.closeBtn} onClick={() => setShowPreviewPopup(false)}><X size={18}/></button>
                  </div>
                  <div className={styles.previewPopupBody}>
                    <div className={styles.previewList}>
                      {preview.map((q, i) => (
                        <div key={i} className={styles.previewRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <div className={styles.previewNum}>{i + 1}</div>
                            <div className={styles.previewFront}>{q.question || <span style={{color:'red'}}>Chưa có câu hỏi</span>}</div>
                          </div>
                          <div className={qStyles.optionPreview} style={{ paddingLeft: '1.5rem', opacity: 0.7 }}>
                            {q.options.map((opt, oi) => (
                              <span key={oi} className={`${qStyles.optPrev} ${oi === q.correct ? qStyles.optPrevCorrect : ''}`}>
                                {OPTION_LETTERS[oi]}. {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.previewPopupFooter}>
                    <button className={styles.btnImport} onClick={() => setShowPreviewPopup(false)}>
                      <Check size={14} /> Xong, tiếp tục Import
                    </button>
                  </div>
                </div>
              )}

              {rawText.trim() && preview.length === 0 && (
                <div className={styles.parseError}>
                  <AlertCircle size={15}/> ⚠️ Chưa nhận diện được dữ liệu. Vui lòng check lại định dạng!
                </div>
              )}
            </>
          )}
        </div>

        {imported === null && (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose} disabled={isImporting}>Huỷ</button>
            <button 
              className={styles.btnImport} 
              disabled={preview.length === 0 || (!selectedDeckId && !newName) || isImporting} 
              onClick={handleImport}
              style={{ gap: '0.4rem' }}
            >
              {isImporting ? (
                <RefreshCcw size={14} className={styles.spinner} />
              ) : (
                <Check size={14} />
              )}
              {isImporting ? 'Đang xử lý...' : selectedDeckId ? `Nhập vào đề thi` : `Tạo và Import ngay`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
