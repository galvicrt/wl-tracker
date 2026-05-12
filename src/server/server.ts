import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { pool } from "./db";
import { exerciseIds } from "../shared/exercises";
import { aggregateProgress, LiftEntry, ProgressRange } from "../shared/progress";

const app = express();
const port = Number(process.env.PORT ?? 4173);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../../dist/client");

app.use(express.json());

const entrySchema = z.object({
  exerciseId: z.enum(exerciseIds as [string, ...string[]]),
  liftedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.coerce.number().positive().max(2000),
  unit: z.enum(["kg", "lb"]).default("kg"),
  notes: z.string().max(500).default(""),
});

const rangeSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);

/** node-pg returns DATE as a JS Date; String(date).slice(0, 10) is not YYYY-MM-DD. */
const liftedAtToIsoDate = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? "");
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return match ? match[1] : s.slice(0, 10);
};

const mapEntry = (row: Record<string, unknown>): LiftEntry => ({
  id: String(row.id),
  exerciseId: String(row.exercise_id),
  exerciseName: String(row.exercise_name),
  liftedAt: liftedAtToIsoDate(row.lifted_at),
  weight: Number(row.weight),
  unit: row.unit === "lb" ? "lb" : "kg",
  notes: String(row.notes ?? ""),
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/exercises", async (_request, response, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM exercises ORDER BY display_order ASC",
    );
    response.json({ exercises: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/entries", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT lift_entries.id,
              lift_entries.exercise_id,
              exercises.name AS exercise_name,
              lift_entries.lifted_at,
              lift_entries.weight,
              lift_entries.unit,
              lift_entries.notes
       FROM lift_entries
       JOIN exercises ON exercises.id = lift_entries.exercise_id
       ORDER BY lift_entries.lifted_at DESC, lift_entries.created_at DESC
       LIMIT 5000`,
    );

    response.json({ entries: result.rows.map(mapEntry) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/entries", async (request, response, next) => {
  try {
    const entry = entrySchema.parse(request.body);
    const result = await pool.query(
      `INSERT INTO lift_entries (exercise_id, lifted_at, weight, unit, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [entry.exerciseId, entry.liftedAt, entry.weight, entry.unit, entry.notes],
    );

    response.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

app.get("/api/progress", async (request, response, next) => {
  try {
    const range = rangeSchema.parse(request.query.range ?? "weekly") as ProgressRange;
    const result = await pool.query(
      `SELECT lift_entries.id,
              lift_entries.exercise_id,
              exercises.name AS exercise_name,
              lift_entries.lifted_at,
              lift_entries.weight,
              lift_entries.unit,
              lift_entries.notes
       FROM lift_entries
       JOIN exercises ON exercises.id = lift_entries.exercise_id
       ORDER BY lift_entries.lifted_at ASC`,
    );

    response.json({ progress: aggregateProgress(result.rows.map(mapEntry), range) });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(publicDir));

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(publicDir, "index.html"));
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }

    console.error(error);
    response.status(500).json({ error: "Unexpected server error" });
  },
);

app.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on http://127.0.0.1:${port}`);
});
