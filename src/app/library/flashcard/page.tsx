"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import lib from '../library.module.css';
import loadingStyles from '@/app/loading.module.css';
import { useStore, Folder } from '@/lib/store';
import { Plus, Upload, MoreVertical, Edit2, Trash2, FolderInput, RefreshCcw, Folder as FolderIcon, X, Check, ChevronRight } from 'lucide-react';
import EditDeckModal from '@/components/EditDeckModal';
import ImportModal from '@/components/ImportModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
// Leftover import removed

const EMOJIS = ['📁', '📘', '⚛️', '🌍', '💻', '🎨', '🧬', '🎵', '🧠', '💼'];

export default function FlashcardLibrary() {
  const router = useRouter();
  
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Menu matching
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Modals state
  const [editDeck, setEditDeck] = useState<string | null>(null);
  const [importDeck, setImportDeck] = useState<string | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📁' });

  const { decks, folders, isLoading, deleteDeck, refreshStats, moveDeckToFolder, addFolder, updateFolder, deleteFolder } = useStore();
  
  const flashDecks = decks.filter(d => !d.type || d.type === 'FLASHCARD');
  
  // Select which items to show based on current folder
  const flashFolders = folders.filter(f => f.type === 'FLASHCARD' || !f.type);
  const visibleFolders = currentFolderId === null ? flashFolders : [];
  const visibleDecks = flashDecks.filter(d => d.folderId === currentFolderId);
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const confirmDelete = async () => {
    if (deleteDeckId) {
      // If it's a folder:
      if (deleteDeckId.startsWith('f_')) {
        await deleteFolder(deleteDeckId.replace('f_', ''));
      } else {
        await deleteDeck(deleteDeckId);
      }
      setDeleteDeckId(null);
    }
  };

  const confirmReset = async (deckId: string) => {
    if (confirm('Làm mới toàn bộ tiến độ học tập (về 0%) của bộ bài này?')) {
      await fetch(`/api/decks/${deckId}/reset`, { method: 'POST' });
      await refreshStats();
    }
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, folderForm);
    } else {
      await addFolder(folderForm.name, folderForm.icon, 'FLASHCARD');
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
              🗂️ Tất cả bộ bài
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
                setEditingFolder(null); setFolderForm({ name: '', icon: '📁' }); setIsFolderModalOpen(true);
              }}>
                <FolderIcon size={14} /> Thêm thư mục
              </button>
            )}
            <button className={lib.btnImport} onClick={() => setImportDeck('__pick')}>
              <Upload size={14} /> Import
            </button>
            <button className={lib.btnCreate} onClick={() => setEditDeck('new')}>
              <Plus size={15} /> Tạo bộ thẻ
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
              {currentFolderId === null ? "📄 Các bộ thẻ chưa phân loại" : "📄 Các bộ thẻ trong thư mục này"}
            </div>
            
            {visibleDecks.length === 0 ? (
              <div className={lib.emptyState}>
                <div className={lib.emptyIcon}>📭</div>
                <div className={lib.emptyText}>Thư mục này trống</div>
                <div className={lib.emptySub}>Bạn có thể tạo bộ thẻ mới trực tiếp vào đây.</div>
              </div>
            ) : (
              <div className={lib.deckGrid}>
                {visibleDecks.map(deck => {
                  const totalCards = deck._count?.cards ?? 0;
                  const due = deck.dueCount ?? 0;
                  const mastered = deck.masteredCount ?? 0;
                  const progressPct = totalCards === 0 ? 0 : Math.round((mastered / totalCards) * 100);
                  
                  // SVG calculation
                  const radius = 16;
                  const dasharray = 2 * Math.PI * radius;
                  const dashoffset = dasharray - (progressPct / 100) * dasharray;

                  return (
                    <div key={deck.id} className={lib.fcCard} style={{ '--primary': deck.color } as React.CSSProperties} onClick={() => router.push(`/flashcard/${deck.id}`)}>
                      {/* Top Accent Strip */}
                      <div className={lib.fcGradientTop}>
                        <div className={lib.statusWrap}>
                          {due > 0 ? (
                            <div className={`${lib.statusTag} ${lib.statusDue}`}>🔥 {due} thẻ cần ôn</div>
                          ) : totalCards > 0 && mastered === totalCards ? (
                            <div className={`${lib.statusTag} ${lib.statusDone}`}>✨ Đã hoàn thành</div>
                          ) : null}
                        </div>

                        {/* Action Menu */}
                        <div className={lib.kebabWrap}>
                          <button className={`${lib.kebabBtn} ${lib.kebabBtnLight}`} onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === deck.id ? null : deck.id); }}>
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
                                <RefreshCcw size={13} /> Làm mới tiến độ
                              </button>
                              <button className={`${lib.menuItem} ${lib.menuItemDanger}`} onClick={() => { setDeleteDeckId(deck.id); setMenuOpenId(null); }}>
                                <Trash2 size={13} /> Xóa bộ bài
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div className={lib.fcTitleArea}>
                        <div className={lib.fcTitle}>{deck.name}</div>
                        <div className={lib.fcDesc}>{deck.description || 'Chưa thiết lập mô tả cho bộ thẻ này.'}</div>
                      </div>

                      {/* Progress Section */}
                      <div className={lib.fcProgress}>
                        <div className={lib.ringWrap}>
                          <svg className={lib.ringSvg} width="36" height="36" viewBox="0 0 36 36">
                            <circle className={lib.ringBg} cx="18" cy="18" r={radius} />
                            <circle 
                              className={lib.ringFill} 
                              cx="18" cy="18" r={radius} 
                              stroke={deck.color.includes('gradient') ? 'var(--primary)' : deck.color}
                              strokeDasharray={dasharray}
                              strokeDashoffset={dashoffset}
                            />
                          </svg>
                          <div className={lib.ringText}>{progressPct}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Mastery</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 600 }}>{mastered} / {totalCards} thẻ</div>
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
            <div className={lib.emptySub}>Bắt đầu xây dựng dữ liệu học tập của bạn qua các thư mục và bộ thẻ thông minh.</div>
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
              autoFocus className={lib.modalInput} placeholder="Tên thư mục (Vd: Ngoại ngữ)" 
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
            <div className={lib.folderModalTitle}>Chuyển "{flashDecks.find(d=>d.id===moveDeckId)?.name}" tới:</div>
            <div className={lib.moveFolderList}>
              <button 
                className={`${lib.moveFolderItem} ${!flashDecks.find(d=>d.id===moveDeckId)?.folderId ? lib.moveFolderItemActive : ''}`}
                onClick={() => { moveDeckToFolder(moveDeckId, null); setMoveDeckId(null); }}
              >
                🗂️ Ngoài cùng (Không thư mục)
              </button>
              {folders.map(f => (
                <button 
                  key={f.id}
                  className={`${lib.moveFolderItem} ${flashDecks.find(d=>d.id===moveDeckId)?.folderId === f.id ? lib.moveFolderItemActive : ''}`}
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
        <EditDeckModal mode="flashcard" initialFolderId={currentFolderId} deckId={editDeck === 'new' ? null : editDeck} onClose={() => setEditDeck(null)} />
      )}
      {importDeck !== null && (
        <ImportModal deckId={importDeck === '__pick' ? null : importDeck} allDecks={flashDecks} onClose={() => setImportDeck(null)} />
      )}
      <DeleteConfirmModal 
        isOpen={!!deleteDeckId} 
        deckName={
          deleteDeckId?.startsWith('f_') 
            ? folders.find(f => f.id === deleteDeckId.replace('f_',''))?.name || ''
            : flashDecks.find(d => d.id === deleteDeckId)?.name || ''
        } 
        onConfirm={confirmDelete} onCancel={() => setDeleteDeckId(null)} 
      />
    </div>
  );
}
