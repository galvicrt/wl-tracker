import { FormEvent, useEffect, useMemo, useState } from "react";
import { exercises } from "../shared/exercises";
import { ExerciseProgress, LiftEntry, ProgressRange } from "../shared/progress";
import { ProgressChart } from "./ProgressChart";

const ranges: Array<{ id: ProgressRange; label: string }> = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

const today = new Date().toISOString().slice(0, 10);

type FormState = {
  exerciseId: string;
  liftedAt: string;
  weight: string;
  unit: "kg" | "lb";
  notes: string;
};

const initialFormState: FormState = {
  exerciseId: exercises[0].id,
  liftedAt: today,
  weight: "",
  unit: "kg",
  notes: "",
};

const api = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export function App() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [progress, setProgress] = useState<ExerciseProgress[]>([]);
  const [range, setRange] = useState<ProgressRange>("weekly");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refreshData = async (selectedRange = range) => {
    const [entryData, progressData] = await Promise.all([
      api<{ entries: LiftEntry[] }>("/api/entries"),
      api<{ progress: ExerciseProgress[] }>(`/api/progress?range=${selectedRange}`),
    ]);

    setEntries(entryData.entries);
    setProgress(progressData.progress);
  };

  useEffect(() => {
    refreshData().catch(() => setError("Unable to load lifting data."));
  }, []);

  const latestEntries = useMemo(() => entries.slice(0, 8), [entries]);

  const handleRangeChange = (nextRange: ProgressRange) => {
    setRange(nextRange);
    refreshData(nextRange).catch(() => setError("Unable to load progress data."));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!form.weight || Number(form.weight) <= 0) {
      setError("Enter a lifted weight greater than zero.");
      return;
    }

    setIsSaving(true);
    try {
      await api<{ id: string }>("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          exerciseId: form.exerciseId,
          liftedAt: form.liftedAt,
          weight: form.weight,
          unit: form.unit,
          notes: form.notes.trim(),
        }),
      });
      setForm((current) => ({ ...current, weight: "", notes: "" }));
      setStatus("Lift saved.");
      await refreshData();
    } catch {
      setError("Unable to save this lift. Check the database connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Strength progress</p>
          <h1 id="page-title">Weightlifting tracker</h1>
          <p className="intro">
            Log each lift, keep years of PostgreSQL-backed history, and switch the
            progress graph between weekly, monthly, quarterly, and yearly views.
          </p>
        </div>
        <div className="summary-card" aria-label="Training summary">
          <span>{entries.length}</span>
          <p>Total saved lift entries</p>
        </div>
      </section>

      <section className="content-grid">
        <form className="lift-form" onSubmit={handleSubmit} aria-labelledby="entry-title">
          <h2 id="entry-title">Add lift</h2>

          <label htmlFor="exercise">Exercise</label>
          <select
            id="exercise"
            value={form.exerciseId}
            onChange={(event) => setForm({ ...form, exerciseId: event.target.value })}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>

          <label htmlFor="lifted-at">Date</label>
          <input
            id="lifted-at"
            type="date"
            value={form.liftedAt}
            max={today}
            onChange={(event) => setForm({ ...form, liftedAt: event.target.value })}
          />

          <div className="split-fields">
            <div>
              <label htmlFor="weight">Weight</label>
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                min="0"
                max="2000"
                step="0.5"
                placeholder="0"
                value={form.weight}
                onChange={(event) => setForm({ ...form, weight: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                value={form.unit}
                onChange={(event) =>
                  setForm({ ...form, unit: event.target.value === "lb" ? "lb" : "kg" })
                }
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>

          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={form.notes}
            rows={3}
            maxLength={500}
            placeholder="Optional setup, reps, or machine notes"
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />

          {error ? (
            <p className="message error" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="message success" role="status">
              {status}
            </p>
          ) : null}

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save lift"}
          </button>
        </form>

        <section className="chart-panel" aria-labelledby="progress-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Progress graph</p>
              <h2 id="progress-title">Best lifted weight by period</h2>
            </div>
            <div className="range-control" aria-label="Progress range">
              {ranges.map((rangeOption) => (
                <button
                  key={rangeOption.id}
                  type="button"
                  className={range === rangeOption.id ? "selected" : ""}
                  aria-pressed={range === rangeOption.id}
                  onClick={() => handleRangeChange(rangeOption.id)}
                >
                  {rangeOption.label}
                </button>
              ))}
            </div>
          </div>

          <ProgressChart progress={progress} range={range} />
        </section>
      </section>

      <section className="history" aria-labelledby="history-title">
        <h2 id="history-title">Recent entries</h2>
        {latestEntries.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Exercise</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {latestEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.liftedAt}</td>
                    <td>{entry.exerciseName}</td>
                    <td>
                      {entry.weight} {entry.unit}
                    </td>
                    <td>{entry.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No lifts saved yet.</p>
        )}
      </section>
    </main>
  );
}

