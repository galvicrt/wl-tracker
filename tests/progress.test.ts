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

describe("getPeriodStart weekly – getWeekStart behaviour", () => {
  // 2026-02-08 is a Sunday; under the new logic Sunday maps to itself (daysFromMonday=0).
  it("treats Sunday as the start of its own week (regression: was rolling back to the previous Monday)", () => {
    expect(getPeriodStart("2026-02-08", "weekly")).toBe("2026-02-08");
  });

  // Monday must stay on Monday (daysFromMonday=0 unchanged).
  it("keeps Monday as the week start", () => {
    expect(getPeriodStart("2026-02-09", "weekly")).toBe("2026-02-09");
  });

  // Tuesday – Saturday each roll back to the preceding Monday.
  it("rolls Tuesday back to the preceding Monday", () => {
    expect(getPeriodStart("2026-02-10", "weekly")).toBe("2026-02-09");
  });

  it("rolls Wednesday back to the preceding Monday", () => {
    expect(getPeriodStart("2026-02-11", "weekly")).toBe("2026-02-09");
  });

  it("rolls Thursday back to the preceding Monday", () => {
    expect(getPeriodStart("2026-02-12", "weekly")).toBe("2026-02-09");
  });

  it("rolls Friday back to the preceding Monday", () => {
    expect(getPeriodStart("2026-02-13", "weekly")).toBe("2026-02-09");
  });

  it("rolls Saturday back to the preceding Monday", () => {
    expect(getPeriodStart("2026-02-14", "weekly")).toBe("2026-02-09");
  });

  // A Sunday at a different date confirms the Sunday rule is not date-specific.
  it("treats any Sunday as its own week start (2026-01-11)", () => {
    expect(getPeriodStart("2026-01-11", "weekly")).toBe("2026-01-11");
  });

  // The day immediately after a Sunday should start a new Monday-anchored week.
  it("does not merge Monday with the preceding Sunday week", () => {
    // 2026-01-11 is Sunday → week "2026-01-11"
    // 2026-01-12 is Monday → week "2026-01-12"
    expect(getPeriodStart("2026-01-11", "weekly")).not.toBe(
      getPeriodStart("2026-01-12", "weekly"),
    );
    expect(getPeriodStart("2026-01-12", "weekly")).toBe("2026-01-12");
  });

  // Boundary check: Sunday entries produce distinct period keys from adjacent Mon-Sat entries.
  it("groups Mon-Sat entries together but keeps Sunday separate", () => {
    const sundayEntry: LiftEntry = { id: "s", ...base, liftedAt: "2026-02-08", weight: 50, sets: 1, reps: 1 };
    const mondayEntry: LiftEntry = { id: "m", ...base, liftedAt: "2026-02-09", weight: 60, sets: 1, reps: 1 };
    const saturdayEntry: LiftEntry = { id: "sa", ...base, liftedAt: "2026-02-14", weight: 70, sets: 1, reps: 1 };

    const [progress] = aggregateProgress([sundayEntry, mondayEntry, saturdayEntry], "weekly");

    expect(progress.points).toHaveLength(2);
    expect(progress.points[0].periodStart).toBe("2026-02-08"); // Sunday alone
    expect(progress.points[1].periodStart).toBe("2026-02-09"); // Mon–Sat
    expect(progress.points[1].entryCount).toBe(2);             // Monday + Saturday grouped together
  });
});
