import { Entry, MOODS } from '../types';

export function calculateMonthlyStats(entries: Entry[], referenceDate: Date) {
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.date);
    return (
      d.getMonth() === referenceDate.getMonth() &&
      d.getFullYear() === referenceDate.getFullYear()
    );
  });

  const moods = thisMonth.reduce((acc, e) => {
    acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topMood = Object.entries(moods).sort(
    (a, b) => (b[1] as number) - (a[1] as number)
  )[0];

  return {
    count: thisMonth.length,
    topMood: topMood ? MOODS.find((m) => m.type === topMood[0]) : null,
  };
}

export function calculateStreak(entries: Entry[]): number {
  return entries.length;
}
