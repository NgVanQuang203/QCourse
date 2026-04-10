"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, Folder } from '@/lib/store';
import { toast } from '@/lib/toast';
import { Plus, MoreVertical, Edit2, Trash2, FolderInput, RefreshCcw, ChevronRight, Copy, MoreHorizontal, FolderPlus, LayoutGrid } from 'lucide-react';
import EditQuizModal from '@/components/EditQuizModal';
import ImportQuizModal from '@/components/ImportQuizModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ConfirmModal from '@/components/ConfirmModal';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';

const EMOJIS = ['📝', '📘', '⚛️', '🌍', '💻', '🏛️', '🧬', '🎵', '🏆', '💼', '🔬', '📐'];

export default function QuizLibrary() {
  const router = useRouter();

  // 'all' = show all; null = show uncategorized; string = show decks in that folder
  const [currentFolderId, setRawCurrentFolderId] = useState<string | null>('all');

  useEffect(() => {
    const handleState = () => {
      const params = new URLSearchParams(window.location.search);
      const f = params.get('folder');
      setRawCurrentFolderId(f || 'all');
    };
    handleState(); // Initial load
    window.addEventListener('popstate', handleState);
    return () => window.removeEventListener('popstate', handleState);
  }, []);

  const setCurrentFolderId = (id: string | null) => {
    setRawCurrentFolderId(id);
    const url = new URL(window.location.href);
    if (id === null) {
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dragOverSidebarId, setDragOverSidebarId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📝' });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    decks, folders, isLoading, deleteDeck, refreshStats,
    moveDeckToFolder, addFolder, updateFolder, deleteFolder,
    addDeck, fetchDeckCards, importCards,
  } = useStore();

  const getFolderHue = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 360;
  };

  const quizDecks = decks.filter((d: any) => d.type === 'QUIZ');
  const quizFolders = folders.filter((f: any) => f.type === 'QUIZ');

  const isAllView = currentFolderId === 'all';
  const isUncategorizedView = currentFolderId === null;
  
  const visibleDecks = isAllView
    ? quizDecks.filter((d: any) => !d.folderId)
    : isUncategorizedView
    ? quizDecks.filter((d: any) => !d.folderId)
    : quizDecks.filter((d: any) => d.folderId === currentFolderId);

  const visibleFolders = isAllView ? quizFolders : [];
  const activeFolder = quizFolders.find((f: any) => f.id === currentFolderId);

  const confirmDelete = async () => {
    if (!deleteDeckId || isProcessing) return;
    setIsProcessing(true);
    try {
      if (deleteDeckId.startsWith('f_')) {
        const fid = deleteDeckId.replace('f_', '');
        await deleteFolder(fid);
        if (currentFolderId === fid) setCurrentFolderId('all');
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
      toast.success('Đã làm mới lịch sử thi');
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
        await addFolder(folderForm.name, folderForm.icon, 'QUIZ');
      }
      setIsFolderModalOpen(false);
      setFolderForm({ name: '', icon: '📝' });
      setEditingFolder(null);
    } finally {
      setIsProcessing(false);
    }
  };

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
    const targetFolderId = folderId === 'all' ? null : folderId;

    if (deckId) {
      const deck = quizDecks.find(d => d.id === deckId);
      if (deck && deck.folderId !== targetFolderId) {
        setIsProcessing(true);
        try {
          await moveDeckToFolder(deckId, targetFolderId);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  const copyQuizLink = (deckId: string) => {
    const url = `${window.location.origin}/quiz/${deckId}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép liên kết');
  };

  const duplicateQuiz = async (quizId: string) => {
    const quiz = quizDecks.find(d => d.id === quizId);
    if (!quiz || isProcessing) return;

    setIsProcessing(true);
    try {
      const newDeckId = await addDeck({
        name: `${quiz.name} (Bản sao)`,
        description: quiz.description,
        color: quiz.color,
        type: 'QUIZ',
        folderId: quiz.folderId,
      });

      if (newDeckId) {
        const cards = await fetchDeckCards(quizId);
        if (cards && cards.length > 0) {
          await importCards(newDeckId, cards);
        }
        toast.success('Đã nhân bản đề thi');
      }
    } catch (err) {
      toast.error('Không thể nhân bản');
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
      ? quizFolders.find(f => f.id === deleteDeckId.replace('f_', ''))?.name ?? 'Danh mục này'
      : quizDecks.find(d => d.id === deleteDeckId)?.name ?? 'Đề thi này'
    : '';

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
            { label: 'Tạo đề thi mới', icon: <Plus size={14} />, onClick: () => setEditDeck('new') },
            { label: 'Thêm danh mục mới', icon: <Plus size={14} />, divider: true, onClick: () => { setEditingFolder(null); setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true); } },
            { label: 'Làm mới thư viện', icon: <RefreshCcw size={14} />, onClick: () => refreshStats() },
          ]
        });
      }}
    >
      <div className={lib.quizLayout}>
        {/* ── SIDEBAR ── */}
        <aside className={lib.quizSidebar} onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
              { label: 'Thêm danh mục', icon: <FolderPlus size={14}/>, onClick: () => { setEditingFolder(null); setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true); } },
              { label: 'Làm mới thư viện', icon: <RefreshCcw size={14}/>, onClick: () => refreshStats() },
            ]
          });
        }}>
          <div className={lib.quizSidebarLogo}>
            <div className={lib.quizSidebarTitle}>🎯 Trắc Nghiệm</div>
            <div className={lib.quizSidebarSub}>{quizDecks.length} đề · {quizFolders.length} danh mục</div>
          </div>

          <button
            className={`${lib.fcFolderBtn} ${currentFolderId === 'all' ? lib.fcFolderBtnActive : ''} ${dragOverSidebarId === 'all' ? lib.fcFolderBtnDragOver : ''}`}
            onClick={() => setCurrentFolderId('all')}
            onDragOver={(e) => { e.preventDefault(); setDragOverSidebarId('all'); }}
            onDragLeave={() => setDragOverSidebarId(null)}
            onDrop={(e) => { handleDropOnFolder(e, 'all'); setDragOverSidebarId(null); }}
          >
            <LayoutGrid size={15} /> Tất cả
            <span className={lib.fcFolderBtnCount}>{quizFolders.length + quizDecks.filter(d => !d.folderId).length}</span>
          </button>

          {quizFolders.map(f => {
            const fMenuId = `qs_${f.id}`;
            const fMenuOpen = menuOpenId === fMenuId;
            const count = quizDecks.filter(d => d.folderId === f.id).length;
            return (
              <div key={f.id} style={{ position: 'relative' }}>
                <button
                  className={`${lib.quizFolderBtn} ${currentFolderId === f.id ? lib.quizFolderBtnActive : ''} ${dragOverSidebarId === f.id ? lib.fcFolderBtnDragOver : ''}`}
                  onClick={() => setCurrentFolderId(f.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverSidebarId(f.id); }}
                  onDragLeave={() => setDragOverSidebarId(null)}
                  onDrop={(e) => { handleDropOnFolder(e, f.id); setDragOverSidebarId(null); }}
                  style={{ paddingRight: '2.6rem' }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        { label: 'Mở danh mục', icon: <Plus size={14} />, onClick: () => setCurrentFolderId(f.id) },
                        { label: 'Sửa danh mục', icon: <Edit2 size={14} />, onClick: () => openEditFolder(e, f) },
                        { divider: true, label: '', onClick: () => { } },
                        { label: 'Xóa danh mục', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => setDeleteDeckId(`f_${f.id}`) },
                      ]
                    });
                  }}
                >
                  {f.icon} {f.name}
                  <span className={lib.quizFolderBtnCount}>{count}</span>
                </button>
                <div
                  style={{ position: 'absolute', right: '0.4rem', top: 0, bottom: 0, display: 'flex', alignItems: 'center', zIndex: fMenuOpen ? 9999 : 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button className={lib.kebabBtn} onClick={() => setMenuOpenId(fMenuOpen ? null : fMenuId)}>
                    <MoreVertical size={14} />
                  </button>
                  {fMenuOpen && (
                    <div className={lib.menuDropdown} style={{ right: 0 }}>
                      <button className={lib.menuItem} onClick={e => openEditFolder(e, f)}>
                        <Edit2 size={13} /> Sửa danh mục
                      </button>
                      <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(`f_${f.id}`); setMenuOpenId(null); }}>
                        <Trash2 size={13} /> Xóa danh mục
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className={lib.quizSidebarSep} />
          <button
            className={lib.quizAddFolderBtn}
            onClick={() => { setEditingFolder(null); setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true); }}
          >
            + Thêm danh mục
          </button>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <div className={lib.quizPanel}>
          <div className={lib.quizPanelHeader}>
            <div>
              <div className={lib.quizPanelTitle}>
                {currentFolderId === 'all' ? 'Tất cả đề thi' : currentFolderId === null ? '🗂️ Chưa phân loại' : `${activeFolder?.icon || '📁'} ${activeFolder?.name}`}
              </div>
              <div className={lib.quizPanelMeta}>{visibleDecks.length + visibleFolders.length} mục dữ liệu</div>
            </div>
            <button className={lib.btnCreate} onClick={() => setEditDeck('new')} disabled={isProcessing}>
              <Plus size={15} /> Tạo đề thi
            </button>
          </div>

          <div className={lib.quizPanelBody}>
            {isLoading ? (
              <div className={loadingStyles.skeletonGrid} style={{ marginTop: '1rem' }}>
                <div className={loadingStyles.skeletonCard} />
                <div className={loadingStyles.skeletonCard} />
                <div className={loadingStyles.skeletonCard} />
              </div>
            ) : visibleDecks.length === 0 && visibleFolders.length === 0 ? (
              <div className={lib.emptyState}>
                <div className={lib.emptyIcon}>📝</div>
                <div className={lib.emptyTitle}>{isAllView ? 'Chưa có đề thi' : 'Danh mục trống'}</div>
                <div className={lib.emptySub}>{isAllView ? 'Tạo danh mục hoặc đề thi mới để bắt đầu.' : 'Tạo đề thi mới hoặc di chuyển đề thi vào danh mục này.'}</div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.75rem' }}>
                  <button className={lib.btnSecondary} onClick={() => { setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true); }}>
                    Tạo danh mục
                  </button>
                  <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
                    <Plus size={15} /> Tạo đề thi
                  </button>
                </div>
              </div>
            ) : (
              <>
                {visibleFolders.length > 0 && (
                  <div 
                    className={lib.quizFolderGrid}
                    onContextMenu={(e) => {
                      if (e.target === e.currentTarget) {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          items: [
                            { label: 'Tạo đề thi mới', icon: <Plus size={14} />, onClick: () => setEditDeck('new') },
                            { label: 'Thêm danh mục mới', icon: <Plus size={14} />, onClick: () => { setEditingFolder(null); setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true); } },
                            { divider: true, label: '', onClick: () => {} },
                            { label: 'Làm mới thư viện', icon: <RefreshCcw size={14} />, onClick: () => refreshStats() },
                          ]
                        });
                      }
                    }}
                  >
                  {visibleFolders.map((f: any) => {
                    const deckCount = quizDecks.filter((d: any) => d.folderId === f.id).length;
                    const fMenuId = `qg_${f.id}`;
                    const fMenuOpen = menuOpenId === fMenuId;
                    return (
                      <div 
                        key={`folder_${f.id}`} 
                        className={`${lib.quizFolderCard} ${dragOverFolderId === f.id ? lib.fcFolderCardDragOver : ''}`} 
                        onClick={() => setCurrentFolderId(f.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(f.id); }}
                        onDragLeave={() => setDragOverFolderId(null)}
                        onDrop={(e) => handleDropOnFolder(e, f.id)}
                        style={{ '--folder-hue': getFolderHue(f.id) } as any}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            items: [
                              { label: 'Mở danh mục', icon: <Plus size={14} />, onClick: () => setCurrentFolderId(f.id) },
                              { label: 'Sửa danh mục', icon: <Edit2 size={14} />, onClick: () => openEditFolder(e, f) },
                              { label: 'Xóa danh mục', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => setDeleteDeckId(`f_${f.id}`) },
                            ]
                          });
                        }}
                      >
                          <div className={lib.quizFolderIcon}>{f.icon || '📂'}</div>
                          <div className={lib.quizFolderInfo}>
                            <div className={lib.quizFolderName}>{f.name}</div>
                            <div className={lib.quizFolderCount}>{deckCount} đề thi</div>
                          </div>

                          {/* Kebab button */}
                          <div 
                            className={lib.kebabWrap} 
                            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: fMenuOpen ? 9999 : 20 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button className={lib.kebabBtn} onClick={() => setMenuOpenId(fMenuOpen ? null : fMenuId)}>
                              <MoreHorizontal size={16} />
                            </button>
                            {fMenuOpen && (
                              <div className={lib.menuDropdown} style={{ right: 0 }}>
                                <button className={lib.menuItem} onClick={(e) => { e.stopPropagation(); setCurrentFolderId(f.id); setMenuOpenId(null); }}>
                                  <LayoutGrid size={13} /> Mở danh mục
                                </button>
                                <button className={lib.menuItem} onClick={(e) => { e.stopPropagation(); openEditFolder(e, f); setMenuOpenId(null); }}>
                                  <Edit2 size={13} /> Sửa danh mục
                                </button>
                                <div className={lib.menuDivider} />
                                <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={(e) => { e.stopPropagation(); setDeleteDeckId(`f_${f.id}`); setMenuOpenId(null); }}>
                                  <Trash2 size={13} /> Xóa danh mục
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {visibleDecks.map(deck => {
                  const totalCards = deck._count?.cards ?? 0;
                  const timeLimitStr = deck.timeLimitSec
                    ? `${Math.floor(deck.timeLimitSec / 60)}:${(deck.timeLimitSec % 60).toString().padStart(2, '0')}`
                    : '--:--';
                  const isMenuOpen = menuOpenId === deck.id;

                  return (
                    <div
                      key={deck.id}
                      className={lib.quizBanner}
                      onClick={() => router.push(`/quiz/${deck.id}`)}
                      style={{ 
                        zIndex: isMenuOpen ? 500 : undefined,
                        transform: isMenuOpen ? 'none' : undefined
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deck.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          items: [
                            { label: 'Bắt đầu thi', icon: <Plus size={14}/>, onClick: () => router.push(`/quiz/${deck.id}`) },
                            { label: 'Chỉnh sửa', icon: <Edit2 size={14}/>, onClick: () => setEditDeck(deck.id) },
                            { label: 'Chuyển danh mục', icon: <FolderInput size={14}/>, onClick: () => setMoveDeckId(deck.id) },
                            { label: 'Nhân bản', icon: <RefreshCcw size={14}/>, onClick: () => duplicateQuiz(deck.id) },
                            { label: 'Sao chép liên kết', icon: <Copy size={14}/>, onClick: () => copyQuizLink(deck.id) },
                            { divider: true, label: '', onClick: () => {} },
                            { label: 'Xoá lịch sử thi', icon: <RefreshCcw size={14}/>, onClick: () => setResetDeckId(deck.id) },
                            { label: 'Xóa đề thi', icon: <Trash2 size={14}/>, variant: 'danger', onClick: () => setDeleteDeckId(deck.id) },
                          ]
                        });
                      }}
                    >
                      <div className={lib.quizBannerIcon}>⏱️</div>
                      <div className={lib.quizBannerMain}>
                        <div className={lib.quizBannerTitle}>{deck.name}</div>
                        {deck.description && <div className={lib.quizBannerDesc}>{deck.description}</div>}
                        <div className={lib.quizBannerMeta}>{totalCards} câu · {timeLimitStr} phút</div>
                      </div>
                      <div className={lib.quizBannerSep} />
                      <div className={lib.quizBannerScore}>
                        <div className={lib.quizBannerScoreLbl}>Cao nhất</div>
                        <div className={lib.quizBannerScoreVal} style={{ color: (deck as any).highestScore >= 8 ? 'var(--success)' : (deck as any).highestScore >= 5 ? 'var(--warning)' : 'var(--foreground)' }}>
                          {(deck as any).highestScore > 0 ? `${(deck as any).highestScore}/10` : '—'}
                        </div>
                      </div>

                      <div
                        className={lib.kebabWrap}
                        onClick={e => e.stopPropagation()}
                        style={{ zIndex: isMenuOpen ? 9999 : undefined }}
                      >
                        <button className={lib.kebabBtn} onClick={() => setMenuOpenId(isMenuOpen ? null : deck.id)} title="Tùy chọn">
                          <MoreVertical size={16} />
                        </button>
                        {isMenuOpen && (
                          <div className={lib.menuDropdown} style={{ right: 0 }}>
                            <button className={lib.menuItem} onClick={() => { setEditDeck(deck.id); setMenuOpenId(null); }}>
                              <Edit2 size={13} /> Chỉnh sửa
                            </button>
                            <button className={lib.menuItem} onClick={() => { setMoveDeckId(deck.id); setMenuOpenId(null); }}>
                              <FolderInput size={13} /> Chuyển danh mục
                            </button>
                            <div className={lib.menuDivider} />
                            <button className={lib.menuItem} onClick={() => { setResetDeckId(deck.id); setMenuOpenId(null); }}>
                              <RefreshCcw size={13} /> Xoá lịch sử thi
                            </button>
                            <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(deck.id); setMenuOpenId(null); }}>
                              <Trash2 size={13} /> Xóa đề thi
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={lib.quizBannerArrow}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {isFolderModalOpen && (
        <div className={lib.modalOverlay} onClick={() => setIsFolderModalOpen(false)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>{editingFolder ? 'Sửa danh mục' : 'Tạo danh mục mới'}</div>
            <div className={lib.emojiPicker}>
              {EMOJIS.map(icon => (
                <button key={icon} className={`${lib.emojiBtn} ${folderForm.icon === icon ? lib.emojiActive : ''}`} onClick={() => setFolderForm(p => ({ ...p, icon }))}>
                  {icon}
                </button>
              ))}
            </div>
            <input autoFocus className={lib.modalInput} placeholder="Tên danh mục (VD: Toán học, Lý, Hóa…)"
              value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value.slice(0, 60) })}
              onKeyDown={e => e.key === 'Enter' && handleSaveFolder()} />
            <div className={lib.modalActions}>
              <button className={lib.modalCancel} onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); }} disabled={isProcessing}>Hủy</button>
              <button className={lib.modalSave} onClick={handleSaveFolder} disabled={!folderForm.name.trim() || isProcessing}>
                {isProcessing ? 'Đang lưu...' : (editingFolder ? 'Lưu thay đổi' : 'Tạo danh mục')}
              </button>
            </div>
          </div>
        </div>
      )}

      {moveDeckId && (
        <div className={lib.modalOverlay} onClick={() => setMoveDeckId(null)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>Chuyển đề thi sang danh mục</div>
            <div className={lib.moveFolderList}>
              {quizDecks.find(d => d.id === moveDeckId)?.folderId && (
                <div className={lib.moveFolderItem} onClick={async () => { 
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await moveDeckToFolder(moveDeckId!, null); 
                    setMoveDeckId(null); 
                  } finally {
                    setIsProcessing(false);
                  }
                }}>🗂️ Bỏ khỏi danh mục</div>
              )}
              {quizFolders
                .filter(f => f.id !== quizDecks.find(d => d.id === moveDeckId)?.folderId)
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
            <button className={lib.modalCancel} style={{ width: '100%' }} onClick={() => setMoveDeckId(null)}>Hủy</button>
          </div>
        </div>
      )}

      {editDeck && <EditQuizModal deckId={editDeck === 'new' ? null : editDeck} initialFolderId={currentFolderId} onClose={() => setEditDeck(null)} />}
      {importOpen && <ImportQuizModal deckId={null} allDecks={quizDecks} onClose={() => setImportOpen(false)} />}
      <DeleteConfirmModal isOpen={!!deleteDeckId} deckName={deleteName} isLoading={isProcessing} onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} />
      <ConfirmModal
        isOpen={!!resetDeckId}
        title="Xoá lịch sử thi?"
        message="Toàn bộ kết quả các lần thi trước và điểm cao nhất của bộ đề này sẽ bị xoá vĩnh viễn."
        confirmLabel="Xoá lịch sử"
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
