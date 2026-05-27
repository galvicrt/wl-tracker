import { describe, expect, it } from "vitest";
import { aggregateProgress, entryVolume, getPeriodStart, LiftEntry } from "../src/shared/progress";

const base = {
  exerciseId: "hip-thrust",
  exerciseName: "Hip thrust",
  unit: "kg" as const,
  notes: "",
};

const entries: LiftEntry[] = [
  {
    id: "1",
    ...base,
    liftedAt: "2026-01-05",
    weight: 100,
    sets: 1,
    reps: 1,
  },
  {
    id: "2",
    ...base,
    liftedAt: "2026-01-07",
    weight: 110,
    sets: 1,
    reps: 1,
  },
  {
    id: "3",
    ...base,
    liftedAt: "2026-02-08",
    weight: 120,
    sets: 1,
    reps: 1,
  },
];

describe("aggregateProgress", () => {
  it("keeps the best volume for each weekly period", () => {
    const [progress] = aggregateProgress(entries, "weekly");

    expect(progress.points).toEqual([
      {
        periodStart: "2026-01-05",
        label: "Week of Jan 5",
        bestVolume: 110,
        volumeWeight: 110,
        volumeSets: 1,
        volumeReps: 1,
        volumeUnit: "kg",
        entryCount: 2,
      },
      {
        periodStart: "2026-02-08",
        label: "Week of Feb 8",
        bestVolume: 120,
        volumeWeight: 120,
        volumeSets: 1,
        volumeReps: 1,
        volumeUnit: "kg",
        entryCount: 1,
      },
    ]);
  });

  it("prefers higher volume over higher weight alone", () => {
    const sameWeek: LiftEntry[] = [
      {
        id: "a",
        ...base,
        liftedAt: "2026-03-02",
        weight: 120,
        sets: 2,
        reps: 5,
      },
      {
        id: "b",
        ...base,
        liftedAt: "2026-03-03",
        weight: 100,
        sets: 4,
        reps: 10,
      },
    ];
    expect(entryVolume(sameWeek[0])).toBe(1200);
    expect(entryVolume(sameWeek[1])).toBe(4000);

    const [progress] = aggregateProgress(sameWeek, "weekly");
    expect(progress.points).toHaveLength(1);
    expect(progress.points[0].bestVolume).toBe(4000);
    expect(progress.points[0].volumeWeight).toBe(100);
    expect(progress.points[0].volumeSets).toBe(4);
    expect(progress.points[0].volumeReps).toBe(10);
  });

  it("groups by month on demand", () => {
    const [progress] = aggregateProgress(entries, "monthly");

    expect(progress.points.map((point) => point.label)).toEqual(["Jan 2026", "Feb 2026"]);
    expect(progress.points.map((point) => point.bestVolume)).toEqual([110, 120]);
  });

  it("groups by quarter and year", () => {
    expect(aggregateProgress(entries, "quarterly")[0].points).toHaveLength(1);
    expect(aggregateProgress(entries, "yearly")[0].points).toHaveLength(1);
  });
});

describe("getPeriodStart weekly — Sunday is a week start, not end of previous week", () => {
  // Week calendar used by getWeekStart after the fix:
  //   Mon 2026-01-05  Tue 2026-01-06  Wed 2026-01-07  Thu 2026-01-08
  //   Fri 2026-01-09  Sat 2026-01-10  Sun 2026-01-11 ← own week start
  //   Mon 2026-01-12  …

  it("Sunday maps to itself (week starts on Sunday)", () => {
    // 2026-01-04 is a Sunday; should not be pushed back to the previous Monday
    expect(getPeriodStart("2026-01-04", "weekly")).toBe("2026-01-04");
  });

  it("Monday maps to itself", () => {
    expect(getPeriodStart("2026-01-05", "weekly")).toBe("2026-01-05");
  });

  it("Tuesday maps back to Monday", () => {
    expect(getPeriodStart("2026-01-06", "weekly")).toBe("2026-01-05");
  });

  it("Wednesday maps back to Monday", () => {
    expect(getPeriodStart("2026-01-07", "weekly")).toBe("2026-01-05");
  });

  it("Saturday maps back to Monday", () => {
    expect(getPeriodStart("2026-01-10", "weekly")).toBe("2026-01-05");
  });

  it("Sunday following a Mon-Sat span is a new week start, not in the prior week", () => {
    // 2026-01-11 is the Sunday after the Mon 2026-01-05 week; it must start its own week
    expect(getPeriodStart("2026-01-11", "weekly")).toBe("2026-01-11");
    expect(getPeriodStart("2026-01-11", "weekly")).not.toBe("2026-01-05");
  });

  it("Saturday and the immediately following Sunday belong to different weeks", () => {
    const saturday = getPeriodStart("2026-01-10", "weekly"); // Sat → Mon 2026-01-05
    const sunday = getPeriodStart("2026-01-11", "weekly");   // Sun → 2026-01-11
    expect(saturday).not.toBe(sunday);
    expect(saturday).toBe("2026-01-05");
    expect(sunday).toBe("2026-01-11");
  });

  it("month-boundary Sunday starts its own week", () => {
    // 2026-03-01 is a Sunday
    expect(getPeriodStart("2026-03-01", "weekly")).toBe("2026-03-01");
  });

  it("regression: Sunday entry is grouped in its own week, not the preceding Monday week", () => {
    const sundayEntry: LiftEntry = {
      id: "sun",
      exerciseId: "squat",
      exerciseName: "Squat",
      unit: "kg",
      notes: "",
      liftedAt: "2026-01-11", // Sunday
      weight: 100,
      sets: 3,
      reps: 5,
    };
    const mondayEntry: LiftEntry = {
      id: "mon",
      exerciseId: "squat",
      exerciseName: "Squat",
      unit: "kg",
      notes: "",
      liftedAt: "2026-01-05", // Monday of the prior week
      weight: 90,
      sets: 3,
      reps: 5,
    };
    const [progress] = aggregateProgress([mondayEntry, sundayEntry], "weekly");
    expect(progress.points).toHaveLength(2);
    expect(progress.points[0].periodStart).toBe("2026-01-05");
    expect(progress.points[1].periodStart).toBe("2026-01-11");
  });
});
