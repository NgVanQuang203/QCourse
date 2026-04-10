import { getVNDateStr, getYesterdayVNStr } from './date';

/**
 * Computes a user's current and max streak based on their last activity.
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
    newStreak = currentStreak;
  } else if (lastActiveDate === yesterday) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newMax      = Math.max(newStreak, maxStreak);
  const isNewRecord = newStreak > maxStreak;
  return { newStreak, newMax, isNewRecord };
}
