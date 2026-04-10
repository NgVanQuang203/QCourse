"use client";

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Deck } from '@/lib/mockData';
import styles from './ImportModal.module.css';
import { X, Upload, FileText, ChevronRight, Check, AlertCircle, Eye, Download, RefreshCcw } from 'lucide-react';

interface ParsedPair { front: string; back: string; }
interface Props {
  deckId: string | null; // null = pick from list
  allDecks: Deck[];
  initialFolderId?: string | null;
  onClose: () => void;
}

function parseText(raw: string): ParsedPair[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: ParsedPair[] = [];
  for (const line of lines) {
    // Support: tab, pipe, double dash, semicolon, comma
    const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : line.includes('--') ? '--' : line.includes(';') ? ';' : ',';
    const idx = line.indexOf(sep);
    if (idx > 0) {
      pairs.push({ front: line.slice(0, idx).trim(), back: line.slice(idx + sep.length).trim() });
    } else {
      // Partial parse: treat entire line as front if no separator
      pairs.push({ front: line, back: '...' });
    }
  }
  return pairs;
}

function parseBetterJSON(raw: string): ParsedPair[] | null {
  try {
    const data = JSON.parse(raw);
    const results: ParsedPair[] = [];
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      if (typeof item !== 'object' || !item) continue;
      
      const front = item.front || item.term || item.question || item.q || item.word || Object.values(item)[0];
      const back = item.back || item.definition || item.answer || item.a || item.meaning || Object.values(item)[1];
      
      if (front) {
        results.push({ front: String(front).trim(), back: String(back || '...').trim() });
      }
    }
    return results.length > 0 ? results : null;
  } catch(e) { return null; }
}

export default function ImportModal({ deckId, allDecks, initialFolderId, onClose }: Props) {
  const { importCards, addDeck } = useStore();
  const [tab, setTab] = useState<'text' | 'csv' | 'json'>('text');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId ?? '');
  const [newName, setNewName] = useState(`Bộ thẻ mới - ${new Date().toLocaleDateString('vi-VN')}`);
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedPair[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = (text: string) => {
    let pairs = parseBetterJSON(text);
    if (!pairs) pairs = parseText(text);
    const results = pairs || [];
    setPreview(results);
  };

  const onTextChange = (val: string) => {
    setRawText(val);
    let pairs = parseBetterJSON(val);
    if (!pairs) pairs = parseText(val);
    setPreview(pairs || []);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      setRawText(text);
      handleParse(text);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if ((!selectedDeckId && !newName) || preview.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      let targetId = selectedDeckId;

      if (!targetId) {
        const newId = await addDeck({
          name: newName,
          description: `Đã nhập ${preview.length} thẻ từ file`,
          color: '#8b5cf6',
          type: 'FLASHCARD',
          folderId: initialFolderId || undefined,
        });
        if (!newId) throw new Error('Failed to create deck');
        targetId = newId;
      }

      const count = await importCards(targetId, preview);
      setImported(count);
      setTimeout(() => { onClose(); }, 1800);
    } catch(err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const exampleText = `Diligence | Sự siêng năng\nEloquent | Có tài hùng biện\nResilient | Kiên cường, mau phục hồi`;
  const EXAMPLE_JSON = `[\n  {\n    "front": "Diligence",\n    "back": "Sự siêng năng"\n  }\n]`;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>📥 Import thẻ</h2>
            <p className={styles.subtitle}>Nhập nhanh nhiều thẻ cùng lúc</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body}>
          {/* Success state */}
          {imported !== null ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>🎉</div>
              <h3 className={styles.successTitle}>Import thành công!</h3>
              <p className={styles.successDesc}>Đã tạo bộ thẻ và thêm <strong>{imported}</strong> thẻ</p>
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
                      <label className={styles.label}>Tên bộ thẻ mới</label>
                      <input 
                        type="text" 
                        className={styles.input} 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        placeholder="VD: Từ vựng tiếng Anh..."
                      />
                    </div>
                    <div className={styles.field} style={{ flex: '0 0 200px' }}>
                      <label className={styles.label}>Hoặc chọn bộ có sẵn</label>
                      <select className={styles.select} value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
                        <option value="">-- Tạo bộ mới --</option>
                        {allDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`} onClick={() => setTab('text')}>
                  <FileText size={15} /> Nhập văn bản
                </button>
                <button className={`${styles.tab} ${tab === 'csv' ? styles.tabActive : ''}`} onClick={() => setTab('csv')}>
                  <Upload size={15} /> File .txt/.csv
                </button>
                <button className={`${styles.tab} ${tab === 'json' ? styles.tabActive : ''}`} onClick={() => setTab('json')}>
                  <FileText size={15} /> JSON
                </button>
              </div>

              {/* Text / JSON area */}
              {tab !== 'csv' && (
                <div className={styles.textSection}>
                  <textarea
                    className={styles.bigTextarea}
                    value={rawText}
                    onChange={e => onTextChange(e.target.value)}
                    placeholder={tab === 'json' ? EXAMPLE_JSON : exampleText}
                    rows={10}
                    spellCheck={false}
                  />
                  <div className={styles.textActions}>
                    <button className={styles.btnGhost} onClick={() => onTextChange(tab === 'json' ? EXAMPLE_JSON : exampleText)}>Dùng mẫu</button>
                    <button className={styles.btnPreview} onClick={() => handleParse(rawText)} disabled={!rawText.trim()}>
                      <Eye size={14} /> Xem trước
                    </button>
                    <span className={styles.countInfo}>Đã nhận diện: <strong>{preview.length}</strong> thẻ</span>
                  </div>
                </div>
              )}

              {/* CSV import */}
              {tab === 'csv' && (
                <div className={styles.csvSection}>
                  <div
                    className={`${styles.dropZone} ${dragging ? styles.dropActive : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt,.json"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
                    />
                    <div className={styles.dropIcon}>📂</div>
                    <div className={styles.dropTitle}>Kéo thả file .csv, .txt, .json vào đây</div>
                    <div className={styles.dropSub}>hoặc nhấn để chọn file</div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && (
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewTitle}>✨ Dữ liệu đã nhận diện ({preview.length})</span>
                  </div>
                  <div className={styles.previewList}>
                    {preview.slice(0, 10).map((p, i) => (
                      <div key={i} className={styles.previewRow}>
                        <div className={styles.previewNum}>{i + 1}</div>
                        <div className={styles.previewFront}>{p.front || <span style={{color:'red'}}>Chưa có mặt trước</span>}</div>
                        <ChevronRight size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                        <div className={styles.previewBack}>{p.back}</div>
                      </div>
                    ))}
                    {preview.length > 10 && (
                      <div className={styles.previewMore}>...và {preview.length - 10} thẻ khác</div>
                    )}
                  </div>
                </div>
              )}

              {preview.length === 0 && rawText.trim() && (
                <div className={styles.parseError}>
                  <AlertCircle size={16} /> ⚠️ Chưa nhận diện được dữ liệu. Vui lòng check lại định dạng!
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {imported === null && (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose} disabled={isImporting}>Huỷ</button>
            <button
              className={styles.btnImport}
              onClick={handleImport}
              disabled={preview.length === 0 || (!selectedDeckId && !newName) || isImporting}
              style={{ gap: '0.4rem' }}
            >
              {isImporting ? (
                <RefreshCcw size={15} className={styles.spinner} />
              ) : (
                <Check size={15} />
              )}
              {isImporting ? 'Đang xử lý...' : selectedDeckId ? `Nhập vào bộ thẻ` : `Tạo và Import ngay`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
