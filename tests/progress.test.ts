import { describe, expect, it } from "vitest";
import { aggregateProgress, LiftEntry } from "../src/shared/progress";

const entries: LiftEntry[] = [
  {
    id: "1",
    exerciseId: "hip-thrust",
    exerciseName: "Hip thrust",
    liftedAt: "2026-01-05",
    weight: 100,
    unit: "kg",
    notes: "",
  },
  {
    id: "2",
    exerciseId: "hip-thrust",
    exerciseName: "Hip thrust",
    liftedAt: "2026-01-07",
    weight: 110,
    unit: "kg",
    notes: "",
  },
  {
    id: "3",
    exerciseId: "hip-thrust",
    exerciseName: "Hip thrust",
    liftedAt: "2026-02-08",
    weight: 120,
    unit: "kg",
    notes: "",
  },
];

describe("aggregateProgress", () => {
  it("keeps the best weight for each weekly period", () => {
    const [progress] = aggregateProgress(entries, "weekly");

    expect(progress.points).toEqual([
      {
        periodStart: "2026-01-05",
        label: "Week of Jan 5",
        bestWeight: 110,
        entryCount: 2,
      },
      {
        periodStart: "2026-02-02",
        label: "Week of Feb 2",
        bestWeight: 120,
        entryCount: 1,
      },
    ]);
  });

  it("groups by month on demand", () => {
    const [progress] = aggregateProgress(entries, "monthly");

    expect(progress.points.map((point) => point.label)).toEqual(["Jan 2026", "Feb 2026"]);
    expect(progress.points.map((point) => point.bestWeight)).toEqual([110, 120]);
  });

  it("groups by quarter and year", () => {
    expect(aggregateProgress(entries, "quarterly")[0].points).toHaveLength(1);
    expect(aggregateProgress(entries, "yearly")[0].points).toHaveLength(1);
  });
});

