import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * NFR-04 / S1 / S3 / S4 probe, specific to F02's tag write path. Existing
 * `tag-service.test.js` charset tests use plain disallowed characters
 * (`re$earch`, `tag!`); this proves attack-SHAPED tag payloads (a SQL
 * metacharacter string, an XSS-shaped string) are rejected the same way, with
 * zero rows written and both the `tag` and `bookmark` tables intact afterward —
 * an OBSERVED property over real HTTP + a real database, not an assertion
 * about the code's structure.
 */

let server;
let base;
let db;

async function start() {
  const app = createApp({ db });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}

beforeEach(async () => {
  db = createDb({ file: ':memory:' });
  await start();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('F02 tag write path — attack-shaped payloads are rejected, no row written, tables survive', () => {
  it.each([
    ["SQL-metacharacter tag: '; DROP TABLE tag; --", "'; DROP TABLE tag; --"],
    ['XSS-shaped tag: <script>alert(1)</script>', '<script>alert(1)</script>'],
  ])('%s', async (_label, payload) => {
    const response = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/x', tags: [payload] }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_TAG');
    expect(body.error.field).toBe('tags');

    // No row written at all (C-F02-01) — not the bookmark, not a tag.
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark').get().n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM tag').get().n).toBe(0);

    // Both tables are still queryable — the payload never reached SQL as code.
    const bookmarkTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
      .get();
    const tagTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tag'")
      .get();
    expect(bookmarkTable).toBeDefined();
    expect(tagTable).toBeDefined();
  });

  it('an allowed-charset tag containing SQL-metacharacter-ADJACENT text (quotes stripped by the charset rule) still round-trips safely', async () => {
    // front-end dev_2 is already proven accepted elsewhere; this adds one more
    // observed proof that a *valid* tag is stored/returned literally, never
    // interpreted, with the table surviving — the positive-path twin of the
    // rejections above.
    const response = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/y', tags: ['safe tag-1'] }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.bookmark.tags).toEqual(['safe tag-1']);

    const rows = db.prepare('SELECT name FROM tag').all();
    expect(rows.map((r) => r.name)).toEqual(['safe tag-1']);
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tag'")
      .get();
    expect(tableCheck).toBeDefined();
  });
});

/**
 * F04's own probe: the tag FILTER (read) path, GET /api/bookmarks?tag=. The
 * write-path probes above cover F02's INVALID_TAG rejection; this proves the
 * separate, never-rejecting normalizeTagFilterValue()/buildPredicate() path
 * (lld.md section 9) is equally inert against an attack-shaped value — it must
 * return 200 with zero matches, never 400/500, and the tables must survive.
 */
describe('F04 tag FILTER path (GET ?tag=) — attack-shaped values are inert, always 200', () => {
  it.each([
    ["SQL-metacharacter tag filter: '; DROP TABLE bookmark; --", "'; DROP TABLE bookmark; --"],
    ['XSS-shaped tag filter: <script>alert(1)</script>', '<script>alert(1)</script>'],
  ])('%s', async (_label, payload) => {
    await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/x', tags: ['safe-tag'] }),
    });

    const response = await fetch(`${base}/api/bookmarks?${new URLSearchParams({ tag: payload })}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ items: [], total: 0, page: 1, size: 20 });

    // The earlier, legitimately-saved bookmark is untouched and the tables survive.
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark').get().n).toBe(1);
    const bookmarkTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
      .get();
    const tagTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tag'")
      .get();
    expect(bookmarkTable).toBeDefined();
    expect(tagTable).toBeDefined();
  });
});
