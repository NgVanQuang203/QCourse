"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { useStore, Folder } from '@/lib/store';
import {
  Plus, Upload, MoreVertical, Edit2, Trash2, FolderInput,
  RefreshCcw, Folder as FolderIcon, LayoutGrid,
} from 'lucide-react';
import EditDeckModal from '@/components/EditDeckModal';
import ImportModal from '@/components/ImportModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ConfirmModal from '@/components/ConfirmModal';

const EMOJIS = ['📁', '📘', '⚛️', '🌍', '💻', '🎨', '🧬', '🎵', '🧠', '💼', '🔬', '📐'];

export default function FlashcardLibrary() {
  const router = useRouter();

  // null = show individual uncategorized decks; 'all' = show folders; string = show decks in folder
  const [activeFolderId, setRawActiveFolderId] = useState<string | null | 'all'>('all');
  
  useEffect(() => {
    const handleState = () => {
      const params = new URLSearchParams(window.location.search);
      const f = params.get('folder');
      setRawActiveFolderId(f || 'all');
    };
    handleState(); // Initial load
    window.addEventListener('popstate', handleState);
    return () => window.removeEventListener('popstate', handleState);
  }, []);

  const setActiveFolderId = (id: string | null | 'all') => {
    setRawActiveFolderId(id);
    const url = new URL(window.location.href);
    if (id === 'all' || id === null) {
      url.searchParams.delete('folder');
    } else {
      url.searchParams.set('folder', id);
    }
    window.history.pushState({}, '', url.toString());
  };
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editDeck, setEditDeck] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [resetDeckId, setResetDeckId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📁' });

  const {
    decks, folders, isLoading, deleteDeck, refreshStats,
    moveDeckToFolder, addFolder, updateFolder, deleteFolder,
  } = useStore();

  const flashDecks = decks.filter(d => !d.type || d.type === 'FLASHCARD');
  const flashFolders = folders.filter(f => f.type === 'FLASHCARD' || !f.type);

  // Which decks to show in the right panel
  const isAllView = activeFolderId === 'all';
  const visibleDecks = isAllView
    ? flashDecks.filter((d: any) => !d.folderId)
    : flashDecks.filter((d: any) => d.folderId === activeFolderId);

  const visibleFolders = isAllView ? flashFolders : [];

  const activeFolder = isAllView ? null : flashFolders.find((f: any) => f.id === activeFolderId);

  // Deck count per folder for sidebar badge
  const countForFolder = (fid: string) => flashDecks.filter(d => d.folderId === fid).length;
  const uncategorizedCount = flashDecks.filter(d => !d.folderId).length;

  const totalCards = flashDecks.reduce((s, d) => s + (d._count?.cards ?? 0), 0);
  const dueTotal = flashDecks.reduce((s, d) => s + (d.dueCount ?? 0), 0);
  const masteredTotal = flashDecks.reduce((s, d) => s + (d.masteredCount ?? 0), 0);

  const confirmDelete = async () => {
    if (!deleteDeckId) return;
    if (deleteDeckId.startsWith('f_')) {
      const fid = deleteDeckId.replace('f_', '');
      await deleteFolder(fid);
      if (activeFolderId === fid) setActiveFolderId('all');
    } else {
      await deleteDeck(deleteDeckId);
    }
    setDeleteDeckId(null);
  };

  const confirmReset = async (deckId: string) => {
    await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
    await refreshStats();
    setResetDeckId(null);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, folderForm);
    } else {
      const f = await addFolder(folderForm.name, folderForm.icon, 'FLASHCARD');
      if (f) setActiveFolderId(f.id); // auto-navigate to new folder
    }
    setIsFolderModalOpen(false);
    setFolderForm({ name: '', icon: '📁' });
    setEditingFolder(null);
  };

  const openEditFolder = (e: React.MouseEvent, f: Folder) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingFolder(f);
    setFolderForm({ name: f.name, icon: f.icon });
    setIsFolderModalOpen(true);
  };

  const deleteName = deleteDeckId
    ? deleteDeckId.startsWith('f_')
      ? flashFolders.find(f => f.id === deleteDeckId.replace('f_', ''))?.name ?? 'Thư mục này'
      : flashDecks.find(d => d.id === deleteDeckId)?.name ?? 'Bộ bài này'
    : '';

  // Remove early return, handle loading inside panel

  // ── Sidebar render ──────────────────────────────────────────────
  const sidebar = (
    <aside className={lib.fcSidebar}>
      <div className={lib.fcSidebarLogo}>
        <div className={lib.fcSidebarTitle}>📚 Flashcard</div>
        <div className={lib.fcSidebarSub}>{flashDecks.length} bộ · {totalCards} thẻ</div>
      </div>

      {/* "All decks" button */}
      <button
        className={`${lib.fcFolderBtn} ${activeFolderId === 'all' ? lib.fcFolderBtnActive : ''}`}
        onClick={() => setActiveFolderId('all')}
      >
        <LayoutGrid size={15} /> Tất cả
        <span className={lib.fcFolderBtnCount}>{flashDecks.length}</span>
      </button>

      {/* Folder list */}
      {flashFolders.map(f => {
        const fMenuOpen = menuOpenId === `f_${f.id}`;
        return (
          <div key={f.id} style={{ position: 'relative' }}>
            <button
              className={`${lib.fcFolderBtn} ${activeFolderId === f.id ? lib.fcFolderBtnActive : ''}`}
              onClick={() => setActiveFolderId(f.id)}
              style={{ paddingRight: '2.6rem' }}
            >
              {f.icon} {f.name}
              <span className={lib.fcFolderBtnCount}>{countForFolder(f.id)}</span>
            </button>
            {/* Folder kebab */}
            <div
              style={{
                position: 'absolute', right: '0.4rem', top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                zIndex: fMenuOpen ? 9999 : 20,
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className={lib.kebabBtn}
                onClick={() => setMenuOpenId(fMenuOpen ? null : `f_${f.id}`)}
              >
                <MoreVertical size={14} />
              </button>
              {fMenuOpen && (
                <div className={lib.menuDropdown}>
                  <button className={lib.menuItem} onClick={e => openEditFolder(e, f)}>
                    <Edit2 size={13} /> Sửa thư mục
                  </button>
                  <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(`f_${f.id}`); setMenuOpenId(null); }}>
                    <Trash2 size={13} /> Xóa thư mục
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Uncategorized if there are any */}
      {uncategorizedCount > 0 && (
        <button
          className={`${lib.fcFolderBtn} ${activeFolderId === null ? lib.fcFolderBtnActive : ''}`}
          onClick={() => setActiveFolderId(null)}
        >
          🗂️ Chưa phân loại
          <span className={lib.fcFolderBtnCount}>{uncategorizedCount}</span>
        </button>
      )}

      <div className={lib.fcSidebarSep} />

      <button
        className={lib.fcAddFolderBtn}
        onClick={() => { setEditingFolder(null); setFolderForm({ name: '', icon: '📁' }); setIsFolderModalOpen(true); }}
      >
        + Thư mục mới
      </button>
    </aside>
  );

  // ── Render deck card ─────────────────────────────────────────────
  const renderCard = (deck: any) => {
    const total = deck._count?.cards ?? 0;
    const due = deck.dueCount ?? 0;
    const mastered = deck.masteredCount ?? 0;
    const learning = deck.learningCount ?? 0;
    const newCount = total - mastered - learning;
    const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const learningPct = total > 0 ? Math.round((learning / total) * 100) : 0;
    const isMenuOpen = menuOpenId === deck.id;
    const deckColor = deck.color?.startsWith('linear') ? 'var(--primary)' : (deck.color || 'var(--primary)');

    return (
      <div
        key={deck.id}
        className={lib.fcCardWrap}
        style={{ '--deck-color': deckColor } as React.CSSProperties}
        onClick={() => router.push(`/flashcard/${deck.id}`)}
      >
        <div className={lib.fcCardStack2} />
        <div className={lib.fcCardStack1} />
        <div className={lib.fcCard}>
          <div className={lib.fcCardIndicator} />

          {due > 0 && <div className={lib.fcDueBadge}>🔥 {due} CẦN ÔN</div>}

          <div className={lib.fcCardBody}>
            <div className={lib.fcIconBubble}>🃏</div>
            <div className={lib.fcCardTitle}>{deck.name}</div>
            <div className={lib.fcCardDesc}>{deck.description || 'Chưa có mô tả'}</div>
          </div>

          {/* Stacked 3-level progress bar */}
          <div className={lib.fcProgressWrap}>
            <div className={lib.fcProgressBar}>
              {mastered > 0 && <div className={lib.fcProgressMastered} style={{ width: `${masteredPct}%` }} />}
              {learning > 0 && <div className={lib.fcProgressLearning} style={{ width: `${learningPct}%` }} />}
            </div>
            <div className={lib.fcProgressLegend}>
              <span className={lib.fcProgressLegendItem} style={{ color: 'var(--success)' }}>✦ {mastered} thuộc</span>
              <span className={lib.fcProgressLegendItem} style={{ color: 'var(--warning)' }}>◑ {learning} học</span>
              <span className={lib.fcProgressLegendItem} style={{ opacity: 0.45 }}>○ {newCount} mới</span>
            </div>
          </div>

          <div className={lib.fcCardFooter}>
            <div className={lib.fcCardPill} style={{ color: masteredPct >= 100 ? 'var(--success)' : masteredPct > 0 ? 'var(--primary)' : 'var(--foreground)' }}>
              {masteredPct}% HOÀN THÀNH
            </div>
            
            <div className={lib.fcCardCount}>
              {total} thẻ
            </div>

          {/* Kebab — relative position in footer row */}
          <div
            className={lib.kebabWrap}
            onClick={e => e.stopPropagation()}
            style={{ zIndex: isMenuOpen ? 9999 : undefined }}
          >
            <button
              className={lib.kebabBtn}
              onClick={() => setMenuOpenId(isMenuOpen ? null : deck.id)}
              title="Tùy chọn"
            >
              <MoreVertical size={15} />
            </button>
            {isMenuOpen && (
              <div className={lib.menuDropdown} style={{ bottom: 'calc(100% + 6px)', top: 'auto' }}>
                <button className={lib.menuItem} onClick={() => { setEditDeck(deck.id); setMenuOpenId(null); }}>
                  <Edit2 size={13} /> Chỉnh sửa
                </button>
                <button className={lib.menuItem} onClick={() => { setMoveDeckId(deck.id); setMenuOpenId(null); }}>
                  <FolderInput size={13} /> Chuyển thư mục
                </button>
                <div className={lib.menuDivider} />
                <button className={lib.menuItem} onClick={() => { setResetDeckId(deck.id); setMenuOpenId(null); }}>
                  <RefreshCcw size={13} /> Làm mới tiến độ
                </button>
                <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(deck.id); setMenuOpenId(null); }}>
                  <Trash2 size={13} /> Xóa bộ bài
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Right panel ──────────────────────────────────────────────────
  const panelTitle = activeFolderId === 'all'
    ? 'Tất cả bộ thẻ'
    : activeFolderId === null
      ? '🗂️ Chưa phân loại'
      : `${activeFolder?.icon} ${activeFolder?.name}`;

  const panel = (
    <div className={lib.fcPanel}>
      {/* Panel header */}
      <div className={lib.fcPanelHeader}>
        <div>
          <div className={lib.fcPanelTitle}>{panelTitle}</div>
          <div className={lib.fcPanelMeta}>{visibleDecks.length} bộ thẻ</div>
        </div>
        <div className={lib.fcPanelActions}>
          <button className={lib.btnImport} onClick={() => setImportOpen(true)}>
            <Upload size={15} /> Nhập
          </button>
          <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
            <Plus size={15} /> Tạo
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className={lib.fcPanelBody}>
        {/* Stats — only show at "All" view */}
        {activeFolderId === 'all' && flashDecks.length > 0 && (
          <div className={lib.fcStats}>
            <div className={lib.fcStatItem}>
              <div className={lib.fcStatVal}>{flashDecks.length}</div>
              <div className={lib.fcStatLbl}>Bộ thẻ</div>
            </div>
            <div className={lib.fcStatItem}>
              <div className={lib.fcStatVal}>{totalCards}</div>
              <div className={lib.fcStatLbl}>Tổng thẻ</div>
            </div>
            <div className={lib.fcStatItem}>
              <div className={lib.fcStatVal} style={{ color: dueTotal > 0 ? '#ef4444' : undefined }}>{dueTotal}</div>
              <div className={lib.fcStatLbl}>Cần ôn</div>
            </div>
            <div className={lib.fcStatItem}>
              <div className={lib.fcStatVal} style={{ color: '#10b981' }}>{masteredTotal}</div>
              <div className={lib.fcStatLbl}>Đã thuộc</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className={loadingStyles.skeletonGrid} style={{ marginTop: '1rem' }}>
            <div className={loadingStyles.skeletonCard} />
            <div className={loadingStyles.skeletonCard} />
            <div className={loadingStyles.skeletonCard} />
            <div className={loadingStyles.skeletonCard} />
          </div>
        ) : visibleDecks.length === 0 && visibleFolders.length === 0 ? (
          <div className={lib.emptyState}>
            <div className={lib.emptyIcon}>{isAllView ? '📭' : '📂'}</div>
            <div className={lib.emptyTitle}>{isAllView ? 'Chưa có dữ liệu' : 'Thư mục trống'}</div>
            <div className={lib.emptySub}>
              {isAllView
                ? 'Tạo thư mục hoặc bộ thẻ đầu tiên để bắt đầu.'
                : 'Tạo bộ thẻ mới vào thư mục này, hoặc di chuyển bộ thẻ có sẵn vào đây.'}
            </div>
            <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
              <Plus size={15} /> Tạo bộ thẻ
            </button>
          </div>
        ) : (
          <div className={lib.fcGrid}>
            {/* Render folders first in ALL view */}
            {visibleFolders.map((f: any) => {
               const deckCount = flashDecks.filter((d: any) => d.folderId === f.id).length;
               return (
                 <div key={`folder_${f.id}`} className={lib.fcFolderCard} onClick={() => setActiveFolderId(f.id)}>
                   <div className={lib.fcFolderIcon}>{f.icon}</div>
                   <div className={lib.fcFolderName}>{f.name}</div>
                   <div className={lib.fcFolderCount}>{deckCount} bộ thẻ</div>
                 </div>
               );
            })}
            
            {/* Then render visible decks */}
            {visibleDecks.map(renderCard)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={lib.libraryPage} onClick={() => setMenuOpenId(null)}>
      <div className={lib.fcLayout}>
        {sidebar}
        {panel}
      </div>

      {/* ── MODALS ── */}
      {isFolderModalOpen && (
        <div className={lib.modalOverlay} onClick={() => setIsFolderModalOpen(false)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>{editingFolder ? 'Sửa thư mục' : 'Tạo thư mục mới'}</div>
            <div className={lib.emojiPicker}>
              {EMOJIS.map(icon => (
                <button key={icon} className={`${lib.emojiBtn} ${folderForm.icon === icon ? lib.emojiActive : ''}`} onClick={() => setFolderForm(p => ({ ...p, icon }))}>
                  {icon}
                </button>
              ))}
            </div>
            <input
              autoFocus className={lib.modalInput} placeholder="Tên thư mục (VD: Tiếng Anh, Toán học…)"
              value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value.slice(0, 60) })}
              onKeyDown={e => e.key === 'Enter' && handleSaveFolder()}
            />
            <div className={lib.modalActions}>
              <button className={lib.modalCancel} onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); }}>Hủy</button>
              <button className={lib.modalSave} onClick={handleSaveFolder} disabled={!folderForm.name.trim()}>
                {editingFolder ? 'Lưu thay đổi' : 'Tạo thư mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveDeckId && (
        <div className={lib.modalOverlay} onClick={() => setMoveDeckId(null)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>Chuyển tới thư mục</div>
            <div className={lib.moveFolderList}>
              <div className={lib.moveFolderItem} onClick={() => { moveDeckToFolder(moveDeckId!, null); setMoveDeckId(null); }}>
                🗂️ Bỏ khỏi thư mục (ngoài)
              </div>
              {flashFolders.map(f => (
                <div key={f.id} className={lib.moveFolderItem} onClick={() => { moveDeckToFolder(moveDeckId!, f.id); setMoveDeckId(null); }}>
                  {f.icon} {f.name}
                </div>
              ))}
            </div>
            <button className={lib.modalCancel} style={{ width: '100%' }} onClick={() => setMoveDeckId(null)}>Hủy</button>
          </div>
        </div>
      )}

      {editDeck && (
        <EditDeckModal
          deckId={editDeck === 'new' ? null : editDeck}
          mode="flashcard"
          onClose={() => setEditDeck(null)}
        />
      )}
      {importOpen && <ImportModal deckId={null} allDecks={flashDecks} onClose={() => setImportOpen(false)} />}
      <DeleteConfirmModal isOpen={!!deleteDeckId} deckName={deleteName} onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} />
      <ConfirmModal
        isOpen={!!resetDeckId}
        title="Làm mới tiến độ?"
        message="Toàn bộ tiến độ học tập của bộ thẻ này sẽ bị xoá và quay về trạng thái Thẻ mới (0%)."
        confirmLabel="Làm mới"
        variant="warning"
        onConfirm={() => confirmReset(resetDeckId!)}
        onCancel={() => setResetDeckId(null)}
      />
    </div>
  );
}
