import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

let server;
let base;
let db;
let clock;

async function start() {
  const app = createApp({
    db,
    fetchTitle: vi.fn(async () => ({ ok: false, reason: 'no-title' })),
    now: () => clock,
  });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}

/** Insert directly so created_at can be controlled precisely for ordering tests. */
function seed({ url, title, createdAt, deletedAt = null }) {
  return db
    .prepare(
      `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, 'user', ?, ?, ?)`
    )
    .run(url, url, title, createdAt, createdAt, deletedAt).lastInsertRowid;
}

function seedMany(count, { startAt = '2025-01-01T00:00:00.000Z' } = {}) {
  const start = new Date(startAt).getTime();
  for (let i = 0; i < count; i += 1) {
    seed({
      url: `https://example.com/${i}`,
      title: `Item ${i}`,
      createdAt: new Date(start + i * 1000).toISOString(),
    });
  }
}

beforeEach(async () => {
  db = createDb({ file: ':memory:' });
  clock = new Date('2025-01-15T10:30:00.000Z');
  await start();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('F03-AC2 — an empty list is the documented shape, not an error', () => {
  it('returns { items: [], total: 0, page: 1, size: 20 }', async () => {
    const response = await fetch(`${base}/api/bookmarks`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });
});

describe('F03-AC1 — ordering and shape', () => {
  it('returns newest created_at first', async () => {
    seed({ url: 'https://example.com/old', title: 'Old', createdAt: '2025-01-01T00:00:00.000Z' });
    seed({ url: 'https://example.com/new', title: 'New', createdAt: '2025-01-03T00:00:00.000Z' });
    seed({ url: 'https://example.com/mid', title: 'Mid', createdAt: '2025-01-02T00:00:00.000Z' });

    const { items } = await (await fetch(`${base}/api/bookmarks`)).json();

    expect(items.map((b) => b.title)).toEqual(['New', 'Mid', 'Old']);
  });

  it('excludes soft-deleted rows from both items and total', async () => {
    seed({ url: 'https://example.com/live', title: 'Live', createdAt: '2025-01-01T00:00:00.000Z' });
    seed({
      url: 'https://example.com/gone',
      title: 'Gone',
      createdAt: '2025-01-02T00:00:00.000Z',
      deletedAt: '2025-01-03T00:00:00.000Z',
    });

    const body = await (await fetch(`${base}/api/bookmarks`)).json();

    expect(body.items.map((b) => b.title)).toEqual(['Live']);
    expect(body.total).toBe(1);
  });

  it('never leaks url_normalized or deleted_at, and adds a tags array', async () => {
    const id = seed({
      url: 'https://example.com/a',
      title: 'A',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    db.prepare(
      "INSERT INTO tag (name, created_at) VALUES ('recipes', '2025-01-01T00:00:00.000Z')"
    ).run();
    db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, 1)').run(id);

    const { items } = await (await fetch(`${base}/api/bookmarks`)).json();

    expect(Object.keys(items[0]).sort()).toEqual([
      'created_at',
      'id',
      'tags',
      'title',
      'title_source',
      'updated_at',
      'url',
    ]);
    expect(items[0].tags).toEqual(['recipes']);
  });

  it('reports an empty tags array for a bookmark with zero tags (F03-EC5)', async () => {
    seed({ url: 'https://example.com/a', title: 'A', createdAt: '2025-01-01T00:00:00.000Z' });

    const { items } = await (await fetch(`${base}/api/bookmarks`)).json();

    expect(items[0].tags).toEqual([]);
  });
});

describe('F03-EC1 — a created_at tie is broken by id DESC, total and stable', () => {
  it('keeps the tie-break order across two consecutive identical requests', async () => {
    const sameInstant = '2025-01-01T00:00:00.000Z';
    const first = seed({ url: 'https://example.com/1', title: 'First', createdAt: sameInstant });
    const second = seed({ url: 'https://example.com/2', title: 'Second', createdAt: sameInstant });
    const third = seed({ url: 'https://example.com/3', title: 'Third', createdAt: sameInstant });

    const page1 = await (await fetch(`${base}/api/bookmarks?page=1&size=10`)).json();
    expect(page1.items.map((b) => b.id)).toEqual([third, second, first].map(Number));

    const page1Again = await (await fetch(`${base}/api/bookmarks?page=1&size=10`)).json();
    expect(page1Again.items.map((b) => b.id)).toEqual(page1.items.map((b) => b.id));
  });
});

describe('F03-AC3 — default page and size', () => {
  it('25 bookmarks: size=20 (default), page=1, items.length=20, total=25', async () => {
    seedMany(25);

    const body = await (await fetch(`${base}/api/bookmarks`)).json();

    expect(body.size).toBe(20);
    expect(body.page).toBe(1);
    expect(body.items).toHaveLength(20);
    expect(body.total).toBe(25);
  });
});

describe('F03-AC5 — invalid page/size never errors, always clamps', () => {
  it.each([
    ['?size=500', { size: 20 }],
    ['?size=7', { size: 20 }],
    ['?size=abc', { size: 20 }],
    ['?page=0', { page: 1 }],
    ['?page=-1', { page: 1 }],
    ['?page=abc', { page: 1 }],
    ['?q=%27%20OR%201%3D1--', {}], // an unrelated, injected-looking param is simply ignored
  ])('%s returns 200 with the documented fallback', async (query, expected) => {
    seedMany(5);

    const response = await fetch(`${base}/api/bookmarks${query}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    for (const [key, value] of Object.entries(expected)) {
      expect(body[key]).toBe(value);
    }
  });
});

describe('F03-AC6, F03-EC2 — a page beyond the last valid page clamps down to real rows', () => {
  it('25 bookmarks at size=10: page=99 clamps to page=3 with the real 5-row remainder', async () => {
    seedMany(25);

    const body = await (await fetch(`${base}/api/bookmarks?page=99&size=10`)).json();

    expect(body.page).toBe(3);
    expect(body.items).toHaveLength(5);
  });

  it('20 bookmarks at size=10 (exact multiple): the last page is 2, no phantom empty page 3', async () => {
    seedMany(20);

    const lastPage = await (await fetch(`${base}/api/bookmarks?page=2&size=10`)).json();
    expect(lastPage.items).toHaveLength(10);

    const beyond = await (await fetch(`${base}/api/bookmarks?page=3&size=10`)).json();
    expect(beyond.page).toBe(2);
    expect(beyond.items).toHaveLength(10);
  });
});

describe('NFR-04/S4 — SQL-injection-shaped values directly in page/size never reach SQL', () => {
  it.each([
    "1' OR '1'='1",
    '1;DROP TABLE bookmark;--',
    '1 OR 1=1',
    "' OR ''='",
    '1)); DROP TABLE bookmark; --',
  ])('page=%j is clamped to 1, never 400, and the bookmark table survives', async (payload) => {
    seedMany(5);

    const response = await fetch(`${base}/api/bookmarks?page=${encodeURIComponent(payload)}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.total).toBe(5);

    // The table itself is untouched: a second, unrelated request still works.
    const after = await (await fetch(`${base}/api/bookmarks`)).json();
    expect(after.total).toBe(5);
  });

  it.each(["20' OR '1'='1", '20;DROP TABLE bookmark;--', "' OR ''='"])(
    'size=%j is clamped to the default (20), never 400, and the bookmark table survives',
    async (payload) => {
      seedMany(5);

      const response = await fetch(`${base}/api/bookmarks?size=${encodeURIComponent(payload)}`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.size).toBe(20);

      const after = await (await fetch(`${base}/api/bookmarks`)).json();
      expect(after.total).toBe(5);
    }
  );
});

describe('GET /api/tags (LD-03)', () => {
  it('returns an empty array in F01', async () => {
    const response = await fetch(`${base}/api/tags`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it('omits a tag whose only bookmark is soft-deleted', async () => {
    const id = seed({
      url: 'https://example.com/a',
      title: 'A',
      createdAt: '2025-01-01T00:00:00.000Z',
      deletedAt: '2025-01-02T00:00:00.000Z',
    });
    db.prepare(
      "INSERT INTO tag (name, created_at) VALUES ('recipes', '2025-01-01T00:00:00.000Z')"
    ).run();
    db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, 1)').run(id);

    expect(await (await fetch(`${base}/api/tags`)).json()).toEqual([]);
  });
});

describe('the declared smoke contract (component-map.json)', () => {
  it('answers 200 on all three smoke endpoints', async () => {
    const results = {};
    for (const route of ['/api/health', '/api/bookmarks', '/api/tags']) {
      results[route] = (await fetch(`${base}${route}`)).status;
    }

    expect(results).toEqual({
      '/api/health': 200,
      '/api/bookmarks': 200,
      '/api/tags': 200,
    });
  });
});
