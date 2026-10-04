import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';
import { createApp } from '../src/app.js';

/**
 * F07-T06: bookmark-service.restore() and POST /api/bookmarks/:id/restore
 * (lld.md section 4, section 5, section 8). F07-AC4, AC7, AC8, AC10.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');

let db;
let tagRepository;
let repository;
let fetchTitle;
let tagService;
let service;

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  tagRepository = createTagRepository(db);
  repository = createBookmarkRepository(db, tagRepository);
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
  tagService = createTagService({ tagRepository });
  service = createBookmarkService({ repository, fetchTitle, tagService, now: () => FIXED_NOW });
});

/**
 * `restore()` is a plain synchronous function (lld.md section 11, matching
 * `list()`'s existing shape) — it throws directly, not via a rejected
 * promise, so `expect(...).rejects` cannot be used on the call itself.
 */
function captureError(fn) {
  try {
    fn();
    return undefined;
  } catch (err) {
    return err;
  }
}

describe('bookmark-service.restore() \u2014 F07-AC4: a successful restore', () => {
  it('clears deleted_at and returns the row, with created_at unchanged', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    await service.softDelete(created.id);

    const restored = await service.restore(created.id);

    expect(restored.deleted_at).toBeUndefined(); // SELECT_COLUMNS never selects deleted_at
    const row = db.prepare('SELECT * FROM bookmark WHERE id = ?').get(created.id);
    expect(row.deleted_at).toBeNull();
    expect(row.created_at).toBe(created.created_at);
  });

  it('the restored row reappears in list() at its original created_at position', async () => {
    const first = await service.create({ url: 'https://example.com/a', title: 'A' });
    await service.create({ url: 'https://example.com/b', title: 'B' });
    await service.softDelete(first.id);

    await service.restore(first.id);

    const { items } = service.list({});
    expect(items.map((i) => i.id)).toContain(first.id);
  });

  it('the row\u2019s tags survive the round trip through delete and restore untouched', async () => {
    const created = await service.create({
      url: 'https://example.com/a',
      title: 'A',
      tags: ['design', 'reading'],
    });
    await service.softDelete(created.id);
    await service.restore(created.id);

    const { items } = service.list({});
    const restoredItem = items.find((i) => i.id === created.id);
    expect(restoredItem.tags.sort()).toEqual(['design', 'reading']);
  });
});

describe('bookmark-service.restore() \u2014 F07-AC7, LD-03: the duplicate-URL race', () => {
  it('throws the restore-specific DUPLICATE_URL message when the URL was re-saved during the undo window', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    service.softDelete(created.id);
    const reAdded = await service.create({ url: 'https://example.com/a', title: 'A again' });

    const err = captureError(() => service.restore(created.id));

    expect(err).toMatchObject({
      code: 'DUPLICATE_URL',
      status: 409,
      message: 'That address has been saved again since. Nothing was restored.',
      field: 'url',
      existingId: reAdded.id,
    });

    // Nothing was restored \u2014 the original row is still soft-deleted.
    const row = db.prepare('SELECT * FROM bookmark WHERE id = ?').get(created.id);
    expect(row.deleted_at).not.toBeNull();
  });

  it('never confuses its message with duplicateUrlError()\u2019s create/edit wording', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    service.softDelete(created.id);
    await service.create({ url: 'https://example.com/a', title: 'A again' });

    const err = captureError(() => service.restore(created.id));

    expect(err).not.toMatchObject({
      message: 'You already saved this address.',
    });
  });
});

describe('bookmark-service.restore() \u2014 F07-AC8, AC10: not-found shapes', () => {
  it('a live (never-deleted) row is rejected with NOT_FOUND', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });

    const err = captureError(() => service.restore(created.id));

    expect(err).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('an already-restored row is rejected with NOT_FOUND on a second restore', async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'A' });
    service.softDelete(created.id);
    service.restore(created.id);

    const err = captureError(() => service.restore(created.id));

    expect(err).toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each([
    ['a never-existing id', 999999],
    ['zero', 0],
    ['a negative id', -1],
    ['a fractional id', 1.5],
    ['NaN', NaN],
  ])('%s is rejected with NOT_FOUND, never a 500', (_label, id) => {
    const err = captureError(() => service.restore(id));

    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('never calls the repository for a non-integer id', () => {
    const spy = vi.spyOn(repository, 'findDeletedById');

    const err = captureError(() => service.restore(NaN));

    expect(err).toMatchObject({ code: 'NOT_FOUND' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('POST /api/bookmarks/:id/restore \u2014 route-level, F07-AC4, AC7, AC8, AC10', () => {
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

  it('returns 200 with the restored bookmark for a soft-deleted row (F07-AC4)', async () => {
    const bookmark = await createOne('https://example.com/a');
    await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });

    const response = await fetch(`${base}/api/bookmarks/${bookmark.id}/restore`, {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bookmark.id).toBe(bookmark.id);
    expect(body.bookmark.url).toBe(bookmark.url);
  });

  it('returns 409 DUPLICATE_URL when the URL was re-saved during the undo window (F07-AC7)', async () => {
    const bookmark = await createOne('https://example.com/a');
    await fetch(`${base}/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });
    await createOne('https://example.com/a');

    const response = await fetch(`${base}/api/bookmarks/${bookmark.id}/restore`, {
      method: 'POST',
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: 'DUPLICATE_URL',
      message: 'That address has been saved again since. Nothing was restored.',
      field: 'url',
    });
  });

  it('returns 404 NOT_FOUND for a live (never-deleted) row (F07-AC8)', async () => {
    const bookmark = await createOne('https://example.com/a');

    const response = await fetch(`${base}/api/bookmarks/${bookmark.id}/restore`, {
      method: 'POST',
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-numeric :id, never a 500 (F07-AC10)', async () => {
    const response = await fetch(`${base}/api/bookmarks/not-a-number/restore`, { method: 'POST' });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });
});

/**
 * F07-AC15, NFR-02. tasks.md's Build-Verify Log claims this file covers AC15;
 * reading it end to end during /test-phase found no restart check at all —
 * added here, following restart-integrity.test.js's F06-AC9 proxy: close the
 * real file-backed connection and reopen a fresh one against the same file.
 */
describe('F07-AC15 \u2014 a restored bookmark keeps its tags and position after a close/reopen of the real file-backed db', () => {
  let dbFile;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'f07-ac15-')), 'tagvault.db');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
  });

  it('appears live, with its original tags and created_at, after the connection is closed and reopened', async () => {
    const firstDb = createDb({ file: dbFile });
    const firstTagRepository = createTagRepository(firstDb);
    const firstRepository = createBookmarkRepository(firstDb, firstTagRepository);
    const firstService = createBookmarkService({
      repository: firstRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: firstTagRepository }),
      now: () => FIXED_NOW,
    });

    const created = await firstService.create({
      url: 'https://example.com/a',
      title: 'A',
      tags: ['design', 'reading'],
    });
    await firstService.softDelete(created.id);
    await firstService.restore(created.id);

    firstDb.close();

    const reopenedDb = createDb({ file: dbFile });
    const reopenedTagRepository = createTagRepository(reopenedDb);
    const reopenedRepository = createBookmarkRepository(reopenedDb, reopenedTagRepository);
    const reopenedService = createBookmarkService({
      repository: reopenedRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: reopenedTagRepository }),
      now: () => FIXED_NOW,
    });

    const { items } = reopenedService.list({});
    const restored = items.find((i) => i.id === created.id);
    expect(restored).toBeDefined();
    expect(restored.created_at).toBe(created.created_at);
    expect(restored.tags.sort()).toEqual(['design', 'reading']);

    const row = reopenedDb.prepare('SELECT * FROM bookmark WHERE id = ?').get(created.id);
    expect(row.deleted_at).toBeNull();

    reopenedDb.close();
  });
});
