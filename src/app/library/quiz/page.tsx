"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { useStore, Folder } from '@/lib/store';
import { Plus, MoreVertical, Edit2, Trash2, FolderInput, RefreshCcw, ChevronRight } from 'lucide-react';
import EditQuizModal from '@/components/EditQuizModal';
import ImportQuizModal from '@/components/ImportQuizModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

const EMOJIS = ['📝', '📘', '⚛️', '🌍', '💻', '🏛️', '🧬', '🎵', '🏆', '💼', '🔬', '📐'];

export default function QuizLibrary() {
  const router = useRouter();

  // null = show all decks/folders; string = show decks in that folder
  const [currentFolderId, setRawCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    const handleState = () => {
      const params = new URLSearchParams(window.location.search);
      const f = params.get('folder');
      setRawCurrentFolderId(f || null);
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
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📝' });

  const { decks, folders, isLoading, deleteDeck, refreshStats, moveDeckToFolder, addFolder, updateFolder, deleteFolder } = useStore();

  const quizDecks = decks.filter((d: any) => d.type === 'QUIZ');
  const quizFolders = folders.filter((f: any) => f.type === 'QUIZ');
  
  const isAllView = currentFolderId === null;
  const visibleDecks = isAllView 
    ? quizDecks.filter((d: any) => !d.folderId)
    : quizDecks.filter((d: any) => d.folderId === currentFolderId);
    
  const visibleFolders = isAllView ? quizFolders : [];
  const currentFolder = isAllView ? null : quizFolders.find((f: any) => f.id === currentFolderId);

  const confirmDelete = async () => {
    if (!deleteDeckId) return;
    if (deleteDeckId.startsWith('f_')) {
      const fid = deleteDeckId.replace('f_', '');
      await deleteFolder(fid);
      if (currentFolderId === fid) setCurrentFolderId(null);
    } else {
      await deleteDeck(deleteDeckId);
    }
    setDeleteDeckId(null);
  };

  const confirmReset = async (deckId: string) => {
    if (!confirm('Xoá lịch sử thi và đặt điểm về 0?')) return;
    await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
    await refreshStats();
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, folderForm);
    } else {
      await addFolder(folderForm.name, folderForm.icon, 'QUIZ');
    }
    setIsFolderModalOpen(false);
    setFolderForm({ name: '', icon: '📝' });
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
      ? quizFolders.find(f => f.id === deleteDeckId.replace('f_', ''))?.name ?? 'Danh mục này'
      : quizDecks.find(d => d.id === deleteDeckId)?.name ?? 'Đề thi này'
    : '';

  return (
    <div className={lib.libraryPage} onClick={() => setMenuOpenId(null)}>
      <div className={lib.quizLayout}>
        {/* ── SIDEBAR ── */}
        <aside className={lib.quizSidebar}>
          <div className={lib.quizSidebarLogo}>
            <div className={lib.quizSidebarTitle}>🎯 Trắc Nghiệm</div>
            <div className={lib.quizSidebarSub}>{quizDecks.length} đề · {quizFolders.length} danh mục</div>
          </div>

          <button
            className={`${lib.quizFolderBtn} ${currentFolderId === null ? lib.quizFolderBtnActive : ''}`}
            onClick={() => setCurrentFolderId(null)}
          >
            🗂️ Tất cả
            <span className={lib.quizFolderBtnCount}>{quizDecks.length}</span>
          </button>

          {quizFolders.map(f => {
            const fMenuOpen = menuOpenId === `f_${f.id}`;
            const count = quizDecks.filter(d => d.folderId === f.id).length;
            return (
              <div key={f.id} style={{ position: 'relative' }}>
                <button
                  className={`${lib.quizFolderBtn} ${currentFolderId === f.id ? lib.quizFolderBtnActive : ''}`}
                  onClick={() => setCurrentFolderId(f.id)}
                  style={{ paddingRight: '2.6rem' }}
                >
                  {f.icon} {f.name}
                  <span className={lib.quizFolderBtnCount}>{count}</span>
                </button>
                <div
                  style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', zIndex: fMenuOpen ? 9999 : 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button className={lib.kebabBtn} onClick={() => setMenuOpenId(fMenuOpen ? null : `f_${f.id}`)}>
                    <MoreVertical size={14} />
                  </button>
                  {fMenuOpen && (
                    <div className={lib.menuDropdown}>
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
                {currentFolderId === null ? 'Tất cả đề thi' : `${currentFolder?.icon} ${currentFolder?.name}`}
              </div>
              <div className={lib.quizPanelMeta}>{visibleDecks.length} đề thi</div>
            </div>
            <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
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
                {visibleFolders.map((f: any) => {
                  const deckCount = quizDecks.filter((d: any) => d.folderId === f.id).length;
                  return (
                    <div key={`folder_${f.id}`} className={lib.quizFolderBanner} onClick={() => setCurrentFolderId(f.id)}>
                      <div className={lib.quizBannerIcon}>{f.icon || '📁'}</div>
                      <div className={lib.quizBannerMain}>
                        <div className={lib.quizBannerTitle}>{f.name}</div>
                        <div className={lib.quizBannerMeta}>{deckCount} đề thi trong mục này</div>
                      </div>
                      <div className={lib.quizPlayBtn}>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  );
                })}
                {visibleDecks.map(deck => {
                const totalCards = deck._count?.cards ?? 0;
                const mastered = deck.masteredCount ?? 0;
                const timeLimitStr = deck.timeLimitSec
                  ? `${Math.floor(deck.timeLimitSec / 60)}:${(deck.timeLimitSec % 60).toString().padStart(2, '0')}`
                  : '--:--';
                const isMenuOpen = menuOpenId === deck.id;

                return (
                  <div
                    key={deck.id}
                    className={lib.quizBanner}
                    onClick={() => router.push(`/quiz/${deck.id}`)}
                    style={{ zIndex: isMenuOpen ? 200 : undefined }}
                  >
                    <div className={lib.quizBannerIcon}>⏱️</div>
                    <div className={lib.quizBannerMain}>
                      <div className={lib.quizBannerTitle}>{deck.name}</div>
                      <div className={lib.quizBannerMeta}>{totalCards} câu · {timeLimitStr} phút</div>
                    </div>
                    <div className={lib.quizBannerSep} />
                    <div className={lib.quizBannerScore}>
                      <div className={lib.quizBannerScoreLbl}>Cao nhất</div>
                      <div className={lib.quizBannerScoreVal}>{mastered}</div>
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
                          <button className={lib.menuItem} onClick={() => { confirmReset(deck.id); setMenuOpenId(null); }}>
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
              <button className={lib.modalCancel} onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); }}>Hủy</button>
              <button className={lib.modalSave} onClick={handleSaveFolder} disabled={!folderForm.name.trim()}>
                {editingFolder ? 'Lưu thay đổi' : 'Tạo danh mục'}
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
              <div className={lib.moveFolderItem} onClick={() => { moveDeckToFolder(moveDeckId!, null); setMoveDeckId(null); }}>
                🗂️ Bỏ khỏi danh mục
              </div>
              {quizFolders.map(f => (
                <div key={f.id} className={lib.moveFolderItem} onClick={() => { moveDeckToFolder(moveDeckId!, f.id); setMoveDeckId(null); }}>
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
      <DeleteConfirmModal isOpen={!!deleteDeckId} deckName={deleteName} onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} />
    </div>
  );
}
