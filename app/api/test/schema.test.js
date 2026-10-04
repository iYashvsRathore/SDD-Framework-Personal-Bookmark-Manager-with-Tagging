import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../src/data/db.js';
import { SCHEMA_VERSION, bootstrapSchema } from '../src/data/schema.js';

const EXPECTED_TABLES = ['bookmark', 'bookmark_tag', 'setting', 'tag'];
const EXPECTED_INDEXES = [
  'ix_bookmark_list',
  'ix_bookmark_tag_lookup',
  'ux_bookmark_url_live',
  'ux_tag_name',
];

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name)
    .sort();
}

function indexNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name)
    .sort();
}

describe('schema bootstrap', () => {
  it('creates all four tables', () => {
    const db = createDb({ file: ':memory:' });
    expect(tableNames(db)).toEqual(EXPECTED_TABLES);
    db.close();
  });

  it('creates all four indexes', () => {
    const db = createDb({ file: ':memory:' });
    expect(indexNames(db)).toEqual(EXPECTED_INDEXES);
    db.close();
  });

  it('sets user_version to 1', () => {
    const db = createDb({ file: ':memory:' });
    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(db.pragma('user_version', { simple: true })).toBe(1);
    db.close();
  });

  // INV-12: SQLite defaults foreign_keys OFF, and a missed pragma silently
  // disables every foreign key in the model.
  it('reports PRAGMA foreign_keys = 1 on the connection', () => {
    const db = createDb({ file: ':memory:' });
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('actually enforces the bookmark_tag foreign keys', () => {
    const db = createDb({ file: ':memory:' });
    expect(() =>
      db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)').run(999, 999)
    ).toThrow(/FOREIGN KEY/i);
    db.close();
  });

  it('is idempotent — bootstrapping twice on one connection changes nothing', () => {
    const db = createDb({ file: ':memory:' });
    const before = { tables: tableNames(db), indexes: indexNames(db) };
    expect(() => bootstrapSchema(db)).not.toThrow();
    expect({ tables: tableNames(db), indexes: indexNames(db) }).toEqual(before);
    db.close();
  });

  // ux_bookmark_url_live is PARTIAL: it constrains live rows only (INV-03, AD-04).
  it('blocks a duplicate url_normalized among live rows but allows it once soft-deleted', () => {
    const db = createDb({ file: ':memory:' });
    const insert = db.prepare(
      `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, 'user', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', ?)`
    );
    insert.run('https://example.com/a', 'https://example.com/a', 'A', null);

    expect(() => insert.run('https://example.com/a', 'https://example.com/a', 'A again', null)) //
      .toThrow(/UNIQUE/i);

    db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = 1').run('2026-10-01T00:01:00.000Z');
    expect(() =>
      insert.run('https://example.com/a', 'https://example.com/a', 'A again', null)
    ).not.toThrow();

    db.close();
  });
});

describe('createDb', () => {
  it('sets synchronous = NORMAL', () => {
    const db = createDb({ file: ':memory:' });
    // 1 === NORMAL
    expect(db.pragma('synchronous', { simple: true })).toBe(1);
    db.close();
  });

  // Observed on better-sqlite3 13.0.3 (2026-10-01): the driver already turns
  // foreign_keys ON, unlike raw SQLite whose default is OFF as INV-12 describes.
  // Recorded as a finding against the INV-12 rationale, not a defect: db.js keeps
  // setting the pragma explicitly so the guarantee does not depend on a driver default.
  it('documents the driver default for foreign_keys', () => {
    const raw = new Database(':memory:');
    expect(raw.pragma('foreign_keys', { simple: true })).toBe(1);
    raw.close();
  });
});
