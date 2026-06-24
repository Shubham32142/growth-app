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

describe("pickTodaysTasks", () => {
  // dayInWeek is 0-based from the plan start: 0..5 working days, 6 = rest.
  it("returns contiguous balanced slice for the first working day (dayInWeek 0)", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(i + 1));

    const result = pickTodaysTasks(tasks, 0);

    expect(result.map((t) => t.order)).toEqual([1, 2]);
  });

  it("returns stable ordering for a later working day (dayInWeek 3)", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task(i + 1));

    const result = pickTodaysTasks(tasks, 3);

    expect(result.map((t) => t.order)).toEqual([6]);
  });

  it("returns empty list on the rest day (dayInWeek 6)", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task(i + 1));

    expect(pickTodaysTasks(tasks, 6)).toEqual([]);
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