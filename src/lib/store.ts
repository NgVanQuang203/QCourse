// ─────────────────────────────────────────────────────────────
//  Q-Card Store — localStorage frontend only (swap to API later)
// ─────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect, useCallback } from 'react';
import { mockDecks, mockCards, Deck, Card } from './mockData';
import { sm2InitialData } from './sm2';

// ── Types ─────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string;
  nickname: string;
  bio: string;
  avatarColor: string; // gradient string
  mood: string; // emoji
  joinDate: string; // ISO
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  minutesStudied: number;
  cardsStudied: number;
  deckIds: string[];
}

export interface StoreState {
  decks: Deck[];
  cards: Card[];
  profile: UserProfile;
  activity: ActivityDay[]; // last 365 days
  streak: number;
  maxStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
}

// ── Helpers ───────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function generateMockActivity(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Simulate realistic activity — more recent = more likely
    const recency = 1 - i / 365;
    const active = Math.random() < (0.4 + recency * 0.45);
    if (active) {
      const mins = Math.floor(Math.random() * 55) + 5;
      const cards = Math.floor(mins / 3) + Math.floor(Math.random() * 10);
      const deckIds = ['d1', 'd3', 'd2'].slice(0, Math.ceil(Math.random() * 2));
      days.push({ date: dateStr, minutesStudied: mins, cardsStudied: cards, deckIds });
    } else {
      days.push({ date: dateStr, minutesStudied: 0, cardsStudied: 0, deckIds: [] });
    }
  }
  return days;
}

function calculateStreak(activity: ActivityDay[]): { streak: number; maxStreak: number } {
  const sorted = [...activity].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let maxStreak = 0;
  let cur = 0;
  const todayStr = today();
  let expectedDate = todayStr;

  for (const day of sorted) {
    if (day.date > todayStr) continue;
    if (day.date === expectedDate) {
      if (day.minutesStudied > 0) {
        streak++;
        cur++;
        maxStreak = Math.max(maxStreak, cur);
        const d = new Date(expectedDate);
        d.setDate(d.getDate() - 1);
        expectedDate = d.toISOString().slice(0, 10);
      } else {
        if (streak > 0) break;
        cur = 0;
        const d = new Date(expectedDate);
        d.setDate(d.getDate() - 1);
        expectedDate = d.toISOString().slice(0, 10);
      }
    }
  }
  return { streak, maxStreak };
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Người dùng Q-Card',
  nickname: 'qcarduser',
  bio: '📚 Đam mê học tập và khám phá kiến thức mới mỗi ngày!',
  avatarColor: 'linear-gradient(135deg, #6366f1, #a855f7)',
  mood: '😄',
  joinDate: new Date().toISOString(),
};

const STORAGE_KEY = 'qcard_store_v1';

function loadState(): StoreState {
  if (typeof window === 'undefined') return getInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getInitialState();
}

function getInitialState(): StoreState {
  const activity = generateMockActivity();
  const { streak, maxStreak } = calculateStreak(activity);
  return {
    decks: mockDecks,
    cards: mockCards,
    profile: DEFAULT_PROFILE,
    activity,
    streak,
    maxStreak,
    lastStudyDate: activity.find(a => a.minutesStudied > 0)?.date ?? '',
  };
}

function saveState(state: StoreState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ── Hook ─────────────────────────────────────────────────────

export function useStore() {
  const [state, setState] = useState<StoreState>(getInitialState);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  const update = useCallback((updater: (prev: StoreState) => StoreState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // ── Profile ──────────────────────────────────────────────
  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    update(s => ({ ...s, profile: { ...s.profile, ...profile } }));
  }, [update]);

  // ── Decks ────────────────────────────────────────────────
  const addDeck = useCallback((deck: Omit<Deck, 'id'>) => {
    const id = `d_${Date.now()}`;
    update(s => ({ ...s, decks: [...s.decks, { ...deck, id }] }));
    return id;
  }, [update]);

  const updateDeck = useCallback((id: string, changes: Partial<Deck>) => {
    update(s => ({ ...s, decks: s.decks.map(d => d.id === id ? { ...d, ...changes } : d) }));
  }, [update]);

  const deleteDeck = useCallback((id: string) => {
    update(s => ({
      ...s,
      decks: s.decks.filter(d => d.id !== id),
      cards: s.cards.filter(c => c.deckId !== id),
    }));
  }, [update]);

  // ── Cards ────────────────────────────────────────────────
  const addCard = useCallback((card: Omit<Card, 'id' | 'sm2Data'>) => {
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newCard: Card = { ...card, id, sm2Data: sm2InitialData() };
    update(s => ({ ...s, cards: [...s.cards, newCard] }));
    return id;
  }, [update]);

  const updateCard = useCallback((id: string, changes: Partial<Card>) => {
    update(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...changes } : c) }));
  }, [update]);

  const deleteCard = useCallback((id: string) => {
    update(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
  }, [update]);

  // ── Import cards ─────────────────────────────────────────
  const importCards = useCallback((deckId: string, pairs: { front: string; back: string }[]) => {
    const newCards: Card[] = pairs.map((p, i) => ({
      id: `c_import_${Date.now()}_${i}`,
      deckId,
      front: p.front.trim(),
      back: p.back.trim(),
      sm2Data: sm2InitialData(),
    }));
    update(s => ({ ...s, cards: [...s.cards, ...newCards] }));
    return newCards.length;
  }, [update]);

  // ── Activity / Streak ────────────────────────────────────
  const logActivity = useCallback((minutesStudied: number, cardsStudied: number, deckId: string) => {
    const todayStr = today();
    update(s => {
      const existing = s.activity.find(a => a.date === todayStr);
      let newActivity: ActivityDay[];
      if (existing) {
        newActivity = s.activity.map(a =>
          a.date === todayStr
            ? { ...a, minutesStudied: a.minutesStudied + minutesStudied, cardsStudied: a.cardsStudied + cardsStudied, deckIds: [...new Set([...a.deckIds, deckId])] }
            : a
        );
      } else {
        newActivity = [...s.activity, { date: todayStr, minutesStudied, cardsStudied, deckIds: [deckId] }];
      }
      const { streak, maxStreak } = calculateStreak(newActivity);
      return { ...s, activity: newActivity, streak, maxStreak, lastStudyDate: todayStr };
    });
  }, [update]);

  return {
    ...state,
    updateProfile,
    addDeck, updateDeck, deleteDeck,
    addCard, updateCard, deleteCard,
    importCards, logActivity,
  };
}
