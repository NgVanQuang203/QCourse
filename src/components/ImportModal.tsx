"use client";

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Deck } from '@/lib/mockData';
import styles from './ImportModal.module.css';
import { X, Upload, FileText, ChevronRight, Check, AlertCircle, Eye, Download } from 'lucide-react';

interface ParsedPair { front: string; back: string; }
interface Props {
  deckId: string | null; // null = pick from list
  allDecks: Deck[];
  onClose: () => void;
}

function parseText(raw: string): ParsedPair[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: ParsedPair[] = [];
  for (const line of lines) {
    // Support: tab, pipe, double dash, comma
    const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : line.includes('--') ? '--' : ',';
    const idx = line.indexOf(sep);
    if (idx > 0) {
      pairs.push({ front: line.slice(0, idx).trim(), back: line.slice(idx + sep.length).trim() });
    }
  }
  return pairs;
}

export default function ImportModal({ deckId, allDecks, onClose }: Props) {
  const { importCards } = useStore();
  const [tab, setTab] = useState<'text' | 'csv'>('text');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId ?? allDecks[0]?.id ?? '');
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedPair[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParseText = () => {
    const pairs = parseText(rawText);
    setPreview(pairs);
    setShowPreview(true);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const pairs = parseText(text);
      setPreview(pairs);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  };

  const handleImport = () => {
    if (!selectedDeckId || preview.length === 0) return;
    const count = importCards(selectedDeckId, preview);
    setImported(count);
    setTimeout(() => { onClose(); }, 1800);
  };

  const exampleText = `Diligence | Sự siêng năng
Eloquent | Có tài hùng biện
Resilient | Kiên cường, mau phục hồi`;

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
              <p className={styles.successDesc}>Đã thêm <strong>{imported}</strong> thẻ vào bộ bài</p>
            </div>
          ) : (
            <>
              {/* Deck selector */}
              {!deckId && (
                <div className={styles.deckSelect}>
                  <label className={styles.label}>Import vào bộ bài</label>
                  <select className={styles.select} value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
                    {allDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* Tabs */}
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`} onClick={() => setTab('text')}>
                  <FileText size={15} /> Nhập văn bản
                </button>
                <button className={`${styles.tab} ${tab === 'csv' ? styles.tabActive : ''}`} onClick={() => setTab('csv')}>
                  <Upload size={15} /> File CSV
                </button>
              </div>

              {/* Text import */}
              {tab === 'text' && (
                <div className={styles.textSection}>
                  <div className={styles.formatHint}>
                    <AlertCircle size={13} />
                    Mỗi dòng một thẻ. Ngăn cách mặt trước/sau bằng <code>|</code>, tab, hoặc <code>--</code>
                  </div>
                  <textarea
                    className={styles.bigTextarea}
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); setShowPreview(false); }}
                    placeholder={exampleText}
                    rows={10}
                    spellCheck={false}
                  />
                  <div className={styles.textActions}>
                    <button className={styles.btnGhost} onClick={() => setRawText(exampleText)}>Dùng mẫu</button>
                    <button className={styles.btnPreview} onClick={handleParseText} disabled={!rawText.trim()}>
                      <Eye size={14} /> Xem trước ({parseText(rawText).length} thẻ)
                    </button>
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
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
                    />
                    <div className={styles.dropIcon}>📂</div>
                    <div className={styles.dropTitle}>Kéo thả file CSV/TXT vào đây</div>
                    <div className={styles.dropSub}>hoặc nhấn để chọn file · Hỗ trợ .csv, .txt</div>
                  </div>
                  <div className={styles.formatHint}>
                    <AlertCircle size={13} />
                    Định dạng: <code>Mặt trước,Mặt sau</code> hoặc <code>Mặt trước | Mặt sau</code>
                  </div>
                </div>
              )}

              {/* Preview */}
              {showPreview && preview.length > 0 && (
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewTitle}>Xem trước · {preview.length} thẻ</span>
                    <button className={styles.btnGhost} onClick={() => setShowPreview(false)}>Ẩn</button>
                  </div>
                  <div className={styles.previewList}>
                    {preview.slice(0, 8).map((p, i) => (
                      <div key={i} className={styles.previewRow}>
                        <div className={styles.previewNum}>{i + 1}</div>
                        <div className={styles.previewFront}>{p.front}</div>
                        <ChevronRight size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                        <div className={styles.previewBack}>{p.back}</div>
                      </div>
                    ))}
                    {preview.length > 8 && (
                      <div className={styles.previewMore}>...và {preview.length - 8} thẻ nữa</div>
                    )}
                  </div>
                </div>
              )}

              {preview.length === 0 && showPreview && (
                <div className={styles.parseError}>
                  <AlertCircle size={16} /> Không thể đọc dữ liệu. Hãy kiểm tra lại định dạng.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {imported === null && (
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose}>Huỷ</button>
            <button
              className={styles.btnImport}
              onClick={handleImport}
              disabled={preview.length === 0 || !selectedDeckId}
            >
              <Check size={15} /> Import {preview.length > 0 ? `${preview.length} thẻ` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
