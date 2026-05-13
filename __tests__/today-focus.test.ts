import { describe, it, expect } from "bun:test";
import { inferTaskBucket, pickTodaysTasks } from "../lib/today-focus";

function task(order: number, title?: string) {
  return {
    _id: `t-${order}`,
    title: title ?? `Task ${order}`,
    body: "",
    category: "technical" as const,
    order,
  };
}

function day(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

describe("pickTodaysTasks", () => {
  it("returns contiguous balanced slice for Monday", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(i + 1));

    const monday = day("2026-05-04");
    const result = pickTodaysTasks(tasks, monday);

    expect(result.map((t) => t.order)).toEqual([1, 2]);
  });

  it("returns stable ordering for later weekdays", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(i + 1));

    const thursday = day("2026-05-07");
    const result = pickTodaysTasks(tasks, thursday);

    expect(result.map((t) => t.order)).toEqual([6]);
  });

  it("returns empty list on Sunday rest day", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task(i + 1));

    const sunday = day("2026-05-10");
    expect(pickTodaysTasks(tasks, sunday)).toEqual([]);
  });
});

describe("inferTaskBucket", () => {
  it("maps common technical keywords to sub-buckets", () => {
    expect(
      inferTaskBucket({
        title: "Master JavaScript arrays",
        body: "Practice map, filter, reduce",
        category: "technical",
      }),
    ).toBe("JavaScript");

    expect(
      inferTaskBucket({
        title: "React hooks deep dive",
        body: "",
        category: "technical",
      }),
    ).toBe("React");
  });

  it("falls back to category label when no keyword matches", () => {
    expect(
      inferTaskBucket({
        title: "Reflect on your week",
        body: "Write about what you learned",
        category: "personal-growth",
      }),
    ).toBe("Personal Growth");
  });
});