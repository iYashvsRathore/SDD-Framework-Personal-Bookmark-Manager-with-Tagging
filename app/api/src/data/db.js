import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { bootstrapSchema } from './schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Matches component-map.json's api.dataStore.location (data-model.md section 5). */
const DEFAULT_DB_FILE = path.resolve(here, '..', '..', 'data', 'tagvault.db');

/**
 * Opens (and if needed, creates) the SQLite connection, sets the durability
 * pragmas, and bootstraps the schema (data-model.md section 5).
 *
 * @param {{ file?: string }} [args] `':memory:'` for tests; omitted or a
 *   filesystem path for the real server (component-map.json's
 *   `api.dataStore.location`)
 * @returns {import('better-sqlite3').Database}
 */
export function createDb({ file = DEFAULT_DB_FILE } = {}) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new Database(file);

  // INV-12: SQLite defaults this OFF; every connection must set it explicitly.
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  bootstrapSchema(db);

  return db;
}
