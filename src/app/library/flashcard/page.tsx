"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, Folder } from '@/lib/store';
import { toast } from '@/lib/toast';
import {
  Plus, Upload, MoreVertical, Edit2, Trash2, FolderInput,
  RefreshCcw, Folder as FolderIcon, LayoutGrid, MoreHorizontal,
} from 'lucide-react';
import EditDeckModal from '@/components/EditDeckModal';
import ImportModal from '@/components/ImportModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ConfirmModal from '@/components/ConfirmModal';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';

const EMOJIS = ['📁', '📘', '⚛️', '🌍', '💻', '🎨', '🧬', '🎵', '🧠', '💼', '🔬', '📐'];

export default function FlashcardLibrary() {
  const router = useRouter();

  // 'all' = show all (folders + uncategorized); null = show uncategorized only; string = folder id
  const [activeFolderId, setRawActiveFolderId] = useState<string | null | 'all'>('all');

  useEffect(() => {
    const handleState = () => {
      const params = new URLSearchParams(window.location.search);
      const f = params.get('folder');
      if (f === null) setRawActiveFolderId('all');
      else setRawActiveFolderId(f);
    };
    handleState();
    window.addEventListener('popstate', handleState);
    return () => window.removeEventListener('popstate', handleState);
  }, []);

  const setActiveFolderId = (id: string | null | 'all') => {
    setRawActiveFolderId(id);
    const url = new URL(window.location.href);
    if (id === 'all') {
      url.searchParams.delete('folder');
    } else if (id === null) {
      url.searchParams.set('folder', 'uncategorized');
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
  const [dragOverSidebarId, setDragOverSidebarId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📁' });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    decks, folders, isLoading, deleteDeck, refreshStats,
    moveDeckToFolder, addFolder, updateFolder, deleteFolder,
  } = useStore();

  const flashDecks = decks.filter(d => !d.type || d.type === 'FLASHCARD');
  const flashFolders = folders.filter(f => f.type === 'FLASHCARD' || !f.type);

  const getFolderHue = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 360;
  };

  // Which decks to show in the right panel
  const isAllView = activeFolderId === 'all';
  const isUncategorizedView = activeFolderId === null || activeFolderId === 'uncategorized';

  const visibleDecks = isAllView || isUncategorizedView
    ? flashDecks.filter((d: any) => !d.folderId)
    : flashDecks.filter((d: any) => d.folderId === activeFolderId);

  const visibleFolders = isAllView ? flashFolders : [];

  const activeFolder = isAllView ? null : flashFolders.find((f: any) => f.id === activeFolderId);

  // Deck count per folder for sidebar badge
  const countForFolder = (fid: string) => flashDecks.filter(d => d.folderId === fid).length;
  const uncategorizedCount = flashDecks.filter(d => !d.folderId).length;

  const formatNextDue = (ts: number | null) => {
    if (!ts) return null;
    const diff = ts - Date.now();
    if (diff <= 0) return 'Hiện có';
    
    const totalMinutes = Math.ceil(diff / (1000 * 60));
    if (totalMinutes < 60) return `${totalMinutes} phút nữa`;
    
    const hrs = Math.ceil(diff / (1000 * 60 * 60));
    if (hrs < 24) return `${hrs} giờ nữa`;
    
    const days = Math.ceil(hrs / 24);
    return `${days} ngày nữa`;
  };

  const totalCards = flashDecks.reduce((s, d) => s + (d._count?.cards ?? 0), 0);
  const dueTotal = flashDecks.reduce((s, d) => s + (d.dueCount ?? 0), 0);
  const masteredTotal = flashDecks.reduce((s, d) => s + (d.masteredCount ?? 0), 0);

  const nextReviewArray = flashDecks.map(d => d.nextDue).filter(Boolean) as number[];
  const earliestNextDue = nextReviewArray.length > 0 ? Math.min(...nextReviewArray) : null;
  const earliestNextDueLabel = formatNextDue(earliestNextDue);

  const confirmDelete = async () => {
    if (!deleteDeckId || isProcessing) return;
    setIsProcessing(true);
    try {
      if (deleteDeckId.startsWith('f_')) {
        const fid = deleteDeckId.replace('f_', '');
        await deleteFolder(fid);
        if (activeFolderId === fid) setActiveFolderId('all');
      } else {
        await deleteDeck(deleteDeckId);
      }
      setDeleteDeckId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReset = async (deckId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
      await refreshStats();
      toast.success('Đã làm mới tiến độ học tập');
      setResetDeckId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      if (editingFolder) {
        await updateFolder(editingFolder.id, folderForm);
      } else {
        const f = await addFolder(folderForm.name, folderForm.icon, 'FLASHCARD');
        if (f) setActiveFolderId(f.id); // auto-navigate to new folder
      }
      setIsFolderModalOpen(false);
      setFolderForm({ name: '', icon: '📁' });
      setEditingFolder(null);
    } finally {
      setIsProcessing(false);
    }
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

  const handleDragStart = (e: React.DragEvent, deckId: string) => {
    e.dataTransfer.setData('deckId', deckId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string | null | 'all') => {
    e.preventDefault();
    if (isProcessing) return;
    setDragOverFolderId(null);
    setDragOverSidebarId(null);
    const deckId = e.dataTransfer.getData('deckId');
    const targetId = folderId === 'all' ? null : folderId;
    
    // Find deck to check current folder
    const deck = flashDecks.find(d => d.id === deckId);
    const currentFolderId = deck?.folderId || null;

    if (deckId && targetId !== currentFolderId) {
      setIsProcessing(true);
      try {
        await moveDeckToFolder(deckId, targetId);
      } finally {
        setIsProcessing(false);
      }
    }
  };


  // ── Sidebar render ──────────────────────────────────────────────
  const sidebar = (
    <aside className={lib.fcSidebar}>
      <div className={lib.fcSidebarLogo}>
        <div className={lib.fcSidebarTitle}>📚 Flashcard</div>
        <div className={lib.fcSidebarSub}>{flashDecks.length} bộ · {totalCards} thẻ</div>
      </div>

      {/* "All decks" button */}
      <button
        className={`${lib.fcFolderBtn} ${activeFolderId === 'all' ? lib.fcFolderBtnActive : ''} ${dragOverSidebarId === 'all' ? lib.fcFolderBtnDragOver : ''}`}
        onClick={() => setActiveFolderId('all')}
        onDragOver={(e) => { e.preventDefault(); setDragOverSidebarId('all'); }}
        onDragLeave={() => setDragOverSidebarId(null)}
        onDrop={(e) => { handleDropOnFolder(e, 'all'); setDragOverSidebarId(null); }}
      >
        <LayoutGrid size={15} /> Tất cả
        <span className={lib.fcFolderBtnCount}>{flashFolders.length + flashDecks.filter(d => !d.folderId).length}</span>
      </button>

      {/* Folder list */}
      {flashFolders.map(f => {
        const fMenuOpen = menuOpenId === `f_${f.id}`;
        return (
          <div key={f.id} style={{ position: 'relative' }}>
            <button
              className={`${lib.fcFolderBtn} ${activeFolderId === f.id ? lib.fcFolderBtnActive : ''} ${dragOverSidebarId === f.id ? lib.fcFolderBtnDragOver : ''}`}
              onClick={() => setActiveFolderId(f.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverSidebarId(f.id); }}
              onDragLeave={() => setDragOverSidebarId(null)}
              onDrop={(e) => { handleDropOnFolder(e, f.id); setDragOverSidebarId(null); }}
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
    const nextDueLabel = formatNextDue(deck.nextDue);

    const onRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Học ngay', icon: <Plus size={14} />, onClick: () => router.push(`/flashcard/${deck.id}`) },
          { label: 'Chỉnh sửa', icon: <Edit2 size={14} />, onClick: () => setEditDeck(deck.id) },
          { label: 'Chuyển thư mục', icon: <FolderInput size={14} />, onClick: () => setMoveDeckId(deck.id) },
          { divider: true, label: '', onClick: () => { } },
          { label: 'Làm mới tiến độ', icon: <RefreshCcw size={14} />, onClick: () => setResetDeckId(deck.id) },
          { label: 'Xoá bộ bài', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => setDeleteDeckId(deck.id) },
        ]
      });
    };

    return (
      <div
        key={deck.id}
        className={lib.fcCardWrap}
        style={{ 
          '--deck-color': deckColor, 
          zIndex: isMenuOpen ? 500 : undefined,
          transform: isMenuOpen ? 'none' : undefined
        } as React.CSSProperties}
        onClick={() => router.push(`/flashcard/${deck.id}`)}
        onContextMenu={onRightClick}
        draggable
        onDragStart={(e) => handleDragStart(e, deck.id)}
      >
        <div className={lib.fcCardStack2} />
        <div className={lib.fcCardStack1} />
        <div className={lib.fcCard}>
          <div className={lib.fcCardIndicator} />

          {due > 0 ? (
            <div className={`${lib.fcDueBadge} ${lib.pulse}`}>🔥 {due} CẦN ÔN</div>
          ) : nextDueLabel ? (
            <div className={lib.fcNextDueBadge}>⏳ Ôn tập: {nextDueLabel}</div>
          ) : null}

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

  return (
    <div 
      className={lib.libraryPage} 
      onClick={() => setMenuOpenId(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Tạo bộ thẻ mới', icon: <Plus size={14}/>, onClick: () => setEditDeck('new') },
            { label: 'Thêm thư mục mới', icon: <Plus size={14}/>, divider: true, onClick: () => { setEditingFolder(null); setFolderForm({ name: '', icon: '📁' }); setIsFolderModalOpen(true); } },
            { label: 'Làm mới thư viện', icon: <RefreshCcw size={14}/>, onClick: () => { refreshStats(); toast.success('Đã làm mới thư viện'); } },
          ]
        });
      }}
    >
      <div className={lib.fcLayout}>
        {sidebar}
        
        {/* RIGHT PANEL */}
        <div className={lib.fcPanel}>
          {/* Panel header */}
          <div className={lib.fcPanelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {activeFolderId !== 'all' && (
                <button className={lib.btnBack} onClick={() => setActiveFolderId('all')}>
                  <LayoutGrid size={18} />
                </button>
              )}
              <div>
                <div className={lib.fcPanelTitle}>
                  {isAllView ? 'Tất cả bộ thẻ' : isUncategorizedView ? '🗂️ Chưa phân loại' : `${activeFolder?.icon} ${activeFolder?.name}`}
                </div>
                <div className={lib.fcPanelMeta}>{visibleDecks.length + visibleFolders.length} mục dữ liệu</div>
              </div>
            </div>
            <div className={lib.fcPanelActions}>
              <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
                <Plus size={16} /> Tạo bộ thẻ
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className={lib.fcPanelBody}>
            {/* Compact Stats row */}
            {isAllView && flashDecks.length > 0 && (
              <div className={lib.fcStats} style={{ marginBottom: '1rem', gap: '1rem' }}>
                <div className={lib.fcStatItem} style={{ padding: '0.5rem 1rem', minWidth: 'auto' }}>
                  <div className={lib.fcStatVal} style={{ fontSize: '1.1rem' }}>{dueTotal}</div>
                  <div className={lib.fcStatLbl} style={{ fontSize: '0.6rem' }}>Cần ôn</div>
                </div>
                <div className={lib.fcStatItem} style={{ padding: '0.5rem 1rem', minWidth: 'auto' }}>
                  <div className={lib.fcStatVal} style={{ fontSize: '1.1rem' }}>{totalCards}</div>
                  <div className={lib.fcStatLbl} style={{ fontSize: '0.6rem' }}>Tổng thẻ</div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className={loadingStyles.skeletonGrid} style={{ marginTop: '1rem' }}>
                <div className={loadingStyles.skeletonCard} /><div className={loadingStyles.skeletonCard} />
                <div className={loadingStyles.skeletonCard} /><div className={loadingStyles.skeletonCard} />
              </div>
            ) : visibleDecks.length === 0 && visibleFolders.length === 0 ? (
              <div className={lib.emptyState}>
                <div className={lib.emptyIcon}>{isAllView ? '📭' : '📂'}</div>
                <div className={lib.emptyTitle}>{isAllView ? 'Chưa có dữ liệu' : 'Thư mục trống'}</div>
                <div className={lib.emptySub}>{isAllView ? 'Tạo thư mục hoặc bộ thẻ đầu tiên để bắt đầu.' : 'Tạo bộ thẻ mới hoặc di chuyển bộ thẻ vào đây.'}</div>
                <button className={lib.btnCreate} onClick={() => setEditDeck('new')}><Plus size={15} /> Tạo bộ thẻ</button>
              </div>
            ) : (
              <div className={lib.fcGrid}>
                {visibleFolders.map((f: any) => {
                  const deckCount = flashDecks.filter((d: any) => d.folderId === f.id).length;
                  const fMenuId = `fg_${f.id}`;
                  const fMenuOpen = menuOpenId === fMenuId;
                  return (
                    <div
                      key={`folder_${f.id}`}
                      className={`${lib.fcFolderCard} ${dragOverFolderId === f.id ? lib.fcFolderCardDragOver : ''}`}
                      onClick={() => setActiveFolderId(f.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(f.id); }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => handleDropOnFolder(e, f.id)}
                      style={{ '--folder-hue': getFolderHue(f.id) } as any}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setContextMenu({
                          x: e.clientX, y: e.clientY,
                          items: [
                            { label: 'Mở thư mục', icon: <Plus size={14} />, onClick: () => setActiveFolderId(f.id) },
                            { label: 'Đổi tên/icon', icon: <Edit2 size={14} />, onClick: () => { setEditingFolder(f); setFolderForm({ name: f.name, icon: f.icon }); setIsFolderModalOpen(true); } },
                            { divider: true, label: '', onClick: () => {} },
                            { label: 'Xóa thư mục', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => setDeleteDeckId(`f_${f.id}`) },
                          ]
                        });
                      }}
                    >
                      <div className={lib.fcFolderIcon}>{f.icon}</div>
                      <div className={lib.fcFolderName}>{f.name}</div>
                      <div className={lib.fcFolderCount}>{deckCount} bộ thẻ</div>
                      <div className={lib.kebabWrap} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: fMenuOpen ? 9999 : 20 }} onClick={e => e.stopPropagation()}>
                        <button className={lib.kebabBtn} onClick={() => setMenuOpenId(fMenuOpen ? null : fMenuId)}><MoreHorizontal size={16} /></button>
                        {fMenuOpen && (
                          <div className={lib.menuDropdown} style={{ right: 0 }}>
                            <button className={lib.menuItem} onClick={() => { setActiveFolderId(f.id); setMenuOpenId(null); }}><LayoutGrid size={13} /> Mở thư mục</button>
                            <button className={lib.menuItem} onClick={() => { setEditingFolder(f); setFolderForm({ name: f.name, icon: f.icon }); setIsFolderModalOpen(true); setMenuOpenId(null); }}><Edit2 size={13} /> Đổi tên</button>
                            <div className={lib.menuDivider} /><button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(`f_${f.id}`); setMenuOpenId(null); }}><Trash2 size={13} /> Xóa</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {visibleDecks.map(renderCard)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isFolderModalOpen && (
        <div className={lib.modalOverlay} onClick={() => setIsFolderModalOpen(false)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>{editingFolder ? 'Sửa thư mục' : 'Tạo thư mục mới'}</div>
            <div className={lib.emojiPicker}>{EMOJIS.map(icon => (<button key={icon} className={`${lib.emojiBtn} ${folderForm.icon === icon ? lib.emojiActive : ''}`} onClick={() => setFolderForm(p => ({ ...p, icon }))}>{icon}</button>))}</div>
            <input autoFocus className={lib.modalInput} placeholder="Tên thư mục..." value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value.slice(0, 60) })} onKeyDown={e => e.key === 'Enter' && handleSaveFolder()} />
            <div className={lib.modalActions}>
              <button className={lib.modalCancel} onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); }} disabled={isProcessing}>Hủy</button>
              <button className={lib.modalSave} onClick={handleSaveFolder} disabled={!folderForm.name.trim() || isProcessing}>
                {isProcessing ? 'Đang lưu...' : (editingFolder ? 'Lưu' : 'Tạo')}
              </button>
            </div>
          </div>
        </div>
      )}
      {moveDeckId && (
        <div className={lib.modalOverlay} onClick={() => !isProcessing && setMoveDeckId(null)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>Chuyển tới thư mục</div>
            <div className={lib.moveFolderList}>
              {/* Only show 'Remove from folder' if it's currently IN a folder */}
              {flashDecks.find(d => d.id === moveDeckId)?.folderId && (
                <div className={lib.moveFolderItem} onClick={async () => { 
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await moveDeckToFolder(moveDeckId!, null); 
                    setMoveDeckId(null); 
                  } finally {
                    setIsProcessing(false);
                  }
                }}>🗂️ Bỏ khỏi thư mục (ngoài)</div>
              )}

              {flashFolders
                .filter(f => f.id !== flashDecks.find(d => d.id === moveDeckId)?.folderId)
                .map(f => (
                  <div key={f.id} className={lib.moveFolderItem} onClick={async () => { 
                    if (isProcessing) return;
                    setIsProcessing(true);
                    try {
                      await moveDeckToFolder(moveDeckId!, f.id); 
                      setMoveDeckId(null);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}>
                    {f.icon} {f.name}
                  </div>
                ))}
            </div>
            <button className={lib.modalCancel} style={{ width: '100%' }} onClick={() => setMoveDeckId(null)} disabled={isProcessing}>Hủy</button>
          </div>
        </div>
      )}
      {editDeck && <EditDeckModal deckId={editDeck === 'new' ? null : editDeck} mode="flashcard" onClose={() => setEditDeck(null)} />}
      {importOpen && <ImportModal deckId={null} allDecks={flashDecks} onClose={() => setImportOpen(false)} />}
      <DeleteConfirmModal isOpen={!!deleteDeckId} deckName={deleteName} isLoading={isProcessing} onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} />
      <ConfirmModal
        isOpen={!!resetDeckId}
        title="Làm mới tiến độ?"
        message="Toàn bộ tiến độ học tập của bộ thẻ này sẽ bị xoá và quay về trạng thái Thẻ mới (0%)."
        confirmLabel="Làm mới"
        variant="warning"
        isLoading={isProcessing}
        onConfirm={() => confirmReset(resetDeckId!)}
        onCancel={() => setResetDeckId(null)}
      />

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
