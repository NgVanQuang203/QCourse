/**
 * Vietnam-specific date utilities (UTC+7)
 */

/**
 * Get a date as YYYY-MM-DD in Vietnam timezone (UTC+7).
 */
export function getVNDateStr(date: Date = new Date()): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

/**
 * Get yesterday's date as YYYY-MM-DD in Vietnam timezone (UTC+7).
 */
export function getYesterdayVNStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getVNDateStr(yesterday);
}

/**
 * Formats a YYYY-MM-DD string into a Vietnamese long date string.
 * Example: "Thứ Sáu, 10 tháng 4 năm 2026"
 */
export function formatVNLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('vi', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}
