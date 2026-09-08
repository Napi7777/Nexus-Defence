import {
  calculateConsecutiveStreak,
  formatDateKey,
  formatStreakDisplay,
  formatStreakProfileString,
  formatWeekRangeHeader,
  getMondayOfWeek,
  getTimeOfDayGreeting,
  getWeekStreakDays,
  parseStreakNumber,
} from '@/lib/streak';

describe('Streak & Calendar Utilities', () => {
  describe('formatDateKey', () => {
    it('formats dates consistently in YYYY-MM-DD local format', () => {
      const date = new Date(2026, 8, 8); // Sep 8, 2026
      expect(formatDateKey(date)).toBe('2026-09-08');
    });
  });

  describe('getMondayOfWeek', () => {
    it('identifies Monday correctly for any day of the week', () => {
      // Tuesday Sep 8, 2026 -> Monday should be Sep 7, 2026
      const tuesday = new Date(2026, 8, 8);
      const monday = getMondayOfWeek(tuesday);
      expect(monday.getDate()).toBe(7);
      expect(monday.getDay()).toBe(1);

      // Sunday Sep 13, 2026 -> Monday should still be Sep 7, 2026
      const sunday = new Date(2026, 8, 13);
      const mondayFromSunday = getMondayOfWeek(sunday);
      expect(mondayFromSunday.getDate()).toBe(7);

      // Monday Sep 7, 2026 -> Monday should be Sep 7, 2026
      const mondaySelf = getMondayOfWeek(new Date(2026, 8, 7));
      expect(mondaySelf.getDate()).toBe(7);
    });
  });

  describe('getWeekStreakDays', () => {
    it('generates a 7-day Monday-to-Sunday calendar relative to base date', () => {
      const tuesday = new Date(2026, 8, 8);
      const activeDates = ['2026-09-07']; // Active on Monday
      const isTodayActive = true; // Active on Tuesday (today)

      const week = getWeekStreakDays(activeDates, isTodayActive, tuesday);

      expect(week).toHaveLength(7);
      expect(week.map((d) => d.dayName)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      expect(week.map((d) => d.dayNumber)).toEqual([7, 8, 9, 10, 11, 12, 13]);

      // Monday: active, past, not today
      expect(week[0]).toMatchObject({
        dayName: 'Mon',
        dayNumber: 7,
        dateKey: '2026-09-07',
        isToday: false,
        isPast: true,
        isFuture: false,
        active: true,
      });

      // Tuesday: active, not past, today
      expect(week[1]).toMatchObject({
        dayName: 'Tue',
        dayNumber: 8,
        dateKey: '2026-09-08',
        isToday: true,
        isPast: false,
        isFuture: false,
        active: true,
      });

      // Wednesday: inactive, future, not today
      expect(week[2]).toMatchObject({
        dayName: 'Wed',
        dayNumber: 9,
        dateKey: '2026-09-09',
        isToday: false,
        isPast: false,
        isFuture: true,
        active: false,
      });
    });
  });

  describe('calculateConsecutiveStreak', () => {
    it('counts consecutive active days including today', () => {
      const tuesday = new Date(2026, 8, 8);
      const activeDates = ['2026-09-07', '2026-09-06', '2026-09-05'];
      const streak = calculateConsecutiveStreak(activeDates, true, tuesday);
      expect(streak).toBe(4); // Today (8th) + 7th + 6th + 5th
    });

    it('keeps streak alive when yesterday was active even if today is not active yet', () => {
      const tuesday = new Date(2026, 8, 8);
      const activeDates = ['2026-09-07', '2026-09-06', '2026-09-05'];
      const streak = calculateConsecutiveStreak(activeDates, false, tuesday);
      expect(streak).toBe(3); // 7th + 6th + 5th
    });

    it('returns 0 when both today and yesterday were inactive', () => {
      const tuesday = new Date(2026, 8, 8);
      const activeDates = ['2026-09-05', '2026-09-04']; // Skipped 6th and 7th
      const streak = calculateConsecutiveStreak(activeDates, false, tuesday);
      expect(streak).toBe(0);
    });
  });

  describe('parseStreakNumber & formatStreakDisplay', () => {
    it('parses streak numbers correctly', () => {
      expect(parseStreakNumber('5 days')).toBe(5);
      expect(parseStreakNumber('1 day')).toBe(1);
      expect(parseStreakNumber('12-Day Active')).toBe(12);
      expect(parseStreakNumber(7)).toBe(7);
      expect(parseStreakNumber(null)).toBe(0);
    });

    it('formats streak titles accurately', () => {
      expect(formatStreakDisplay(5)).toBe('5-Day Active Streak');
      expect(formatStreakDisplay(1)).toBe('1-Day Active Streak');
      expect(formatStreakDisplay(0)).toBe('0-Day Study Streak');
    });

    it('formats profile streak strings accurately', () => {
      expect(formatStreakProfileString(5)).toBe('5 days');
      expect(formatStreakProfileString(1)).toBe('1 day');
      expect(formatStreakProfileString(0)).toBe('0 days');
    });
  });

  describe('getTimeOfDayGreeting', () => {
    it('returns correct greeting for different hours', () => {
      const morning = new Date(2026, 8, 8, 9, 30);
      expect(getTimeOfDayGreeting(morning)).toBe('Good morning,');

      const afternoon = new Date(2026, 8, 8, 14, 15);
      expect(getTimeOfDayGreeting(afternoon)).toBe('Good afternoon,');

      const evening = new Date(2026, 8, 8, 19, 45);
      expect(getTimeOfDayGreeting(evening)).toBe('Good evening,');
    });
  });

  describe('formatWeekRangeHeader', () => {
    it('formats week header date range', () => {
      const tuesday = new Date(2026, 8, 8);
      expect(formatWeekRangeHeader(tuesday)).toBe('Sep 7 – 13');
    });
  });
});
