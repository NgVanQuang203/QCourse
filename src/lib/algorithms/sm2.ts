// src/lib/algorithms/sm2.ts
// SuperMemo 2 spaced repetition algorithm
// Original paper: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

export interface SM2State {
  interval: number;      // Days until next review
  repetitions: number;   // Consecutive correct responses
  easeFactor: number;    // EF — difficulty multiplier, min 1.3
  nextDueDate: Date;
}

/**
 * Quality of recall mapping for UI buttons:
 *   [Again] = 0  — Blackout / complete failure
 *   [Hard]  = 3  — Correct but very difficult
 *   [Good]  = 4  — Correct after hesitation
 *   [Easy]  = 5  — Perfect immediate recall
 */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Calculate new SM-2 state after a review.
 * @param state   Current SM-2 state for this card
 * @param quality Quality of recall (0–5)
 * @returns       New SM-2 state to persist
 */
export function calculateSM2(state: SM2State, quality: Quality): SM2State {
  let { interval, repetitions, easeFactor } = state;

  if (quality < 3) {
    // Incorrect recall — reset to beginning
    interval    = 1;
    repetitions = 0;
  } else {
    // Correct recall — advance
    if (repetitions === 0) {
      interval = 1;           // First correct: review tomorrow
    } else if (repetitions === 1) {
      interval = 6;           // Second correct: review in 6 days
    } else {
      interval = Math.round(interval * easeFactor);  // nth correct: multiply
    }
    repetitions += 1;
  }

  // Update ease factor (the SM-2 formula)
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);  // Floor at 1.3

  // Cap interval at 1 year
  interval = Math.min(interval, 365);

  // ── Tính toán Giờ Việt Nam (UTC+7) ──
  // Lấy giờ phút hiện tại theo chuẩn Quốc tế (UTC)
  const now = new Date();
  
  // Dịch sang giờ Việt Nam
  const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
  
  // Cộng số ngày interval
  vnTime.setDate(vnTime.getDate() + interval);
  
  // Set chuẩn 0h00 phút sáng (Nửa đêm bước sang ngày mới tại VN)
  vnTime.setHours(0, 0, 0, 0);
  
  // Trừ ngược đi 7 tiếng để lưu UTC gốc vào DB
  const nextDueDate = new Date(vnTime.getTime() - 7 * 3600 * 1000);

  return { interval, repetitions, easeFactor, nextDueDate };
}

/**
 * Get the default SM-2 state for a brand new card.
 */
export function defaultSM2State(): SM2State {
  return {
    interval:    1,
    repetitions: 0,
    easeFactor:  2.5,
    nextDueDate: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// src/lib/algorithms/streak.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get today's date as YYYY-MM-DD in Vietnam timezone (UTC+7).
 * This ensures streak consistency regardless of server timezone.
 */
export function getVNDateStr(date: Date = new Date()): string {
  // UTC+7 offset = 7 * 60 * 60 * 1000
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

export function getYesterdayVNStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getVNDateStr(yesterday);
}

/**
 * Calculate the new streak given the user's last active date.
 * Call this whenever a user completes a study session.
 *
 * @returns { newStreak, isNewRecord }
 */
export function computeNewStreak(
  currentStreak: number,
  maxStreak: number,
  lastActiveDate: string | null
): { newStreak: number; newMax: number; isNewRecord: boolean } {
  const today     = getVNDateStr();
  const yesterday = getYesterdayVNStr();

  let newStreak: number;

  if (lastActiveDate === today) {
    // Already studied today — no change
    newStreak = currentStreak;
  } else if (lastActiveDate === yesterday) {
    // Studied yesterday — extend streak
    newStreak = currentStreak + 1;
  } else {
    // Missed a day (or first ever) — reset
    newStreak = 1;
  }

  const newMax      = Math.max(newStreak, maxStreak);
  const isNewRecord = newStreak > maxStreak;

  return { newStreak, newMax, isNewRecord };
}

// ─────────────────────────────────────────────────────────────────────────────
// src/lib/algorithms/quiz.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizAnswerRecord {
  cardId:       string;
  chosenIndex:  number;  // 0-3 (A/B/C/D)
  correctIndex: number;  // 0-3
  timeSec:      number;  // How many seconds this question took
}

/**
 * Score a completed quiz attempt.
 * Speed bonus: answers faster than half the time limit earn extra points.
 */
export function scoreQuizAttempt(
  answers: QuizAnswerRecord[],
  timeLimitSec: number
): {
  correct:    number;
  total:      number;
  percentage: number;
  speedBonus: number;    // 0-10 extra percentage points
  grade:      'A' | 'B' | 'C' | 'D' | 'F';
} {
  const total   = answers.length;
  const correct = answers.filter(a => a.chosenIndex === a.correctIndex).length;
  const pct     = Math.round((correct / total) * 100);

  // Speed bonus — averaged normalised speed on correct answers
  const correctAnswers = answers.filter(a => a.chosenIndex === a.correctIndex);
  let speedBonus = 0;
  if (correctAnswers.length > 0) {
    const avgSpeedFactor = correctAnswers.reduce(
      (sum, a) => sum + Math.max(0, 1 - a.timeSec / timeLimitSec),
      0
    ) / correctAnswers.length;
    speedBonus = Math.round(avgSpeedFactor * 10);
  }

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    pct >= 90 ? 'A' :
    pct >= 80 ? 'B' :
    pct >= 70 ? 'C' :
    pct >= 60 ? 'D' : 'F';

  return { correct, total, percentage: pct, speedBonus, grade };
}
