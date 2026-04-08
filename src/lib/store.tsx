// ─────────────────────────────────────────────────────────────
//  Q-Card Store — Shared Context Version
//  All components share the SAME state via React Context.
// ─────────────────────────────────────────────────────────────
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Deck, Card } from './mockData';
import { SM2Data, sm2InitialData } from './sm2';

// ── Types ─────────────────────────────────────────────────────

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
  decks: (Deck & { dueCount?: number; masteredCount?: number; _count?: { cards: number } })[];
  cards: Card[];
  profile: UserProfile | null;
  activity: ActivityDay[];
  streak: number;
  maxStreak: number;
  isLoading: boolean;
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
}

const INITIAL_STATE: StoreState = {
  decks: [],
  cards: [],
  profile: null,
  activity: [],
  streak: 0,
  maxStreak: 0,
  isLoading: true,
};

// ── Context ─────────────────────────────────────────────────────

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

// ── Provider ────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<StoreState>(INITIAL_STATE);

  // ── Fetch Initial Data ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    
    setState(s => ({ ...s, isLoading: true }));
    try {
      const [decksRes, profileRes, activityRes] = await Promise.all([
        fetch('/api/decks'),
        fetch('/api/user/profile'),
        fetch('/api/activity')
      ]);

      const [decksData, profileData, activityData] = await Promise.all([
        decksRes.json(),
        profileRes.json(),
        activityRes.json()
      ]);

      setState({
        decks: decksData.decks || [],
        cards: [],
        profile: profileData.user || null,
        activity: activityData.activity || [],
        streak: activityData.streak || 0,
        maxStreak: activityData.maxStreak || 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch store data:', error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helper: Refresh counts/activity ──────────────────────────
  const refreshStats = useCallback(async () => {
    try {
      const [decksRes, activityRes] = await Promise.all([
        fetch('/api/decks'),
        fetch('/api/activity')
      ]);
      const [decksData, activityData] = await Promise.all([
        decksRes.json(),
        activityRes.json()
      ]);
      setState(s => ({
        ...s,
        decks: decksData.decks || [],
        activity: activityData.activity || [],
        streak: activityData.streak || 0,
        maxStreak: activityData.maxStreak || 0,
      }));
    } catch (e) {
      console.error('refreshStats failed:', e);
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Add deck failed:', res.status, errData);
        return;
      }
      const data = await res.json();
      if (data.deck) {
        // Add to local state immediately so all consumers see it
        setState(s => ({ ...s, decks: [{ ...data.deck, _count: { cards: 0 }, dueCount: 0, masteredCount: 0 }, ...s.decks] }));
        return data.deck.id;
      }
    } catch (error) {
      console.error('Add deck failed:', error);
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
      }
    } catch (error) {
      console.error('Update deck failed:', error);
    }
  }, []);

  const deleteDeck = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setState(s => ({
          ...s,
          decks: s.decks.filter(d => d.id !== id),
          cards: s.cards.filter(c => c.deckId !== id),
        }));
      }
    } catch (error) {
      console.error('Delete deck failed:', error);
    }
  }, []);

  // ── Cards ────────────────────────────────────────────────
  const fetchDeckCards = useCallback(async (deckId: string): Promise<Card[] | undefined> => {
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      const data = await res.json();
      if (data.deck?.cards) {
        const mappedCards = data.deck.cards.map((c: any) => ({
          ...c,
          sm2Data: c.sm2Progress?.[0] ? {
            easiness: c.sm2Progress[0].easeFactor,
            interval: c.sm2Progress[0].interval,
            repetitions: c.sm2Progress[0].repetitions,
            nextReviewDate: new Date(c.sm2Progress[0].nextDueDate).getTime(),
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Add card failed:', res.status, errData);
        return;
      }
      const data = await res.json();
      if (data.count) {
        await fetchDeckCards(card.deckId);
      }
    } catch (error) {
      console.error('Add card failed:', error);
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
      if (res.ok) {
        setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
      }
    } catch (error) {
      console.error('Delete card failed:', error);
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

  const value: StoreState & StoreActions = {
    ...state,
    updateProfile,
    addDeck, updateDeck, deleteDeck,
    addCard, updateCard, deleteCard,
    importCards, logActivity,
    fetchDeckCards,
    refreshStats,
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
