CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS lift_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  lifted_at DATE NOT NULL,
  weight NUMERIC(8, 2) NOT NULL CHECK (weight > 0 AND weight <= 2000),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lift_entries_exercise_date_idx
  ON lift_entries (exercise_id, lifted_at DESC);

INSERT INTO exercises (id, name, display_order)
VALUES
  ('leg-press-one-leg', 'Leg press - one leg', 1),
  ('hip-thrust', 'Hip thrust', 2),
  ('leg-extension', 'Leg extension', 3),
  ('hip-adductor-machine', 'Hip adductor machine', 4)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    display_order = EXCLUDED.display_order;

