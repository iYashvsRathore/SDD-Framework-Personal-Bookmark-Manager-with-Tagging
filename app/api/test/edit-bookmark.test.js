import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';
import { createApp } from '../src/app.js';

/**
 * F06-T03: bookmark-service.update(), service-level (lld.md section 11). The
 * DB is real (:memory:) so LD-02's unique constraint and the real row-count
 * semantics are exercised; only the fetcher and the clock are faked.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');
const LATER = new Date('2025-01-15T11:00:00.000Z');

let db;
let tagRepository;
let repository;
let fetchTitle;
let tagService;
let service;

function makeService(overrides = {}) {
  return createBookmarkService({
    repository,
    fetchTitle,
    tagService,
    now: () => FIXED_NOW,
    ...overrides,
  });
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  tagRepository = createTagRepository(db);
  repository = createBookmarkRepository(db, tagRepository);
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
  tagService = createTagService({ tagRepository });
  service = makeService();
});

async function createOne(payload) {
  return service.create(payload);
}

describe('F06-AC2 — a valid edit is saved', () => {
  it('returns the saved row with created_at unchanged and updated_at advanced', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });

    const edited = await makeService({ now: () => LATER }).update(created.id, {
      url: 'https://example.com/b',
      title: 'Example B',
      tags: ['design'],
      updatedAt: created.updated_at,
    });

    expect(edited.url).toBe('https://example.com/b');
    expect(edited.title).toBe('Example B');
    expect(edited.title_source).toBe('user');
    expect(edited.tags).toEqual(['design']);
    expect(edited.created_at).toBe(created.created_at);
    expect(edited.updated_at).toBe(LATER.toISOString());
  });

  it('leaves the injected fetcher uncalled when a title is supplied', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });

    await service.update(created.id, {
      url: 'https://example.com/a',
      title: 'Still mine',
      updatedAt: created.updated_at,
    });

    expect(fetchTitle).not.toHaveBeenCalled();
  });
});

describe('F06-AC8 / C-F06-02 — clearing Title re-runs the fetch regardless of URL change', () => {
  it('re-runs the fetcher when no user title is supplied, URL unchanged', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });

    const edited = await service.update(created.id, {
      url: 'https://example.com/a',
      updatedAt: created.updated_at,
    });

    expect(fetchTitle).toHaveBeenCalledOnce();
    expect(edited.title_source).toBe('fetched');
  });

  it('stores the hostname, not an error, when the fetch fails', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });
    fetchTitle = vi.fn(async () => ({ ok: false, reason: 'timeout' }));
    service = makeService();

    const edited = await service.update(created.id, {
      url: 'https://example.com/a',
      updatedAt: created.updated_at,
    });

    expect(edited.title_source).toBe('hostname');
    expect(edited.title).toBe('example.com');
  });
});

describe("F06-AC3, F06-EC2 — resaving the record's own unchanged URL", () => {
  it('returns 200-equivalent (no throw), not DUPLICATE_URL', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });

    await expect(
      service.update(created.id, {
        url: 'https://example.com/a',
        title: 'Renamed only',
        updatedAt: created.updated_at,
      })
    ).resolves.toMatchObject({ title: 'Renamed only' });
  });
});

describe('F06-AC4 — editing into a collision with another bookmark', () => {
  it("throws DUPLICATE_URL with the other bookmark's id, tags and updatedAt", async () => {
    const a = await createOne({ url: 'https://example.com/a', title: 'A', tags: ['docs'] });
    const b = await createOne({ url: 'https://example.com/c', title: 'B' });

    await expect(
      service.update(b.id, {
        url: 'https://EXAMPLE.com/a/',
        updatedAt: b.updated_at,
      })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_URL',
      status: 409,
      existingId: a.id,
      details: {
        title: 'A',
        url: 'https://example.com/a',
        tags: ['docs'],
        updatedAt: a.updated_at,
      },
    });
  });
});

describe('F06-AC5, AC6 — the reused 400 branches', () => {
  it('rejects an empty URL with INVALID_URL, field url', async () => {
    const created = await createOne({ url: 'https://example.com/a' });

    await expect(
      service.update(created.id, { url: '', updatedAt: created.updated_at })
    ).rejects.toMatchObject({ code: 'INVALID_URL', status: 400, field: 'url' });
  });

  it('rejects 9 tags with INVALID_TAG, field tags', async () => {
    const created = await createOne({ url: 'https://example.com/a' });

    await expect(
      service.update(created.id, {
        url: 'https://example.com/a',
        tags: Array.from({ length: 9 }, (_, i) => `t${i}`),
        updatedAt: created.updated_at,
      })
    ).rejects.toMatchObject({ code: 'INVALID_TAG', status: 400, field: 'tags' });
  });

  it('does not modify the row on a 400', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Example' });

    await service.update(created.id, { url: '', updatedAt: created.updated_at }).catch(() => {});

    const row = repository.findLiveById(created.id);
    expect(row.title).toBe('Example');
  });
});

describe('F06-AC10 — the row no longer exists', () => {
  it('throws NOT_FOUND when the row was soft-deleted', async () => {
    const created = await createOne({ url: 'https://example.com/a' });
    db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?').run(
      '2025-01-16T00:00:00.000Z',
      created.id
    );

    await expect(
      service.update(created.id, { url: 'https://example.com/a', updatedAt: created.updated_at })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'That bookmark is no longer here.',
    });
  });

  it('throws NOT_FOUND for an id that never existed', async () => {
    await expect(
      service.update(9999, { url: 'https://example.com/a', updatedAt: '2025-01-15T10:30:00.000Z' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('F06-AC11 — EDIT_CONFLICT (AMD-003, LD-01)', () => {
  it('rejects a stale updatedAt', async () => {
    const created = await createOne({ url: 'https://example.com/a' });

    await expect(
      service.update(created.id, {
        url: 'https://example.com/a',
        updatedAt: '1999-01-01T00:00:00.000Z',
      })
    ).rejects.toMatchObject({
      code: 'EDIT_CONFLICT',
      status: 409,
      message: 'This bookmark changed in another tab. Reload to see the latest, then try again.',
    });
  });

  it('rejects a missing updatedAt', async () => {
    const created = await createOne({ url: 'https://example.com/a' });

    await expect(
      service.update(created.id, { url: 'https://example.com/a' })
    ).rejects.toMatchObject({ code: 'EDIT_CONFLICT' });
  });

  it('rejects a non-string updatedAt', async () => {
    const created = await createOne({ url: 'https://example.com/a' });

    await expect(
      service.update(created.id, { url: 'https://example.com/a', updatedAt: 12345 })
    ).rejects.toMatchObject({ code: 'EDIT_CONFLICT' });
  });

  it('never modifies the stored row on a conflict', async () => {
    const created = await createOne({ url: 'https://example.com/a', title: 'Original' });

    await service
      .update(created.id, {
        url: 'https://example.com/a',
        title: 'Hijacked',
        updatedAt: '1999-01-01T00:00:00.000Z',
      })
      .catch(() => {});

    const row = repository.findLiveById(created.id);
    expect(row.title).toBe('Original');
  });
});

describe('F06-EC1 — editing tags down to zero', () => {
  it('succeeds, storing tags: []', async () => {
    const created = await createOne({ url: 'https://example.com/a', tags: ['docs'] });

    const edited = await service.update(created.id, {
      url: 'https://example.com/a',
      tags: [],
      updatedAt: created.updated_at,
    });

    expect(edited.tags).toEqual([]);
  });
});

/**
 * F06-AC7 — editing never changes a row's place in the newest-first order,
 * because ordering is by created_at (INV-10), which UPDATE never touches.
 * tasks.md's F06-T11 covered this manually only; this closes it with an
 * automated check against the real list() path (AS02/AS03).
 */
describe('F06-AC7 — an edit never changes list ordering', () => {
  it("X (older) stays after Y (newer) even once X's title is edited and its updated_at advances", async () => {
    const x = await makeService({ now: () => new Date('2025-01-15T09:00:00.000Z') }).create({
      url: 'https://example.com/x',
      title: 'X',
    });
    const y = await makeService({ now: () => new Date('2025-01-15T09:30:00.000Z') }).create({
      url: 'https://example.com/y',
      title: 'Y',
    });

    await makeService({ now: () => new Date('2025-01-15T12:00:00.000Z') }).update(x.id, {
      url: 'https://example.com/x',
      title: 'X renamed',
      updatedAt: x.updated_at,
    });

    const { items } = service.list({ page: 1, size: 20 });

    expect(items.map((i) => i.id)).toEqual([y.id, x.id]);
    expect(items[1].title).toBe('X renamed');
  });
});

/**
 * F06-T04: PUT /bookmarks/:id over a real listener (hld.md section 5: HTTP
 * mapping only, no new business rule). Mirrors bookmarks-route.test.js's own
 * pattern.
 */
describe('PUT /api/bookmarks/:id', () => {
  let server;
  let base;
  let routeDb;
  let routeFetchTitle;

  async function start() {
    const app = createApp({ db: routeDb, fetchTitle: routeFetchTitle, now: () => FIXED_NOW });
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  function post(body) {
    return fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function put(id, body) {
    return fetch(`${base}/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(async () => {
    routeDb = createDb({ file: ':memory:' });
    routeFetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
    await start();
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    routeDb.close();
  });

  it('returns 200 and the saved bookmark on a valid edit (F06-AC2)', async () => {
    const created = await (await post({ url: 'https://example.com/a', title: 'A' })).json();

    const response = await put(created.bookmark.id, {
      url: 'https://example.com/b',
      title: 'B',
      updatedAt: created.bookmark.updated_at,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bookmark).toMatchObject({ url: 'https://example.com/b', title: 'B' });
  });

  it('returns 400 INVALID_URL for an empty address (F06-AC5)', async () => {
    const created = await (await post({ url: 'https://example.com/a' })).json();

    const response = await put(created.bookmark.id, {
      url: '',
      updatedAt: created.bookmark.updated_at,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_URL');
  });

  it('returns 404 NOT_FOUND for a soft-deleted row (F06-AC10)', async () => {
    const created = await (await post({ url: 'https://example.com/a' })).json();
    routeDb
      .prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?')
      .run('2025-01-16T00:00:00.000Z', created.bookmark.id);

    const response = await put(created.bookmark.id, {
      url: 'https://example.com/a',
      updatedAt: created.bookmark.updated_at,
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'That bookmark is no longer here.',
    });
  });

  it('returns 409 EDIT_CONFLICT for a stale updatedAt (F06-AC11)', async () => {
    const created = await (await post({ url: 'https://example.com/a' })).json();

    const response = await put(created.bookmark.id, {
      url: 'https://example.com/a',
      updatedAt: '1999-01-01T00:00:00.000Z',
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('EDIT_CONFLICT');
  });

  it('returns 409 DUPLICATE_URL when the edit collides with another bookmark (F06-AC4)', async () => {
    await post({ url: 'https://example.com/a', title: 'A' });
    const b = await (await post({ url: 'https://example.com/c', title: 'B' })).json();

    const response = await put(b.bookmark.id, {
      url: 'https://example.com/a',
      updatedAt: b.bookmark.updated_at,
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('DUPLICATE_URL');
  });

  it('returns 404 NOT_FOUND for an id that never existed', async () => {
    const response = await put(9999, {
      url: 'https://example.com/a',
      updatedAt: '2025-01-15T10:30:00.000Z',
    });

    expect(response.status).toBe(404);
  });

  /**
   * NFR-04/S4 — a SQL-metacharacter payload on the PUT path specifically.
   * F01's injection-probe.test.js only exercises POST; this is the first probe
   * aimed at PUT /api/bookmarks/:id (both the body fields and the route's own
   * :id parameter).
   */
  describe('NFR-04/S4 — SQL-metacharacter payloads on PUT are inert', () => {
    const SQLI_PAYLOAD = "'; DROP TABLE bookmark; --";

    it('stores a SQL-metacharacter title literally, table survives', async () => {
      const created = await (await post({ url: 'https://example.com/a', title: 'A' })).json();

      const response = await put(created.bookmark.id, {
        url: 'https://example.com/a',
        title: SQLI_PAYLOAD,
        updatedAt: created.bookmark.updated_at,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.bookmark.title).toBe(SQLI_PAYLOAD);

      const rows = routeDb.prepare('SELECT title FROM bookmark').all();
      expect(rows.some((r) => r.title === SQLI_PAYLOAD)).toBe(true);
      const tableCheck = routeDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
        .get();
      expect(tableCheck).toBeDefined();
    });

    it('a SQL-metacharacter URL query string round-trips literally, table survives', async () => {
      const created = await (await post({ url: 'https://example.com/a' })).json();
      const url = `https://example.com/search?q=${encodeURIComponent(SQLI_PAYLOAD)}`;

      const response = await put(created.bookmark.id, {
        url,
        updatedAt: created.bookmark.updated_at,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.bookmark.url).toBe(url);

      const tableCheck = routeDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
        .get();
      expect(tableCheck).toBeDefined();
    });

    it('a non-numeric, SQL-injection-shaped :id route parameter is a safe 404, not a 500', async () => {
      const response = await put('1;DROP TABLE bookmark;--', {
        url: 'https://example.com/a',
        updatedAt: '2025-01-15T10:30:00.000Z',
      });

      expect(response.status).toBe(404);
      const tableCheck = routeDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmark'")
        .get();
      expect(tableCheck).toBeDefined();
    });
  });
});
