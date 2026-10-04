import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { escapeLikePattern } from '../src/lib/like-escape.js';

const FIXED_NOW = '2025-01-15T10:30:00.000Z';

let db;
let repository;

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  repository = createTagRepository(db);
});

describe('EC14 — upsertAndGetId is idempotent at the data level', () => {
  it('returns the identical id when called twice with the same name', () => {
    const first = repository.upsertAndGetId('research', FIXED_NOW);
    const second = repository.upsertAndGetId('research', FIXED_NOW);

    expect(second).toBe(first);
    expect(db.prepare('SELECT COUNT(*) AS n FROM tag').get().n).toBe(1);
  });

  it('creates a new row for a different name', () => {
    const first = repository.upsertAndGetId('research', FIXED_NOW);
    const second = repository.upsertAndGetId('docs', FIXED_NOW);

    expect(second).not.toBe(first);
    expect(db.prepare('SELECT COUNT(*) AS n FROM tag').get().n).toBe(2);
  });
});

describe('F02-AC11/AC13 — findByPrefix', () => {
  it('returns names in alphabetical order, matching the prefix', () => {
    for (const name of ['docs', 'design', 'database', 'urgent']) {
      repository.upsertAndGetId(name, FIXED_NOW);
    }

    const names = repository.findByPrefix(escapeLikePattern('d'), 10);

    expect(names).toEqual(['database', 'design', 'docs']);
  });

  it('respects the limit, returning the first N alphabetically', () => {
    for (let i = 0; i < 15; i += 1) {
      repository.upsertAndGetId(`s${String(i).padStart(2, '0')}`, FIXED_NOW);
    }

    const names = repository.findByPrefix(escapeLikePattern('s'), 10);

    expect(names).toHaveLength(10);
    expect(names).toEqual(['s00', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09']);
  });

  it('returns [] when nothing matches', () => {
    repository.upsertAndGetId('docs', FIXED_NOW);

    expect(repository.findByPrefix(escapeLikePattern('zz'), 10)).toEqual([]);
  });
});

describe('link', () => {
  it('links a tag to a bookmark without erroring on a duplicate pair', () => {
    db.prepare(
      `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at)
       VALUES ('https://example.com/a', 'https://example.com/a', 'Title', 'user', ?, ?)`
    ).run(FIXED_NOW, FIXED_NOW);
    const bookmarkId = db.prepare('SELECT id FROM bookmark').get().id;
    const tagId = repository.upsertAndGetId('docs', FIXED_NOW);

    repository.link(bookmarkId, tagId);
    repository.link(bookmarkId, tagId);

    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark_tag').get().n).toBe(1);
  });
});
