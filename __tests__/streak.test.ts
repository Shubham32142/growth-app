import { describe, it, expect } from "bun:test";
import { computeStreak, isoWeekKey } from "../lib/streak";

// Helper: build a Date at UTC midnight for a given ISO string
function d(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

describe("computeStreak", () => {
  it("normal consecutive days builds streak", () => {
    // Mon–Fri completed (no missed days)
    const completions = [
      d("2026-04-27"), // Mon
      d("2026-04-28"), // Tue
      d("2026-04-29"), // Wed
      d("2026-04-30"), // Thu
      d("2026-05-01"), // Fri
    ];
    const today = d("2026-05-01");
    const { currentStreak } = computeStreak(completions, today);
    // 5 days Mon–Fri, Sat/Sun not reached yet → streak = 5
    expect(currentStreak).toBe(5);
  });

  it("Sunday is always free — no streak break on rest day", () => {
    // Complete Mon–Sat, skip Sunday, complete Mon
    const completions = [
      d("2026-04-27"), // Mon
      d("2026-04-28"), // Tue
      d("2026-04-29"), // Wed
      d("2026-04-30"), // Thu
      d("2026-05-01"), // Fri
      d("2026-05-02"), // Sat
      // skip Sun 2026-05-03
      d("2026-05-04"), // Mon
    ];
    const today = d("2026-05-04");
    const { currentStreak } = computeStreak(completions, today);
    // Mon–Sat (6) + Sun free (7) + Mon (8) = 8
    expect(currentStreak).toBe(8);
  });

  it("pardon absorbs one missed weekday per week", () => {
    const completions = [
      d("2026-04-27"), // Mon
      d("2026-04-28"), // Tue
      // skip Wed 2026-04-29 — pardon used here
      d("2026-04-30"), // Thu
      d("2026-05-01"), // Fri
    ];
    const today = d("2026-05-01");
    const { currentStreak, pardonUsedWeeks } = computeStreak(
      completions,
      today,
    );
    // Mon, Tue, Wed(pardon), Thu, Fri = 5
    expect(currentStreak).toBe(5);
    // Pardon should be recorded for week containing 2026-04-29
    expect(pardonUsedWeeks.has(isoWeekKey(d("2026-04-29")))).toBe(true);
  });

  it("second missed weekday in same week breaks streak (pardon exhausted)", () => {
    const completions = [
      d("2026-04-27"), // Mon
      d("2026-04-28"), // Tue
      // skip Wed 2026-04-29 — pardon used
      // skip Thu 2026-04-30 — pardon exhausted → streak resets
      d("2026-05-01"), // Fri — new streak of 1
    ];
    const today = d("2026-05-01");
    const { currentStreak } = computeStreak(completions, today);
    // After reset on Thu, only Fri counts = 1
    expect(currentStreak).toBe(1);
  });
});
