export { getVNDateStr } from '../utils/date';
export { computeNewStreak } from '../utils/streak';

export interface SM2State {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextDueDate: Date;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function calculateSM2(state: SM2State, quality: Quality): SM2State {
  let { interval, repetitions, easeFactor } = state;

  if (quality < 3) {
    interval    = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);
  interval = Math.min(interval, 365);

  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
  vnTime.setDate(vnTime.getDate() + interval);
  vnTime.setHours(0, 0, 0, 0);
  const nextDueDate = new Date(vnTime.getTime() - 7 * 3600 * 1000);

  return { interval, repetitions, easeFactor, nextDueDate };
}

export function defaultSM2State(): SM2State {
  return {
    interval:    1,
    repetitions: 0,
    easeFactor:  2.5,
    nextDueDate: new Date(),
  };
}


export interface QuizAnswerRecord {
  cardId:       string;
  chosenIndex:  number;
  correctIndex: number;
  timeSec:      number;
}

export function scoreQuizAttempt(
  answers: QuizAnswerRecord[],
  timeLimitSec: number
): {
  correct:    number;
  total:      number;
  percentage: number;
  speedBonus: number;
  grade:      'A' | 'B' | 'C' | 'D' | 'F';
} {
  const total   = answers.length;
  const correct = answers.filter(a => a.chosenIndex === a.correctIndex).length;
  const pct     = Math.round((correct / total) * 100);

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
