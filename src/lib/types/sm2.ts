/**
 * Shared types for SM2 and FSRS data on the frontend.
 * This adapts backend progress data to frontend state.
 */

export interface SM2Data {
  // Legacy SM2 fields
  easiness: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;

  // FSRS fields
  stability?: number;
  difficulty?: number;
  state?: number;
  reps?: number;
  lapses?: number;
}

export const sm2InitialData = (): SM2Data => ({
  easiness: 2.5,
  interval: 0,
  repetitions: 0,
  nextReviewDate: Date.now(),
  stability: 0,
  difficulty: 0,
  state: 0,
  reps: 0,
  lapses: 0,
});
