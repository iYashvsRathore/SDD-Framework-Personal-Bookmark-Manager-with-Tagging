import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';

/**
 * F06-T02: findLiveByNormalizedExcluding (LD-02) and update() (INV-10, the
 * unique-constraint race) against a real :memory: db, mirroring F01's own
 * repository-through-service testing style.
 */

const FIXED_NOW = '2025-01-15T10:30:00.000Z';
const LATER = '2025-01-15T11:00:00.000Z';

let db;
let tagRepository;
let repository;

function insertBookmark(url, title, createdAt = FIXED_NOW) {
  const info = db
    .prepare(
      `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, 'user', ?, ?, NULL)`
    )
    .run(url, url, title, createdAt, createdAt);
  return Number(info.lastInsertRowid);
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  tagRepository = createTagRepository(db);
  repository = createBookmarkRepository(db, tagRepository);
});

describe('findLiveByNormalizedExcluding (LD-02)', () => {
  it("returns null when the only live match is the row's own id (self-exclusion)", () => {
    const id = insertBookmark('https://example.com/a', 'A');

    expect(repository.findLiveByNormalizedExcluding('https://example.com/a', id)).toBeNull();
  });

  it('finds a genuine other-URL collision', () => {
    const otherId = insertBookmark('https://example.com/a', 'A');
    const editedId = insertBookmark('https://example.com/b', 'B');

    const found = repository.findLiveByNormalizedExcluding('https://example.com/a', editedId);

    expect(found.id).toBe(otherId);
  });
});

describe('update() — INV-10 and the tag-set replacement', () => {
  it('leaves created_at unchanged and advances updated_at', () => {
    const id = insertBookmark('https://example.com/a', 'A', FIXED_NOW);

    const saved = repository.update(id, {
      url: 'https://example.com/a-edited',
      url_normalized: 'https://example.com/a-edited',
      title: 'A edited',
      title_source: 'user',
      updated_at: LATER,
    });

    expect(saved.title).toBe('A edited');
    expect(saved.updated_at).toBe(LATER);

    const row = db.prepare('SELECT created_at FROM bookmark WHERE id = ?').get(id);
    expect(row.created_at).toBe(FIXED_NOW);
  });

  it('replaces the bookmark_tag set with the given tagNames', () => {
    const id = insertBookmark('https://example.com/a', 'A', FIXED_NOW);
    repository.update(
      id,
      {
        url: 'https://example.com/a',
        url_normalized: 'https://example.com/a',
        title: 'A',
        title_source: 'user',
        updated_at: LATER,
      },
      ['design']
    );

    const saved = repository.update(
      id,
      {
        url: 'https://example.com/a',
        url_normalized: 'https://example.com/a',
        title: 'A',
        title_source: 'user',
        updated_at: LATER,
      },
      ['research', 'docs']
    );

    expect(saved.tags).toEqual(['research', 'docs']);
    const linkedNames = db
      .prepare(
        `SELECT t.name FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.bookmark_id = ?`
      )
      .all(id)
      .map((r) => r.name)
      .sort();
    expect(linkedNames).toEqual(['docs', 'research']);
  });

  it('throws AppError NOT_FOUND when the row was deleted before the UPDATE runs', () => {
    const id = insertBookmark('https://example.com/a', 'A', FIXED_NOW);
    db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?').run(LATER, id);

    expect(() =>
      repository.update(id, {
        url: 'https://example.com/a',
        url_normalized: 'https://example.com/a',
        title: 'A',
        title_source: 'user',
        updated_at: LATER,
      })
    ).toThrowError(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }));
  });

  it('throws the identical DUPLICATE_URL body as insert() on a unique-constraint race', () => {
    const existingId = insertBookmark('https://example.com/a', 'A', FIXED_NOW);
    const editedId = insertBookmark('https://example.com/b', 'B', FIXED_NOW);

    // update()'s own findLiveByNormalizedExcluding would normally catch this
    // collision before the UPDATE runs; this calls update() with a URL that
    // already collides, forcing the UNIQUE constraint itself to reject the row
    // exactly as a genuine race would (symmetrical to insert()'s LD-02 path).
    expect(() =>
      repository.update(editedId, {
        url: 'https://example.com/a',
        url_normalized: 'https://example.com/a',
        title: 'B',
        title_source: 'user',
        updated_at: LATER,
      })
    ).toThrowError(expect.objectContaining({ code: 'DUPLICATE_URL', status: 409, existingId }));
  });
});
