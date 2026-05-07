import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, "../../db/schema.sql");

const run = async () => {
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(schema);
  await pool.end();
  console.log("Database schema is ready.");
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});

