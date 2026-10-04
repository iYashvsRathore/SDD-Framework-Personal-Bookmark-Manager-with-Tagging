import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createSettingRepository } from '../src/data/setting-repository.js';

const FIXED_NOW = '2025-01-15T10:30:00.000Z';
const LATER = '2025-01-15T11:00:00.000Z';

let db;
let repository;

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  repository = createSettingRepository(db);
});

describe('F08-AC1 — get on an empty table', () => {
  it('returns null when no row exists', () => {
    expect(repository.get('theme')).toBeNull();
  });
});

describe('F08-AC4 — upsert then get round-trips, and updates in place', () => {
  it('a fresh upsert is readable by a subsequent get', () => {
    repository.upsert('theme', 'dark', FIXED_NOW);

    expect(repository.get('theme')).toBe('dark');
  });

  it('a second upsert updates the same row rather than creating a second one', () => {
    repository.upsert('theme', 'dark', FIXED_NOW);
    repository.upsert('theme', 'light', LATER);

    expect(repository.get('theme')).toBe('light');
    expect(db.prepare('SELECT COUNT(*) AS n FROM setting').get().n).toBe(1);
  });

  it('updated_at advances on the second upsert', () => {
    repository.upsert('theme', 'dark', FIXED_NOW);
    repository.upsert('theme', 'light', LATER);

    expect(db.prepare('SELECT updated_at FROM setting WHERE key = ?').get('theme').updated_at).toBe(
      LATER
    );
  });
});
