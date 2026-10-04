import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';
import { createApp } from '../src/app.js';

/**
 * F07-T05: bookmark-service.softDelete() and DELETE /api/bookmarks/:id
 * (lld.md section 4, section 5, section 8). F07-AC3, AC6, AC9, AC10.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');

let db;
let tagRepository;
let repository;
let fetchTitle;
let tagService;
let service;

function liveRows() {
  return db.prepare('SELECT * FROM bookmark WHERE deleted_at IS NULL').all();
}

/**
 * `softDelete`/`restore` are plain synchronous functions (lld.md section 11,
 * matching `list()`'s existing shape) — they throw directly, not via a
 * rejected promise, so `expect(...).rejects` cannot be used on the call
 * itself (its argument would already have thrown before `expect()` runs).
 */
function captureError(fn) {
  try {
    fn();
    return undefined;
  } catch (err) {
    return err;
  }
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  tagRepository = createTagRepository(db);
  repository = createBookmarkRepository(db, tagRepository);
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
  tagService = createTagService({ tagRepository });
  service = createBookmarkService({ repository, fetchTitle, tagService, now: () => FIXED_NOW });
});

describe('bookmark-service.softDelete() — F07-AC3, AC9', () => {
  it('sets deleted_at on the row and leaves every other column untouched', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });

    await service.softDelete(created.id);

    const row = db.prepare('SELECT * FROM bookmark WHERE id = ?').get(created.id);
    expect(row.deleted_at).not.toBeNull();
    expect(row.url).toBe(created.url);
    expect(row.title).toBe(created.title);
    expect(row.created_at).toBe(created.created_at);
  });

  it('a soft-deleted row no longer appears in list()', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    await service.softDelete(created.id);

    const { items, total } = service.list({});

    expect(items.find((i) => i.id === created.id)).toBeUndefined();
    expect(total).toBe(0);
  });

  it('leaves the row\u2019s tag links intact (INV-09) \u2014 a soft delete is an UPDATE, not a DELETE', async () => {
    const created = await service.create({
      url: 'https://example.com/a',
      title: 'A',
      tags: ['design'],
    });

    await service.softDelete(created.id);

    const links = db.prepare('SELECT * FROM bookmark_tag WHERE bookmark_id = ?').all(created.id);
    expect(links).toHaveLength(1);
  });
});

describe('bookmark-service.softDelete() \u2014 F07-AC6, EC21: already deleted', () => {
  it('a second softDelete on the same id throws NOT_FOUND, not an error', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    service.softDelete(created.id);

    const err = captureError(() => service.softDelete(created.id));

    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    // Still exactly one row, still soft-deleted \u2014 the second call changed nothing.
    expect(liveRows()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM bookmark').all()).toHaveLength(1);
  });
});

describe('bookmark-service.softDelete() \u2014 F07-AC10: every invalid :id shape', () => {
  it.each([
    ['a never-existing positive id', 999999],
    ['zero', 0],
    ['a negative id', -1],
    ['a fractional id', 1.5],
    ['NaN', NaN],
  ])('%s is rejected with NOT_FOUND, never a 500', (_label, id) => {
    const err = captureError(() => service.softDelete(id));

    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('never calls the repository for a non-integer id (no NaN ever reaches a bound parameter)', () => {
    const spy = vi.spyOn(repository, 'softDelete');

    const err = captureError(() => service.softDelete(NaN));

    expect(err).toMatchObject({ code: 'NOT_FOUND' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/bookmarks/:id \u2014 route-level, F07-AC3, AC6, AC9, AC10', () => {
  let server;
  let base;

  async function start() {
    const app = createApp({ db, fetchTitle, now: () => FIXED_NOW });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  async function createOne(url) {
    const response = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return (await response.json()).bookmark;
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns 204 with no body for a live row (F07-AC3)', async () => {
    const bookmark = await createOne('https://example.com/a');

    const response = await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    expect(response.status).toBe(204);
    const text = await response.text();
    expect(text).toBe('');
  });

  it('returns 404 NOT_FOUND for a row already deleted (F07-AC6, EC21)', async () => {
    const bookmark = await createOne('https://example.com/a');
    await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    const response = await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('That bookmark is no longer here.');
  });

  it('returns 404 for a non-numeric :id, never a 500 (F07-AC10)', async () => {
    const response = await fetch(`${base}/api/bookmarks/not-a-number`, { method: 'DELETE' });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('two rapid DELETE calls for the same row never produce a second visible error (F07-AC9, F07-EC1)', async () => {
    const bookmark = await createOne('https://example.com/a');

    const [first, second] = await Promise.all([
      fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' }),
      fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([204, 404]);
  });
});

/**
 * /test-phase F07-delete-bookmark. tasks.md's Build-Verify Log claims these ACs
 * were covered by this file already; reading the file end to end during testing
 * found no case that actually exercises them — added here as real, run checks.
 */
describe('DELETE /api/bookmarks/:id \u2014 route-level, F07-AC11: pagination clamp', () => {
  let server;
  let base;

  async function start() {
    const app = createApp({ db, fetchTitle, now: () => FIXED_NOW });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  async function createOne(url) {
    const response = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return (await response.json()).bookmark;
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('25 bookmarks at size=10, page=3 (1 item): deleting it clamps the next GET to page=2', async () => {
    // Newest-first ordering (F03-AC1): page 3 at size=10 against 25 rows holds
    // the 5 OLDEST rows, i.e. creation-order indices 0..4. Delete 4 of those 5
    // first, leaving exactly 1 remaining item on page 3, matching F07-AC11's
    // given.
    const created = [];
    for (let i = 0; i < 25; i += 1) {
      created.push(await createOne(`https://example.com/${i}`));
    }
    for (let i = 0; i < 4; i += 1) {
      await fetch(`${base}/api/bookmarks/${created[i].id}`, { method: 'DELETE' });
    }

    const beforeFinalDelete = await (await fetch(`${base}/api/bookmarks?page=3&size=10`)).json();
    expect(beforeFinalDelete.items).toHaveLength(1);

    await fetch(`${base}/api/bookmarks/${created[4].id}`, { method: 'DELETE' });

    const after = await (await fetch(`${base}/api/bookmarks?page=3&size=10`)).json();
    expect(after.page).toBe(2);
    expect(after.items).toHaveLength(10);
  });
});

describe('F07-AC12: deleting a tag\u2019s last live bookmark removes it from GET /api/tags', () => {
  let server;
  let base;

  async function start() {
    const app = createApp({ db, fetchTitle, now: () => FIXED_NOW });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('the tag rail no longer lists a tag once its one live bookmark is deleted', async () => {
    const createResponse = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/a', tags: ['design'] }),
    });
    const bookmark = (await createResponse.json()).bookmark;

    const before = await (await fetch(`${base}/api/tags`)).json();
    expect(before.map((t) => t.name)).toContain('design');

    await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    const after = await (await fetch(`${base}/api/tags`)).json();
    expect(after.map((t) => t.name)).not.toContain('design');
  });
});

describe('F07-AC13: deleting the last live bookmark empties GET /api/bookmarks', () => {
  let server;
  let base;

  async function start() {
    const app = createApp({ db, fetchTitle, now: () => FIXED_NOW });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns { items: [], total: 0 } once the one remaining live bookmark is deleted', async () => {
    const createResponse = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/a' }),
    });
    const bookmark = (await createResponse.json()).bookmark;

    await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    const body = await (await fetch(`${base}/api/bookmarks`)).json();
    expect(body).toMatchObject({ items: [], total: 0 });
  });
});

/**
 * F07-AC14, NFR-02. Real stop/restart check against a file-backed SQLite
 * file (not :memory:), following restart-integrity.test.js's F06-AC9 proxy:
 * close the connection, reopen a fresh one against the same file — the same
 * thing a process restart does to this file.
 */
describe('F07-AC14 \u2014 a soft-deleted bookmark stays deleted after a close/reopen of the real file-backed db', () => {
  let dbFile;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'f07-ac14-')), 'tagvault.db');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
  });

  it('does not appear in list() after the connection is closed and reopened, and remains soft-deleted', async () => {
    const firstDb = createDb({ file: dbFile });
    const firstTagRepository = createTagRepository(firstDb);
    const firstRepository = createBookmarkRepository(firstDb, firstTagRepository);
    const firstService = createBookmarkService({
      repository: firstRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: firstTagRepository }),
      now: () => FIXED_NOW,
    });

    const created = await firstService.create({ url: 'https://example.com/a', title: 'A' });
    await firstService.softDelete(created.id);

    firstDb.close();

    const reopenedDb = createDb({ file: dbFile });
    const reopenedRepository = createBookmarkRepository(
      reopenedDb,
      createTagRepository(reopenedDb)
    );
    const reopenedService = createBookmarkService({
      repository: reopenedRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: createTagRepository(reopenedDb) }),
      now: () => FIXED_NOW,
    });

    const { items, total } = reopenedService.list({});
    expect(items.find((i) => i.id === created.id)).toBeUndefined();
    expect(total).toBe(0);

    const row = reopenedDb.prepare('SELECT * FROM bookmark WHERE id = ?').get(created.id);
    expect(row.deleted_at).not.toBeNull();

    reopenedDb.close();
  });
});
