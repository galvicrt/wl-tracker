import { describe, expect, it } from "vitest";
import { aggregateProgress, entryVolume, LiftEntry } from "../src/shared/progress";

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
        periodStart: "2026-02-02",
        label: "Week of Feb 2",
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
