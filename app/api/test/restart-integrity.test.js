import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';

/**
 * Two declared-open items from lld.md, given dedicated fault-injection coverage
 * rather than left to /review-phase as an assumption.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');

let db;
let repository;
let fetchTitle;

function liveRows() {
  return db.prepare('SELECT * FROM bookmark').all();
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  repository = createBookmarkRepository(db);
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
});

/**
 * EC19 — "Application restarted mid-write". spec.md carries this to /test-phase as
 * a fault-injection item rather than an AC, because a real process kill mid-write
 * cannot be driven from a test. This is the closest in-process proxy available: it
 * proves the property the write path RELIES ON to make EC19 true — that
 * bookmark-repository.js's insert is one real SQLite transaction, so an error
 * partway through leaves NOTHING behind, never a half-written row.
 */
describe('EC19 (fault-injection proxy) — no partial write survives an aborted transaction', () => {
  it('a raw multi-statement transaction that throws after inserting leaves zero rows', () => {
    expect(liveRows()).toHaveLength(0);

    const faultyWrite = db.transaction(() => {
      db.prepare(
        `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
         VALUES ('https://example.com/a', 'https://example.com/a', 'A', 'user', '2025-01-15T10:30:00.000Z', '2025-01-15T10:30:00.000Z', NULL)`
      ).run();
      // Simulate the process dying / a downstream step failing after the insert
      // but before commit — e.g. a second write in the same logical operation.
      throw new Error('simulated mid-transaction failure');
    });

    expect(() => faultyWrite()).toThrow('simulated mid-transaction failure');
    // The whole transaction rolled back: the insert above did NOT survive.
    expect(liveRows()).toHaveLength(0);
  });

  it('the real create() insert transaction is single-statement and atomic: a constraint failure leaves the prior row intact and adds nothing', async () => {
    const service = createBookmarkService({ repository, fetchTitle, now: () => FIXED_NOW });
    await service.create({ url: 'https://example.com/a', title: 'First' });
    expect(liveRows()).toHaveLength(1);

    // Force the same logical write to fail at the DB constraint (the LD-02 path).
    await expect(service.create({ url: 'https://example.com/a' })).rejects.toMatchObject({
      code: 'DUPLICATE_URL',
    });

    // Still exactly one row — the failed attempt left no partial trace.
    expect(liveRows()).toHaveLength(1);
  });
});

/**
 * AMD-002 section 4's named cheap check: no live url_normalized should end in "/"
 * with a non-empty path, now that normalizeUrl strips ANY trailing slash (not only
 * an empty path). Verified against the real service + real SQLite, not just the
 * pure normalizeUrl unit tests in url-normalize.test.js.
 */
describe('AMD-002 section 4 cheap check — no stored url_normalized ends in "/"', () => {
  it('every url_normalized from a variety of inputs is free of a trailing slash', async () => {
    const service = createBookmarkService({ repository, fetchTitle, now: () => FIXED_NOW });

    const inputs = [
      'https://example.com/a/',
      'https://example.com/a/b/c/',
      'https://example.com',
      'https://another.example.com/deep/path/',
      'https://another.example.com/deep/path2/',
    ];

    for (const url of inputs) {
      await service.create({ url });
    }

    const rows = liveRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (row.url_normalized.length === 0) continue;
      const afterScheme = row.url_normalized.replace(/^https?:\/\//, '');
      // A bare host with no path at all (no "/" anywhere after the host) is fine;
      // what must never happen is a trailing "/" that follows a non-empty path.
      const hasPath = afterScheme.includes('/');
      if (hasPath) {
        expect(row.url_normalized.endsWith('/')).toBe(false);
      }
    }
  });
});

/**
 * F06-AC9 / NFR-02 — an edited bookmark survives a restart with its edited
 * values, not its pre-edit ones, and created_at unchanged. lld.md section 11
 * names the real multi-process restart as out of scope for automation and
 * carries it to /test-phase; this is the declared proxy — a REAL on-disk
 * SQLite file (not :memory:), closed and reopened as a fresh connection
 * (what a process restart does to this file, per data.js's own file-backed
 * mode), rather than a fake stand-in.
 */
describe('F06-AC9 — an edited bookmark survives a close/reopen of the real file-backed db', () => {
  let dbFile;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'f06-ac9-')), 'tagvault.db');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
  });

  it('returns the edited values, not the pre-edit ones, after the connection is closed and reopened', async () => {
    const firstDb = createDb({ file: dbFile });
    const firstTagRepository = createTagRepository(firstDb);
    const firstRepository = createBookmarkRepository(firstDb, firstTagRepository);
    const firstService = createBookmarkService({
      repository: firstRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: firstTagRepository }),
      now: () => new Date('2025-01-15T10:30:00.000Z'),
    });

    const created = await firstService.create({
      url: 'https://example.com/original',
      title: 'Original',
      tags: ['before'],
    });

    const edited = await createBookmarkService({
      repository: firstRepository,
      fetchTitle: vi.fn(async () => ({ ok: true, title: 'unused' })),
      tagService: createTagService({ tagRepository: firstTagRepository }),
      now: () => new Date('2025-01-15T11:00:00.000Z'),
    }).update(created.id, {
      url: 'https://example.com/edited',
      title: 'Edited',
      tags: ['after'],
      updatedAt: created.updated_at,
    });

    // Close the connection — the only thing a real process restart does to a
    // file-backed better-sqlite3 handle that matters here (the file itself,
    // not the process, is what must carry the truth forward).
    firstDb.close();

    const reopenedDb = createDb({ file: dbFile });
    const reopenedRepository = createBookmarkRepository(
      reopenedDb,
      createTagRepository(reopenedDb)
    );
    const row = reopenedRepository.findLiveById(created.id);

    expect(row.url).toBe('https://example.com/edited');
    expect(row.title).toBe('Edited');
    expect(row.created_at).toBe(created.created_at);
    expect(row.updated_at).toBe(edited.updated_at);
    expect(row.updated_at).not.toBe(created.updated_at);

    reopenedDb.close();
  });
});
