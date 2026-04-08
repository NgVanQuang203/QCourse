"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { useStore, Folder } from '@/lib/store';
import { Plus, Upload, MoreVertical, Edit2, Trash2, FolderInput, RefreshCcw, Folder as FolderIcon, ChevronRight } from 'lucide-react';
import EditQuizModal from '@/components/EditQuizModal';
import ImportQuizModal from '@/components/ImportQuizModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

const EMOJIS = ['📝', '📘', '⚛️', '🌍', '💻', '🎨', '🧬', '🎵', '🧠', '💼'];

export default function QuizLibrary() {
  const router = useRouter();
  
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Modals state
  const [editDeck, setEditDeck] = useState<string | null>(null);
  const [importDeck, setImportDeck] = useState<string | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📝' });

  const { decks, folders, isLoading, deleteDeck, refreshStats, moveDeckToFolder, addFolder, updateFolder, deleteFolder } = useStore();
  
  const quizDecks = decks.filter(d => d.type === 'QUIZ');
  
  // Select which items to show based on current folder
  const quizFolders = folders.filter(f => f.type === 'QUIZ');
  const visibleFolders = currentFolderId === null ? quizFolders : [];
  const visibleDecks = quizDecks.filter(d => d.folderId === currentFolderId);
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const confirmDelete = async () => {
    if (deleteDeckId) {
      if (deleteDeckId.startsWith('f_')) {
        await deleteFolder(deleteDeckId.replace('f_', ''));
      } else {
        await deleteDeck(deleteDeckId);
      }
      setDeleteDeckId(null);
    }
  };

  const confirmReset = async (deckId: string) => {
    if (confirm('Làm mới toàn bộ câu hỏi và điểm số (về 0) của bộ đề này?')) {
      await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
      await refreshStats();
    }
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, folderForm);
    } else {
      await addFolder(folderForm.name, folderForm.icon, 'QUIZ');
    }
    setIsFolderModalOpen(false);
  };

  const openEditFolder = (e: React.MouseEvent, f: Folder) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingFolder(f);
    setFolderForm({ name: f.name, icon: f.icon });
    setIsFolderModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className={loadingStyles.skeletonContainer}>
        <div className={loadingStyles.skeletonHero} />
        <div className={loadingStyles.skeletonGrid}>
          <div className={loadingStyles.skeletonCard} />
        </div>
      </div>
    );
  }

  return (
    <div className={lib.libraryPage} onClick={() => setMenuOpenId(null)}>
      <main className={lib.mainArea}>
        
        {/* ── HEADER BREADCRUMB ── */}
        <div className={lib.headerBar}>
          <div className={lib.breadcrumb}>
            <button className={lib.breadcrumbLink} onClick={() => setCurrentFolderId(null)}>
              🗂️ Tất cả đề thi
            </button>
            {currentFolder && (
              <>
                <ChevronRight className={lib.breadcrumbSep} />
                <span style={{ color: 'var(--primary)' }}>{currentFolder.icon} {currentFolder.name}</span>
              </>
            )}
          </div>
          
          <div className={lib.headerActions}>
            {currentFolderId === null && (
              <button className={lib.btnImport} onClick={() => {
                setEditingFolder(null); setFolderForm({ name: '', icon: '📝' }); setIsFolderModalOpen(true);
              }}>
                <FolderIcon size={14} /> Thêm thư mục
              </button>
            )}
            <button className={lib.btnImport} onClick={() => setImportDeck('__pick')}>
              <Upload size={14} /> Import
            </button>
            <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
              <Plus size={15} /> Tạo đề mới
            </button>
          </div>
        </div>

        {/* ── FOLDERS GRID (Only at root) ── */}
        {currentFolderId === null && visibleFolders.length > 0 && (
          <div>
            <div className={lib.sectionTitle}>📁 Thư mục của bạn</div>
            <div className={lib.folderGrid}>
              {visibleFolders.map(f => (
                <div key={f.id} className={lib.folderCard} onClick={() => setCurrentFolderId(f.id)}>
                  <div className={lib.folderIcon}>{f.icon}</div>
                  <div className={lib.folderInfo}>
                    <div className={lib.folderName}>{f.name}</div>
                    <div className={lib.folderMeta}>{f._count?.decks || 0} mục</div>
                  </div>
                  
                  {/* Folder Menu */}
                  <div className={lib.kebabWrap}>
                    <button className={lib.kebabBtn} onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `f_${f.id}` ? null : `f_${f.id}`); }}>
                      <MoreVertical size={16} />
                    </button>
                    {menuOpenId === `f_${f.id}` && (
                      <div className={lib.menuDropdown} onClick={(e) => e.stopPropagation()}>
                        <button className={lib.menuItem} onClick={(e) => openEditFolder(e, f)}>
                          <Edit2 size={13} /> Sửa thư mục
                        </button>
                        <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(`f_${f.id}`); setMenuOpenId(null); }}>
                          <Trash2 size={13} /> Xóa thư mục
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DECKS GRID ── */}
        {visibleDecks.length > 0 || currentFolderId !== null ? (
          <div>
            <div className={lib.sectionTitle}>
              {currentFolderId === null ? "📄 Các đề thi chưa phân loại" : "📄 Các bộ đề trong thư mục này"}
            </div>
            
            {visibleDecks.length === 0 ? (
              <div className={lib.emptyState}>
                <div className={lib.emptyIcon}>📭</div>
                <div className={lib.emptyText}>Thư mục này trống</div>
                <div className={lib.emptySub}>Bạn có thể tạo đề thi mới trực tiếp vào đây.</div>
              </div>
            ) : (
              <div className={lib.deckGrid}>
                {visibleDecks.map(deck => {
                  const totalCards = deck._count?.cards ?? 0;
                  const due = deck.dueCount ?? 0;
                  const mastered = deck.masteredCount ?? 0;
                  const timeLimitStr = deck.timeLimitSec ? `${Math.floor(deck.timeLimitSec/60)}:${(deck.timeLimitSec%60).toString().padStart(2,'0')}` : '0:00';
                  
                  return (
                    <div key={deck.id} className={lib.quizCard} onClick={() => router.push(`/quiz/${deck.id}`)}>
                      <div className={lib.quizBgGrid}></div>

                      {/* Top Header */}
                      <div className={lib.quizTop}>
                        {/* Kebab */}
                        <div className={lib.kebabWrap}>
                          <button className={lib.kebabBtn} onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === deck.id ? null : deck.id); }}>
                            <MoreVertical size={16} />
                          </button>
                          {menuOpenId === deck.id && (
                            <div className={lib.menuDropdown} onClick={(e) => e.stopPropagation()}>
                              <button className={lib.menuItem} onClick={() => { setEditDeck(deck.id); setMenuOpenId(null); }}>
                                <Edit2 size={13} /> Chỉnh sửa
                              </button>
                              <button className={lib.menuItem} onClick={() => { setMoveDeckId(deck.id); setMenuOpenId(null); }}>
                                <FolderInput size={13} /> Chuyển thư mục
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

                        <div className={lib.quizIconBox}>⏱️</div>
                        <div className={lib.quizInfo}>
                          <div className={lib.quizTitle} title={deck.name}>{deck.name}</div>
                          <div className={lib.quizMeta}>{totalCards} CÂU HỎI • {timeLimitStr}</div>
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className={lib.quizBody}>
                        <div className={lib.quizScoreLabel}>Max Score</div>
                        <div className={lib.quizScoreValue}>{mastered}</div>

                        <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem' }}>
                          {due > 0 ? (
                            <div className={`${lib.statusTag} ${lib.statusDue}`}>🔥 {due} câu trống</div>
                          ) : totalCards > 0 && mastered === totalCards ? (
                            <div className={`${lib.statusTag} ${lib.statusDone}`} style={{color:'var(--foreground)', border:'1px solid var(--border)'}}>✨ Perfect Score</div>
                          ) : null}
                        </div>

                        <div className={lib.quizAction}>
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className={lib.emptyState}>
            <div className={lib.emptyIcon}>📦</div>
            <div className={lib.emptyText}>Thư viện trống</div>
            <div className={lib.emptySub}>Bắt đầu tạo các câu trắc nghiệm thú vị và quản lý chúng dễ dàng qua hệ thống thư mục.</div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {/* Folder CRUD */}
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
              autoFocus className={lib.modalInput} placeholder="Tên thư mục (Vd: Toán Giải tích)" 
              value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value.slice(0, 60) })}
              onKeyDown={e => e.key === 'Enter' && handleSaveFolder()}
            />
            <div className={lib.modalActions}>
              <button className={lib.modalCancel} onClick={() => setIsFolderModalOpen(false)}>Hủy</button>
              <button className={lib.modalSave} onClick={handleSaveFolder} disabled={!folderForm.name.trim()}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Deck Modals */}
      {moveDeckId && (
        <div className={lib.modalOverlay} onClick={() => setMoveDeckId(null)}>
          <div className={lib.folderModal} onClick={e => e.stopPropagation()}>
            <div className={lib.folderModalTitle}>Chuyển "{quizDecks.find(d=>d.id===moveDeckId)?.name}" tới:</div>
            <div className={lib.moveFolderList}>
              <button 
                className={`${lib.moveFolderItem} ${!quizDecks.find(d=>d.id===moveDeckId)?.folderId ? lib.moveFolderItemActive : ''}`}
                onClick={() => { moveDeckToFolder(moveDeckId, null); setMoveDeckId(null); }}
              >
                🗂️ Ngoài cùng (Không thư mục)
              </button>
              {folders.map(f => (
                <button 
                  key={f.id}
                  className={`${lib.moveFolderItem} ${quizDecks.find(d=>d.id===moveDeckId)?.folderId === f.id ? lib.moveFolderItemActive : ''}`}
                  onClick={() => { moveDeckToFolder(moveDeckId, f.id); setMoveDeckId(null); }}
                >
                  {f.icon} {f.name}
                </button>
              ))}
            </div>
            <button className={lib.modalCancel} style={{width:'100%'}} onClick={() => setMoveDeckId(null)}>Đóng</button>
          </div>
        </div>
      )}

      {editDeck !== null && (
        <EditQuizModal initialFolderId={currentFolderId} deckId={editDeck === 'new' ? null : editDeck} onClose={() => setEditDeck(null)} />
      )}
      {importDeck !== null && (
        <ImportQuizModal deckId={importDeck === '__pick' ? null : importDeck} allDecks={quizDecks} onClose={() => setImportDeck(null)} />
      )}
      <DeleteConfirmModal 
        isOpen={!!deleteDeckId} 
        deckName={
          deleteDeckId?.startsWith('f_') 
            ? folders.find(f => f.id === deleteDeckId.replace('f_',''))?.name || ''
            : quizDecks.find(d => d.id === deleteDeckId)?.name || ''
        } 
        onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} 
      />
    </div>
  );
}
