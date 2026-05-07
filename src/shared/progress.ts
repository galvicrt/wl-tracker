export type ProgressRange = "weekly" | "monthly" | "quarterly" | "yearly";

export type LiftEntry = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  liftedAt: string;
  weight: number;
  unit: "kg" | "lb";
  notes: string;
};

export type ProgressPoint = {
  periodStart: string;
  label: string;
  bestWeight: number;
  entryCount: number;
};

export type ExerciseProgress = {
  exerciseId: string;
  exerciseName: string;
  points: ProgressPoint[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const toUtcDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
  return weekStart;
};

const getQuarterStart = (date: Date) => {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1));
};

export const getPeriodStart = (dateString: string, range: ProgressRange) => {
  const date = toUtcDate(dateString);

  if (range === "weekly") {
    return isoDate(getWeekStart(date));
  }

  if (range === "monthly") {
    return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  }

  if (range === "quarterly") {
    return isoDate(getQuarterStart(date));
  }

  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), 0, 1)));
};

export const getPeriodLabel = (periodStart: string, range: ProgressRange) => {
  const date = toUtcDate(periodStart);

  if (range === "weekly") {
    return `Week of ${dateFormatter.format(date)}`;
  }

  if (range === "monthly") {
    return monthFormatter.format(date);
  }

  if (range === "quarterly") {
    return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }

  return String(date.getUTCFullYear());
};

export const aggregateProgress = (
  entries: LiftEntry[],
  range: ProgressRange,
): ExerciseProgress[] => {
  const byExercise = new Map<string, ExerciseProgress>();

  for (const entry of entries) {
    const exerciseProgress =
      byExercise.get(entry.exerciseId) ??
      ({
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        points: [],
      } satisfies ExerciseProgress);

    const periodStart = getPeriodStart(entry.liftedAt, range);
    const existingPoint = exerciseProgress.points.find(
      (point) => point.periodStart === periodStart,
    );

    if (existingPoint) {
      existingPoint.bestWeight = Math.max(existingPoint.bestWeight, entry.weight);
      existingPoint.entryCount += 1;
    } else {
      exerciseProgress.points.push({
        periodStart,
        label: getPeriodLabel(periodStart, range),
        bestWeight: entry.weight,
        entryCount: 1,
      });
    }

    byExercise.set(entry.exerciseId, exerciseProgress);
  }

  return [...byExercise.values()]
    .map((exerciseProgress) => ({
      ...exerciseProgress,
      points: exerciseProgress.points.sort((a, b) =>
        a.periodStart.localeCompare(b.periodStart),
      ),
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
};

