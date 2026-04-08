// ─────────────────────────────────────────────────────────────
//  Q-Card Store — Database Sync Version
// ─────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect, useCallback } from 'react';
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
}

export interface ActivityDay {
  date: string;
  minutesStudied: number;
  cardsStudied: number;
  deckIds: string[];
}

export interface StoreState {
  decks: (Deck & { dueCount?: number; masteredCount?: number })[];
  cards: Card[];
  profile: UserProfile | null;
  activity: ActivityDay[];
  streak: number;
  maxStreak: number;
  isLoading: boolean;
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

// ── Hook ─────────────────────────────────────────────────────

export function useStore() {
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
        cards: [], // Cards loaded on demand or per deck
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
  const addDeck = useCallback(async (deck: Omit<Deck, 'id'>) => {
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
      });
      const data = await res.json();
      if (data.deck) {
        setState(s => ({ ...s, decks: [data.deck, ...s.decks] }));
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
  const fetchDeckCards = useCallback(async (deckId: string) => {
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
          return { ...s, cards: [...otherCards, ...mappedCards] };
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
      const data = await res.json();
      if (data.count) {
        // Since it's bulk or single, we re-fetch deck cards to be sure
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
  const importCards = useCallback(async (deckId: string, cards: Partial<Card>[]) => {
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
    // Activity is logged automatically by review/quiz submit APIs.
    // We just need to refresh our local state.
    await refreshStats();
  }, [refreshStats]);

  return {
    ...state,
    updateProfile,
    addDeck, updateDeck, deleteDeck,
    addCard, updateCard, deleteCard,
    importCards, logActivity,
    fetchDeckCards,
    refreshStats,
  };
}
