import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';

/**
 * NFR-04 / S4 probe — SQL metacharacters in both the URL and the title are stored
 * and returned as ordinary data, never interpreted, and the table survives. This is
 * an OBSERVED check (the payload round-trips and the table still exists afterward),
 * not an assertion about the code's structure — bookmark-repository.js already uses
 * bound parameters throughout (lld.md section 5), and this proves the property that
 * matters rather than re-reading the source.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');
const SQLI_PAYLOAD = "'; DROP TABLE bookmark; --";

let db;
let repository;
let fetchTitle;

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  repository = createBookmarkRepository(db);
  fetchTitle = vi.fn(async () => ({ ok: true, title: SQLI_PAYLOAD }));
});

describe('NFR-04 / S4 — a SQL-metacharacter payload in the title is inert', () => {
  it('stores the fetched title literally and the bookmark table still exists', async () => {
    const service = createBookmarkService({ repository, fetchTitle, now: () => FIXED_NOW });

    const bookmark = await service.create({ url: 'https://example.com/x' });

    expect(bookmark.title).toBe(SQLI_PAYLOAD);

    // The table was not dropped: a query against it still succeeds and returns the row.
    const rows = db.prepare('SELECT title FROM bookmark').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe(SQLI_PAYLOAD);
  });

  it('stores a user-supplied title with the same payload literally', async () => {
    fetchTitle = vi.fn(async () => ({ ok: true, title: 'unused' }));
    const service = createBookmarkService({ repository, fetchTitle, now: () => FIXED_NOW });

    const bookmark = await service.create({ url: 'https://example.com/y', title: SQLI_PAYLOAD });

    expect(bookmark.title).toBe(SQLI_PAYLOAD);
    expect(fetchTitle).not.toHaveBeenCalled();

    const rows = db.prepare('SELECT title FROM bookmark').all();
    expect(rows.some((r) => r.title === SQLI_PAYLOAD)).toBe(true);
  });

  it('a query string carrying the same payload is stored and returned unchanged, table intact', async () => {
    const service = createBookmarkService({ repository, fetchTitle, now: () => FIXED_NOW });
    const url = `https://example.com/search?q=${encodeURIComponent(SQLI_PAYLOAD)}`;

    const bookmark = await service.create({ url });

    expect(bookmark.url).toBe(url);
    const rows = db.prepare('SELECT url FROM bookmark').all();
    expect(rows.some((r) => r.url === url)).toBe(true);
    // The table itself still exists and is queryable — the ultimate observed proof.
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
      .get();
    expect(tableCheck).toBeDefined();
  });
});
