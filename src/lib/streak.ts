/**
 * Daily study streak calculations and real-time week calendar utilities (SRS 3.9 / 3.10).
 */

export type StreakDay = {
  dayName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  dayNumber: number; // 1..31
  dateKey: string; // 'YYYY-MM-DD'
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  active: boolean;
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Formats a Date object to a local calendar key ('YYYY-MM-DD'). */
export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the Monday (00:00:00) of the calendar week containing the given date. */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = day === 0 ? 6 : day - 1; // Mon is 0, Sun is 6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an array of 7 StreakDay objects for the Monday-to-Sunday week containing `baseDate`.
 * Evaluates active state against `activeDates` (from database/storage) and today's session progress.
 */
export function getWeekStreakDays(
  activeDates: string[] = [],
  isTodayActive = false,
  baseDate: Date = new Date()
): StreakDay[] {
  const monday = getMondayOfWeek(baseDate);
  const todayKey = formatDateKey(baseDate);
  const todayMidnight = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
  const activeSet = new Set(activeDates);

  return DAY_NAMES.map((name, index) => {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    const dateKey = formatDateKey(dayDate);
    const dayMidnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
    const isToday = dateKey === todayKey;
    const isPast = dayMidnight < todayMidnight;
    const isFuture = dayMidnight > todayMidnight;

    const active = isToday
      ? isTodayActive || activeSet.has(dateKey)
      : activeSet.has(dateKey);

    return {
      dayName: name,
      dayNumber: dayDate.getDate(),
      dateKey,
      isToday,
      isPast,
      isFuture,
      active,
    };
  });
}

/**
 * Calculates the current consecutive day streak.
 * If today has not been completed yet, it checks if yesterday was active to keep the streak alive.
 */
export function calculateConsecutiveStreak(
  activeDates: string[] = [],
  isTodayActive = false,
  baseDate: Date = new Date()
): number {
  const todayKey = formatDateKey(baseDate);
  const dateSet = new Set(activeDates);
  if (isTodayActive) {
    dateSet.add(todayKey);
  }

  let count = 0;
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (dateSet.has(formatDateKey(current))) {
    count++;
    current.setDate(current.getDate() - 1);
  } else {
    current.setDate(current.getDate() - 1);
    if (!dateSet.has(formatDateKey(current))) {
      return 0;
    }
  }

  while (dateSet.has(formatDateKey(current))) {
    count++;
    current.setDate(current.getDate() - 1);
  }

  return count;
}

/** Parses numeric streak count from string values like '5 days' or '1 day'. */
export function parseStreakNumber(streakValue?: string | number | null): number {
  if (typeof streakValue === 'number') return Math.max(0, streakValue);
  if (!streakValue) return 0;
  const parsed = parseInt(String(streakValue).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Formats a numeric streak count into a user-friendly headline. */
export function formatStreakDisplay(streakCount: number): string {
  if (streakCount <= 0) return '0-Day Study Streak';
  if (streakCount === 1) return '1-Day Active Streak';
  return `${streakCount}-Day Active Streak`;
}

/** Formats a numeric streak count into a profile streak string like '5 days'. */
export function formatStreakProfileString(streakCount: number): string {
  if (streakCount <= 0) return '0 days';
  if (streakCount === 1) return '1 day';
  return `${streakCount} days`;
}

/** Returns a real-time greeting string based on the hour of the day. */
export function getTimeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning,';
  if (hour >= 12 && hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

/** Formats the Monday-Sunday week date range for display (e.g. 'Sep 7 – Sep 13'). */
export function formatWeekRangeHeader(baseDate: Date = new Date()): string {
  const monday = getMondayOfWeek(baseDate);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const mMonth = monday.toLocaleString('en-US', { month: 'short' });
  const sMonth = sunday.toLocaleString('en-US', { month: 'short' });
  if (mMonth === sMonth) {
    return `${mMonth} ${monday.getDate()} – ${sunday.getDate()}`;
  }
  return `${mMonth} ${monday.getDate()} – ${sMonth} ${sunday.getDate()}`;
}
