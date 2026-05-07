export const exercises = [
  { id: "leg-press-one-leg", name: "Leg press - one leg" },
  { id: "hip-thrust", name: "Hip thrust" },
  { id: "leg-extension", name: "Leg extension" },
  { id: "hip-adductor-machine", name: "Hip adductor machine" },
] as const;

export type ExerciseId = (typeof exercises)[number]["id"];

export const exerciseIds = exercises.map((exercise) => exercise.id) as ExerciseId[];

