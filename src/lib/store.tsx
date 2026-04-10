// ─────────────────────────────────────────────────────────────
//  Q-Card Store — Shared Context Version
//  All components share the SAME state via React Context.
// ─────────────────────────────────────────────────────────────
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Deck, Card } from './mockData';
import { SM2Data, sm2InitialData } from './types/sm2';
import { toast } from './toast';

// ── Types ───────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  icon: string;
  type: 'FLASHCARD' | 'QUIZ';
  _count?: { decks: number };
}

export interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  email: string;
  bio: string;
  avatarColor: string;
  mood: string;
  streak: number;
  maxStreak: number;
  createdAt: string;
  hasPassword?: boolean;
}

export interface ActivityDay {
  date: string;
  minutesStudied: number;
  cardsStudied: number;
  deckIds: string[];
}

export interface StoreState {
  decks: (Deck & { dueCount?: number; masteredCount?: number; nextDue?: number; _count?: { cards: number } })[];
  folders: Folder[];
  cards: Card[];
  profile: UserProfile | null;
  activity: ActivityDay[];
  streak: number;
  maxStreak: number;
  isLoading: boolean;
  isRefreshing: boolean;
}

export interface StoreActions {
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addDeck: (deck: Omit<Deck, 'id'>) => Promise<string | undefined>;
  updateDeck: (id: string, changes: Partial<Deck>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  addCard: (card: Omit<Card, 'id' | 'sm2Data'>) => Promise<void>;
  updateCard: (id: string, changes: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  importCards: (deckId: string, cards: Partial<Card>[]) => Promise<number>;
  logActivity: (minutesStudied: number, cardsStudied: number, deckId: string) => Promise<void>;
  fetchDeckCards: (deckId: string) => Promise<Card[] | undefined>;
  refreshStats: () => Promise<void>;
  // Folder actions
  addFolder: (name: string, icon?: string, type?: 'FLASHCARD' | 'QUIZ') => Promise<Folder | undefined>;
  updateFolder: (id: string, changes: { name?: string; icon?: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveDeckToFolder: (deckId: string, folderId: string | null) => Promise<void>;
}

const INITIAL_STATE: StoreState = {
  decks: [],
  folders: [],
  cards: [],
  profile: null,
  activity: [],
  streak: 0,
  maxStreak: 0,
  isLoading: true,
  isRefreshing: false,
};

// ── Context ─────────────────────────────────────────────────────

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

// ── Provider ────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<StoreState>(INITIAL_STATE);

  // ── Helper: Check for 401/Unauthorized (Account deleted in DB) ──
  const checkAuth = useCallback((res: Response) => {
    if (res.status === 401 || res.status === 403) {
      console.warn('Session invalid or account deleted. Signing out...');
      signOut({ callbackUrl: '/auth/login' });
      return true;
    }
    return false;
  }, []);

  // ── Fetch Initial Data ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    
    setState(s => ({ ...s, isLoading: true }));
    try {
      const [decksRes, profileRes, activityRes, foldersRes] = await Promise.all([
        fetch('/api/decks', { cache: 'no-store' }),
        fetch('/api/user/profile', { cache: 'no-store' }),
        fetch('/api/activity', { cache: 'no-store' }),
        fetch('/api/folders', { cache: 'no-store' }),
      ]);

      // Detect if account was deleted (401)
      if (checkAuth(decksRes) || checkAuth(profileRes)) return;

      const [decksData, profileData, activityData, foldersData] = await Promise.all([
        decksRes.json(),
        profileRes.json(),
        activityRes.json(),
        foldersRes.json(),
      ]);

      setState({
        decks: decksData.decks || [],
        folders: foldersData.folders || [],
        cards: [],
        profile: profileData.user || null,
        activity: activityData.activity || [],
        streak: activityData.streak || 0,
        maxStreak: activityData.maxStreak || 0,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (error) {
      console.error('Failed to fetch store data:', error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [status, checkAuth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync profile from session immediately to prevent UI flicker
  useEffect(() => {
    if (session?.user && !state.profile) {
      const user = session.user as any;
      setState(s => ({
        ...s,
        profile: s.profile || {
          id: user.id || '',
          name: user.name || '',
          nickname: user.name || '',
          email: user.email || '',
          bio: '',
          avatarColor: 'var(--primary-light)',
          mood: '🎯 Đang tập trung',
          streak: 0,
          maxStreak: 0,
          createdAt: new Date().toISOString(),
        }
      }));
    }
  }, [session, state.profile]);

  // ── Helper: Refresh counts/activity ──────────────────────────
  const refreshStats = useCallback(async () => {
    setState(s => ({ ...s, isRefreshing: true }));
    try {
      const [decksRes, activityRes] = await Promise.all([
        fetch('/api/decks', { cache: 'no-store' }),
        fetch('/api/activity', { cache: 'no-store' })
      ]);
      
      if (checkAuth(decksRes) || checkAuth(activityRes)) return;

      const decksData = await decksRes.json();
      const activityData = await activityRes.json();
      
      setState(s => ({
        ...s,
        decks: decksData.decks || [],
        activity: activityData.activity || [],
        streak: activityData.streak || 0,
        maxStreak: activityData.maxStreak || 0,
        isRefreshing: false,
      }));
    } catch (e) {
      console.error('refreshStats failed:', e);
      setState(s => ({ ...s, isRefreshing: false }));
    }
  }, []);

  // ── Profile ──────────────────────────────────────────────
  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (checkAuth(res)) return;
      const data = await res.json();
      if (data.user) {
        setState(s => ({ ...s, profile: { ...s.profile!, ...data.user } }));
      }
    } catch (error) {
      console.error('Update profile failed:', error);
    }
  }, []);

  // ── Decks ────────────────────────────────────────────────
  const addDeck = useCallback(async (deck: Omit<Deck, 'id'>): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
      });
      if (checkAuth(res)) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Add deck failed:', res.status, errData);
        toast.error('Không thể tạo bộ thẻ');
        return;
      }
      const data = await res.json();
      if (data.deck) {
        // Add to local state immediately so all consumers see it
        setState(s => {
          let updatedFolders = s.folders;
          // If the deck is in a folder, increment that folder's count immediately
          if (data.deck.folderId) {
            updatedFolders = s.folders.map(f => 
              f.id === data.deck.folderId 
                ? { ...f, _count: { ...f._count, decks: (f._count?.decks || 0) + 1 } } 
                : f
            );
          }
          return { 
            ...s, 
            folders: updatedFolders,
            decks: [{ ...data.deck, _count: { cards: 0 }, dueCount: 0, masteredCount: 0 }, ...s.decks] 
          };
        });
        toast.success(data.deck.type === 'QUIZ' ? 'Tạo bộ đề thi thành công!' : 'Tạo bộ thẻ thành công!');
        return data.deck.id;
      }
    } catch (error) {
      console.error('Add deck failed:', error);
      toast.error('Có lỗi xảy ra');
    }
  }, []);

  const updateDeck = useCallback(async (id: string, changes: Partial<Deck>) => {
    try {
      const res = await fetch(`/api/decks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (data.deck) {
        setState(s => ({
          ...s,
          decks: s.decks.map(d => d.id === id ? { ...d, ...data.deck } : d)
        }));
        toast.success('Cập nhật thành công!');
      }
    } catch (error) {
      console.error('Update deck failed:', error);
      toast.error('Không thể cập nhật');
    }
  }, []);

  const deleteDeck = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
      if (checkAuth(res)) return;

      if (res.ok) {
        setState(s => {
          const deckToDelete = s.decks.find(d => d.id === id);
          let updatedFolders = s.folders;
          // Decrement folder count if it was in a folder
          if (deckToDelete?.folderId) {
            updatedFolders = s.folders.map(f => 
              f.id === deckToDelete.folderId 
                ? { ...f, _count: { ...f._count, decks: Math.max(0, (f._count?.decks || 0) - 1) } } 
                : f
            );
          }
          return {
            ...s,
            folders: updatedFolders,
            decks: s.decks.filter(d => d.id !== id),
            cards: s.cards.filter(c => c.deckId !== id),
          };
        });
        toast.success('Đã xóa thành công!');
      }
    } catch (error) {
      console.error('Delete deck failed:', error);
      toast.error('Không thể xóa bộ phận này');
    }
  }, []);

  // ── Cards ────────────────────────────────────────────────
  const fetchDeckCards = useCallback(async (deckId: string): Promise<Card[] | undefined> => {
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      if (checkAuth(res)) return;
      const data = await res.json();
      if (data.deck?.cards) {
        const mappedCards = data.deck.cards.map((c: any) => ({
          ...c,
          sm2Data: c.sm2Progress?.[0] ? {
            easiness: c.sm2Progress[0].easeFactor,
            interval: c.sm2Progress[0].interval,
            repetitions: c.sm2Progress[0].repetitions,
            nextReviewDate: new Date(c.sm2Progress[0].nextDueDate).getTime(),
            stability: c.sm2Progress[0].stability,
            difficulty: c.sm2Progress[0].difficulty,
            state: c.sm2Progress[0].state,
            reps: c.sm2Progress[0].reps,
            lapses: c.sm2Progress[0].lapses,
          } : sm2InitialData()
        }));
        setState(s => {
          const otherCards = s.cards.filter(card => card.deckId !== deckId);
          // Update the specific deck's card count so library syncs immediately
          const newDecks = s.decks.map(d => 
            d.id === deckId ? { ...d, _count: { ...d._count, cards: mappedCards.length } } : d
          );
          return { ...s, cards: [...otherCards, ...mappedCards], decks: newDecks };
        });
        return mappedCards;
      }
    } catch (error) {
      console.error('Fetch cards failed:', error);
    }
  }, []);

  const addCard = useCallback(async (card: Omit<Card, 'id' | 'sm2Data'>) => {
    try {
      const res = await fetch(`/api/decks/${card.deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (checkAuth(res)) return;
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Add card failed:', res.status, errData);
        return;
      }
      const data = await res.json();
      if (data.count) {
        await fetchDeckCards(card.deckId);
        toast.success('Thêm bài thành công');
      }
    } catch (error) {
      console.error('Add card failed:', error);
      toast.error('Có lỗi xảy ra');
    }
  }, [fetchDeckCards]);

  const updateCard = useCallback(async (id: string, changes: Partial<Card>) => {
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (data.card) {
        setState(s => ({
          ...s,
          cards: s.cards.map(c => c.id === id ? { ...c, ...data.card } : c)
        }));
      }
    } catch (error) {
      console.error('Update card failed:', error);
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (checkAuth(res)) return;
      if (res.ok) {
        setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
        toast.success('Đã xóa thẻ');
      }
    } catch (error) {
      console.error('Delete card failed:', error);
      toast.error('Có lỗi xảy ra');
    }
  }, []);

  // ── Import cards ─────────────────────────────────────────
  const importCards = useCallback(async (deckId: string, cards: Partial<Card>[]): Promise<number> => {
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      });
      if (checkAuth(res)) return 0;
      const data = await res.json();
      if (data.count) {
        await fetchDeckCards(deckId);
        return data.count;
      }
    } catch (error) {
      console.error('Import cards failed:', error);
    }
    return 0;
  }, [fetchDeckCards]);

  // ── Activity / Streak ────────────────────────────────────
  const logActivity = useCallback(async (minutesStudied: number, cardsStudied: number, deckId: string) => {
    await refreshStats();
  }, [refreshStats]);

  // ── Folder Actions ───────────────────────────────────────────
  const addFolder = useCallback(async (name: string, icon = '📁', type: 'FLASHCARD' | 'QUIZ' = 'FLASHCARD'): Promise<Folder | undefined> => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, type }),
      });
      if (checkAuth(res)) return;
      const data = await res.json();
      if (data.folder) {
        setState(s => ({ ...s, folders: [...s.folders, data.folder] }));
        toast.success('Đã tạo danh mục');
        return data.folder;
      }
    } catch (e) { 
      console.error('addFolder failed:', e); 
      toast.error('Không thể tạo danh mục');
    }
  }, []);

  const updateFolder = useCallback(async (id: string, changes: { name?: string; icon?: string }) => {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (data.folder) {
        setState(s => ({ ...s, folders: s.folders.map(f => f.id === id ? { ...f, ...data.folder } : f) }));
        toast.success('Đã cập nhật danh mục');
      }
    } catch (e) { 
      console.error('updateFolder failed:', e); 
      toast.error('Có lỗi xảy ra');
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      if (checkAuth(res)) return;
      if (res.ok) {
        setState(s => ({
          ...s,
          folders: s.folders.filter(f => f.id !== id),
          decks: s.decks.filter(d => d.folderId !== id),
        }));
        toast.success('Đã xóa danh mục');
      }
    } catch (e) { 
      console.error('deleteFolder failed:', e); 
      toast.error('Có lỗi xảy ra');
    }
  }, []);

  const moveDeckToFolder = useCallback(async (deckId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (checkAuth(res)) return;
      if (res.ok) {
        setState(s => ({
          ...s,
          decks: s.decks.map(d => d.id === deckId ? { ...d, folderId } : d),
          // Update folder deck counts
          folders: s.folders.map(f => {
            const oldDeck = s.decks.find(d => d.id === deckId);
            if (f.id === oldDeck?.folderId) return { ...f, _count: { decks: (f._count?.decks ?? 1) - 1 } };
            if (f.id === folderId) return { ...f, _count: { decks: (f._count?.decks ?? 0) + 1 } };
            return f;
          }),
        }));
        toast.success('Đã di chuyển thành công!');
      }
    } catch (e) { 
      console.error('moveDeckToFolder failed:', e); 
      toast.error('Không thể di chuyển');
    }
  }, []);

  const value: StoreState & StoreActions = {
    ...state,
    updateProfile,
    addDeck, updateDeck, deleteDeck,
    addCard, updateCard, deleteCard,
    importCards, logActivity,
    fetchDeckCards,
    refreshStats,
    addFolder, updateFolder, deleteFolder, moveDeckToFolder,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// ── Hook (consumers use this — all share the same state) ──────

export function useStore(): StoreState & StoreActions {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
