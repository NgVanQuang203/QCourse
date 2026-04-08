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

function parseJSON(raw: string): ParsedPair[] | null {
  try {
    const data = JSON.parse(raw);
    const pairs: ParsedPair[] = [];
    if (Array.isArray(data)) {
      data.forEach(item => {
        const keys = Object.keys(item);
        if (keys.length >= 2) {
          const vals = Object.values(item).filter(v => typeof v === 'string') as string[];
          if (vals.length >= 2) {
            pairs.push({ front: vals[0].trim(), back: vals[1].trim() });
          } else if (item.front && item.back) {
             pairs.push({ front: String(item.front).trim(), back: String(item.back).trim() });
          } else if (item.q && item.a) {
             pairs.push({ front: String(item.q).trim(), back: String(item.a).trim() });
          }
        }
      });
    } else if (typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string') {
          pairs.push({ front: key.trim(), back: val.trim() });
        }
      }
    }
    return pairs.length > 0 ? pairs : null;
  } catch (e) {
    return null;
  }
}

export default function ImportModal({ deckId, allDecks, onClose }: Props) {
  const { importCards } = useStore();
  const [tab, setTab] = useState<'text' | 'csv' | 'json'>('text');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId ?? allDecks[0]?.id ?? '');
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedPair[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParseText = () => {
    let pairs = parseJSON(rawText);
    if (!pairs) pairs = parseText(rawText);
    setPreview(pairs);
    setShowPreview(true);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      let pairs = parseJSON(text);
      if (!pairs) pairs = parseText(text);
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

  const handleImport = async () => {
    if (!selectedDeckId || preview.length === 0) return;
    const count = await importCards(selectedDeckId, preview);
    setImported(count);
    setTimeout(() => { onClose(); }, 1800);
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
                  <Upload size={15} /> File
                </button>
                <button className={`${styles.tab} ${tab === 'json' ? styles.tabActive : ''}`} onClick={() => setTab('json')}>
                  <FileText size={15} /> Phân tích JSON
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

              {/* JSON import */}
              {tab === 'json' && (
                <div className={styles.textSection}>
                  <div className={styles.formatHint}>
                    <AlertCircle size={13} />
                    Dán mảng hoặc object JSON trực tiếp vào đây!
                  </div>
                  <textarea
                    className={styles.bigTextarea}
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); setShowPreview(false); }}
                    placeholder={EXAMPLE_JSON}
                    rows={10}
                    spellCheck={false}
                  />
                  <div className={styles.textActions}>
                    <button className={styles.btnGhost} onClick={() => setRawText(EXAMPLE_JSON)}>Dùng mẫu JSON</button>
                    <button className={styles.btnPreview} onClick={handleParseText} disabled={!rawText.trim()}>
                      <Eye size={14} /> Xem trước
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
                      accept=".csv,.txt,.json"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
                    />
                    <div className={styles.dropIcon}>📂</div>
                    <div className={styles.dropTitle}>Kéo thả file CSV, TXT, JSON vào đây</div>
                    <div className={styles.dropSub}>hoặc nhấn để chọn file · Hỗ trợ nhiều định dạng</div>
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
