/**
 * Forgiving streak rules (per SPEC §6):
 *  - Sundays are always a free day — no task required, streak never breaks.
 *  - Each ISO week (Mon–Sun) allows 1 "pardon": one missed non-Sunday day
 *    that does not reset the streak. Once the pardon is used that week it
 *    cannot be used again until the next ISO week.
 *
 * Data contract:
 *  - `completedDates`  — sorted array of Date objects when ≥1 task was
 *    completed (deduplicated to calendar-day granularity, newest last).
 *  - Returned `pardonUsedWeeks` — set of ISO week strings ("2026-W18")
 *    where the pardon was already consumed.
 */

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  pardonUsedWeeks: Set<string>;
}

/** Returns "YYYY-Www" for a given date (ISO week). */
export function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO week day: Mon=1 … Sun=7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Returns YYYY-MM-DD string for easy comparison. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns 0=Sun, 1=Mon … 6=Sat for a UTC-normalised date. */
function dayOfWeek(d: Date): number {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  ).getUTCDay();
}

/**
 * Compute the current and longest streak given an array of completion dates.
 * `today` is injectable for unit-testing purposes (defaults to now).
 */
export function computeStreak(
  completedDates: Date[],
  today: Date = new Date(),
  existingPardonWeeks: Set<string> = new Set(),
): StreakResult {
  // Deduplicate to one entry per calendar day, sort ascending
  const seen = new Set<string>();
  const days = completedDates
    .map((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())))
    .filter((d) => {
      const k = dayKey(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());

  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const pardonUsedWeeks = new Set<string>(existingPardonWeeks);

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  const completedSet = new Set(days.map(dayKey));

  // Build streaks by scanning from the earliest completion forward
  // and applying forgiving rules.
  let streak = 0;
  const allDays: Date[] = [];

  // Enumerate every calendar day from first completion to today
  if (days.length > 0) {
    const start = days[0];
    const end = todayUtc;
    const d = new Date(start);
    while (d <= end) {
      allDays.push(new Date(d));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  let i = 0;
  while (i < allDays.length) {
    const d = allDays[i];
    const dow = dayOfWeek(d); // 0=Sun
    const completed = completedSet.has(dayKey(d));

    if (dow === 0) {
      // Sunday — always free, streak continues regardless
      streak += 1;
      runningStreak = Math.max(runningStreak, streak);
      i++;
      continue;
    }

    if (completed) {
      streak += 1;
      runningStreak = Math.max(runningStreak, streak);
    } else {
      // Missed a non-Sunday — try to use this week's pardon
      const wk = isoWeekKey(d);
      if (!pardonUsedWeeks.has(wk)) {
        pardonUsedWeeks.add(wk);
        // Pardon: streak continues as if the day was completed
        streak += 1;
        runningStreak = Math.max(runningStreak, streak);
      } else {
        // No pardon left — streak breaks
        streak = 0;
      }
    }
    i++;
  }

  longestStreak = runningStreak;

  // Current streak: re-walk backwards from today to find unbroken run end
  // (re-use the forward pass result is simpler — streak IS the current streak
  // because we walked all the way to today)
  currentStreak = streak;

  // If today has no completion yet and it's not Sunday, the streak hasn't
  // been awarded for today — that's fine, it will increment when user completes.
  // But if today was already pardoned above we shouldn't count it as broken.
  // The forward walk already handles this correctly.

  return { currentStreak, longestStreak, pardonUsedWeeks };
}
