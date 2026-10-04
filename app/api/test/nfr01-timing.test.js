import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * NFR-01 (product-spec.md) — REAL, MEASURED timing, not estimated (Q6, RK05).
 *
 * "With 1,000 bookmarks stored... a list page renders in < 1 s." F03 is this
 * NFR's primary owner (spec.md section 4); F04 (tag filter) and F05 (search)
 * co-own the tighter < 500ms budget (F05-RV02). This seeds 1,000 synthetic
 * rows per the data-model.md section 6 recipe (https://example.com/article/{n},
 * ~20 tags with 0-8 tags each, created_at spread over a synthetic range),
 * starts a REAL HTTP server against a REAL (in-memory) SQLite connection, and
 * times repeated real GET /api/bookmarks requests with Date.now() wall-clock
 * measurement.
 */

const SEED_COUNT = 1000;
const TAG_COUNT = 20;
const REPS = 20;

let server;
let base;
let db;

function seedOneThousand() {
  const insertTag = db.prepare('INSERT INTO tag (name, created_at) VALUES (?, ?)');
  const insertBookmark = db.prepare(
    `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, 'user', ?, ?, NULL)`
  );
  const insertLink = db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)');

  const seedAll = db.transaction(() => {
    const tagIds = [];
    for (let t = 0; t < TAG_COUNT; t += 1) {
      const info = insertTag.run(`tag-${t}`, '2025-01-01T00:00:00.000Z');
      tagIds.push(Number(info.lastInsertRowid));
    }

    const start = new Date('2025-01-01T00:00:00.000Z').getTime();
    for (let n = 0; n < SEED_COUNT; n += 1) {
      const createdAt = new Date(start + n * 1000).toISOString();
      const info = insertBookmark.run(
        `https://example.com/article/${n}`,
        `https://example.com/article/${n}`,
        `Sample bookmark ${n}`,
        createdAt,
        createdAt
      );
      const bookmarkId = Number(info.lastInsertRowid);
      // 0-8 tags per bookmark, deterministic spread (no randomness needed to prove timing)
      const tagsForThis = n % 9;
      for (let k = 0; k < tagsForThis; k += 1) {
        insertLink.run(bookmarkId, tagIds[(n + k) % TAG_COUNT]);
      }
    }
  });

  seedAll();
}

beforeAll(async () => {
  db = createDb({ file: ':memory:' });
  seedOneThousand();

  const app = createApp({ db });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('NFR-01 — a list page renders in < 1s at 1,000 seeded bookmarks (observed, not simulated); F05-RV02', () => {
  it(`page 1 (default size=20): median and max over ${REPS} real requests are each < 1000ms`, async () => {
    const timings = [];
    for (let i = 0; i < REPS; i += 1) {
      const start = Date.now();
      const response = await fetch(`${base}/api/bookmarks?page=1&size=20`);
      const body = await response.json();
      timings.push(Date.now() - start);
      expect(response.status).toBe(200);
      expect(body.total).toBe(SEED_COUNT);
      expect(body.items).toHaveLength(20);
    }

    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length / 2)];
    const max = timings[timings.length - 1];

    console.log(`NFR-01 page=1&size=20 — median=${median}ms max=${max}ms (n=${REPS})`);

    expect(median).toBeLessThan(1000);
    expect(max).toBeLessThan(1000);
  }, 15000);

  it(`the last page (size=20, page=50): median and max over ${REPS} real requests are each < 1000ms`, async () => {
    const timings = [];
    for (let i = 0; i < REPS; i += 1) {
      const start = Date.now();
      const response = await fetch(`${base}/api/bookmarks?page=50&size=20`);
      const body = await response.json();
      timings.push(Date.now() - start);
      expect(response.status).toBe(200);
      expect(body.page).toBe(50);
      expect(body.items).toHaveLength(20);
    }

    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length / 2)];
    const max = timings[timings.length - 1];

    console.log(`NFR-01 page=50&size=20 (last page) — median=${median}ms max=${max}ms (n=${REPS})`);

    expect(median).toBeLessThan(1000);
    expect(max).toBeLessThan(1000);
  }, 15000);
});

describe('NFR-01 — a search query returns in < 500ms at 1,000 seeded bookmarks (F05, co-owner with F04; F05-RV02)', () => {
  it(`a search query (q=bookmark, size=20): median and max over ${REPS} real requests are each < 500ms`, async () => {
    const timings = [];
    for (let i = 0; i < REPS; i += 1) {
      const start = Date.now();
      const response = await fetch(
        `${base}/api/bookmarks?${new URLSearchParams({ q: 'bookmark', size: '20' })}`
      );
      const body = await response.json();
      timings.push(Date.now() - start);
      expect(response.status).toBe(200);
      expect(body.total).toBe(SEED_COUNT);
      expect(body.items).toHaveLength(20);
    }

    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length / 2)];
    const max = timings[timings.length - 1];

    console.log(`NFR-01 q=bookmark&size=20 — median=${median}ms max=${max}ms (n=${REPS})`);

    expect(median).toBeLessThan(500);
    expect(max).toBeLessThan(500);
  }, 15000);
});

describe('NFR-01 — the tag filter returns in < 500ms at 1,000 seeded bookmarks (F04, primary owner)', () => {
  it(`tag=tag-5 (size=20): median and max over ${REPS} real requests are each < 500ms`, async () => {
    const timings = [];
    for (let i = 0; i < REPS; i += 1) {
      const start = Date.now();
      const response = await fetch(
        `${base}/api/bookmarks?${new URLSearchParams({ tag: 'tag-5', size: '20' })}`
      );
      const body = await response.json();
      timings.push(Date.now() - start);
      expect(response.status).toBe(200);
      expect(body.items.length).toBeGreaterThan(0);
    }

    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length / 2)];
    const max = timings[timings.length - 1];

    console.log(`NFR-01 tag=tag-5&size=20 — median=${median}ms max=${max}ms (n=${REPS})`);

    expect(median).toBeLessThan(500);
    expect(max).toBeLessThan(500);
  }, 15000);
});
