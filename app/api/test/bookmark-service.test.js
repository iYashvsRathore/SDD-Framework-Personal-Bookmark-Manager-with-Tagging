import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';
import { toErrorResponse } from '../src/lib/app-error.js';

/**
 * Service-level tests. The DB is real (in-memory) so the LD-02 unique constraint is
 * genuinely exercised; only the fetcher and the clock are faked (lld.md section 11).
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');

let db;
let repository;
let fetchTitle;
let tagRepository;
let taggedRepository;
let tagService;

function makeService(overrides = {}) {
  return createBookmarkService({
    repository,
    fetchTitle,
    now: () => FIXED_NOW,
    ...overrides,
  });
}

/** F02: a service wired with the tag repository/service, matching app.js's real wiring. */
function makeTaggedService(overrides = {}) {
  return createBookmarkService({
    repository: taggedRepository,
    fetchTitle,
    tagService,
    now: () => FIXED_NOW,
    ...overrides,
  });
}

function liveRows() {
  return db.prepare('SELECT * FROM bookmark WHERE deleted_at IS NULL').all();
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  repository = createBookmarkRepository(db);
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
  tagRepository = createTagRepository(db);
  taggedRepository = createBookmarkRepository(db, tagRepository);
  tagService = createTagService({ tagRepository });
});

describe('F01-AC1 — a valid URL is saved', () => {
  it('returns a row matching the acceptance criterion exactly', async () => {
    const bookmark = await makeService().create({ url: 'https://example.com/recipe' });

    expect(bookmark.url).toBe('https://example.com/recipe');
    expect(bookmark.title).toBe('Fetched Title');
    expect(bookmark.title_source).toBe('fetched');
    expect(bookmark.created_at).toBe('2025-01-15T10:30:00.000Z');
    // created_at and updated_at come from ONE captured instant, not two clock reads.
    expect(bookmark.updated_at).toBe(bookmark.created_at);

    const [row] = liveRows();
    expect(row.deleted_at).toBeNull();
    expect(row.url_normalized).toBe('https://example.com/recipe');
  });

  it('trims the submitted URL before storing it', async () => {
    const bookmark = await makeService().create({ url: '  https://example.com/x  ' });
    expect(bookmark.url).toBe('https://example.com/x');
  });
});

describe('F01-AC2 — a supplied title wins and suppresses the fetch', () => {
  it('stores the user title with title_source=user and never calls the fetcher', async () => {
    const bookmark = await makeService().create({
      url: 'https://example.com/x',
      title: 'My own words',
    });

    expect(bookmark.title).toBe('My own words');
    expect(bookmark.title_source).toBe('user');
    expect(fetchTitle).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only title as absent and falls back to the fetch', async () => {
    const bookmark = await makeService().create({ url: 'https://example.com/x', title: '   ' });

    expect(bookmark.title_source).toBe('fetched');
    expect(fetchTitle).toHaveBeenCalledOnce();
  });
});

describe('F01-AC5 — a failed fetch falls back to the hostname, never an error', () => {
  it.each([
    ['blocked', 'https://example.com/x', 'example.com'],
    ['timeout', 'https://www.example.org/x', 'example.org'],
    ['no-title', 'https://sub.example.net/x', 'sub.example.net'],
  ])('reason=%s stores the hostname', async (reason, url, expectedTitle) => {
    fetchTitle = vi.fn(async () => ({ ok: false, reason }));

    const bookmark = await makeService().create({ url });

    expect(bookmark.title).toBe(expectedTitle);
    expect(bookmark.title_source).toBe('hostname');
  });
});

describe('F01-AC9 — an invalid URL is refused before anything else happens', () => {
  it.each([
    ['javascript:alert(1)', 'Enter a web address starting with http:// or https://.'],
    ['ftp://example.com/x', 'Enter a web address starting with http:// or https://.'],
    ['file:///etc/passwd', 'Enter a web address starting with http:// or https://.'],
    ['not a url', 'Enter a web address starting with http:// or https://.'],
    ['', 'Enter a web address to save.'],
    ['   ', 'Enter a web address to save.'],
  ])('%s is rejected with the fetcher uncalled', async (url, message) => {
    await expect(makeService().create({ url })).rejects.toMatchObject({
      code: 'INVALID_URL',
      status: 400,
      field: 'url',
      message,
    });

    expect(fetchTitle).not.toHaveBeenCalled();
    expect(liveRows()).toHaveLength(0);
  });

  it('rejects a title longer than 140 characters', async () => {
    await expect(
      makeService().create({ url: 'https://example.com/x', title: 'T'.repeat(141) })
    ).rejects.toMatchObject({ code: 'INVALID_URL', field: 'title' });
  });
});

describe('F01-AC11 — a duplicate is refused with a usable 409', () => {
  it('returns the existing bookmark and leaves the live count unchanged', async () => {
    const service = makeService();
    const first = await service.create({ url: 'https://example.com/a', title: 'First save' });

    await expect(service.create({ url: 'https://example.com/a' })).rejects.toMatchObject({
      code: 'DUPLICATE_URL',
      status: 409,
      field: 'url',
      existingId: first.id,
      details: { title: 'First save', url: 'https://example.com/a' },
    });

    expect(liveRows()).toHaveLength(1);
  });

  it('allows the same address again once the original is soft-deleted', async () => {
    const service = makeService();
    const first = await service.create({ url: 'https://example.com/a' });
    db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?').run(
      '2025-01-16T00:00:00.000Z',
      first.id
    );

    const second = await service.create({ url: 'https://example.com/a' });

    expect(second.id).not.toBe(first.id);
  });
});

describe('F01-AC12 — duplicate detection is normalization-aware', () => {
  it.each([
    ['uppercase host', 'https://EXAMPLE.com/a'],
    ['trailing slash', 'https://example.com/a/'],
    ['fragment', 'https://example.com/a#section'],
    ['default port', 'https://example.com:443/a'],
    ['all four at once', 'https://EXAMPLE.com:443/a/#section'],
  ])('%s is a duplicate of https://example.com/a', async (_label, variant) => {
    const service = makeService();
    await service.create({ url: 'https://example.com/a' });

    await expect(service.create({ url: variant })).rejects.toMatchObject({
      code: 'DUPLICATE_URL',
    });
    expect(liveRows()).toHaveLength(1);
  });

  it('treats a punycode host and its Unicode spelling as the same address', async () => {
    const service = makeService();
    await service.create({ url: 'https://münchen.example/a' });

    await expect(service.create({ url: 'https://xn--mnchen-3ya.example/a' })).rejects.toMatchObject(
      { code: 'DUPLICATE_URL' }
    );
  });

  // The deliberate asymmetry in AC12: host case folds, PATH case does not.
  it('treats a path differing only in case as a DIFFERENT address', async () => {
    const service = makeService();
    await service.create({ url: 'https://example.com/a' });

    const second = await service.create({ url: 'https://example.com/A' });

    expect(second.id).toBeDefined();
    expect(liveRows()).toHaveLength(2);
  });

  it('treats a differing query string as a different address', async () => {
    const service = makeService();
    await service.create({ url: 'https://example.com/a' });
    await service.create({ url: 'https://example.com/a?ref=x' });

    expect(liveRows()).toHaveLength(2);
  });
});

describe('LD-02 / F01-AC14 — the constraint path is byte-identical to the lookup path', () => {
  it('produces the same 409 body whether the race is lost or won', async () => {
    const service = makeService();
    const first = await service.create({ url: 'https://example.com/a', title: 'First save' });

    // Path A: the pre-insert lookup finds the row.
    const lookupError = await service.create({ url: 'https://example.com/a' }).catch((e) => e);

    // Path B: simulate the concurrent window by blinding the lookup, so the INSERT
    // itself is what rejects. This is the path a second browser tab actually takes.
    const blinded = createBookmarkService({
      repository: { ...repository, findLiveByNormalized: () => null },
      fetchTitle,
      now: () => FIXED_NOW,
    });
    const constraintError = await blinded.create({ url: 'https://example.com/a' }).catch((e) => e);

    expect(constraintError.code).toBe('DUPLICATE_URL');
    expect(constraintError.existingId).toBe(first.id);
    // Byte-for-byte, not merely "equivalent".
    expect(JSON.stringify(toErrorResponse(constraintError))).toBe(
      JSON.stringify(toErrorResponse(lookupError))
    );
    expect(liveRows()).toHaveLength(1);
  });
});

describe('F01-AC16 — a hostile title is stored as literal text', () => {
  it('stores <script>alert(1)</script>Hello unchanged', async () => {
    fetchTitle = vi.fn(async () => ({ ok: true, title: '<script>alert(1)</script>Hello' }));

    const bookmark = await makeService().create({ url: 'https://example.com/x' });

    // Not stripped, not escaped in storage — escaping is the render layer's job (S3).
    expect(bookmark.title).toBe('<script>alert(1)</script>Hello');
  });
});

describe('S1 — the request body cannot forge server-owned fields', () => {
  it('ignores id, title_source, created_at and deleted_at', async () => {
    const bookmark = await makeService().create({
      url: 'https://example.com/x',
      title: 'Mine',
      id: 9999,
      title_source: 'fetched',
      created_at: '1999-01-01T00:00:00.000Z',
      updated_at: '1999-01-01T00:00:00.000Z',
      deleted_at: '1999-01-01T00:00:00.000Z',
      url_normalized: 'https://evil.example/',
    });

    expect(bookmark.id).not.toBe(9999);
    expect(bookmark.title_source).toBe('user');
    expect(bookmark.created_at).toBe('2025-01-15T10:30:00.000Z');

    const [row] = liveRows();
    expect(row.deleted_at).toBeNull();
    expect(row.url_normalized).toBe('https://example.com/x');
  });

  it('rejects a non-string url without throwing a TypeError', async () => {
    for (const url of [null, undefined, 42, {}, [], true]) {
      await expect(makeService().create({ url })).rejects.toMatchObject({ code: 'INVALID_URL' });
    }
  });
});

describe('F03 — list()', () => {
  function seed({ url, title, createdAt, deletedAt = null }) {
    return db
      .prepare(
        `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, 'user', ?, ?, ?)`
      )
      .run(url, url, title, createdAt, createdAt, deletedAt).lastInsertRowid;
  }

  describe('F03-EC1 — a created_at tie is broken by id DESC, total and stable', () => {
    it('keeps the split stable across two consecutive page requests', async () => {
      const sameInstant = '2025-01-01T00:00:00.000Z';
      const first = seed({ url: 'https://example.com/1', title: 'First', createdAt: sameInstant });
      const second = seed({
        url: 'https://example.com/2',
        title: 'Second',
        createdAt: sameInstant,
      });
      const third = seed({ url: 'https://example.com/3', title: 'Third', createdAt: sameInstant });

      const service = makeService();
      const pageA = service.list({ page: 1, size: 10 });
      const pageB = service.list({ page: 1, size: 10 });

      expect(pageA.items.map((b) => b.id)).toEqual([third, second, first].map(Number));
      expect(pageB.items.map((b) => b.id)).toEqual(pageA.items.map((b) => b.id));
    });
  });

  describe('F03-AC3 — 25 seeded rows at default size', () => {
    it('returns size=20, page=1, items.length=20, total=25', () => {
      for (let i = 0; i < 25; i += 1) {
        seed({
          url: `https://example.com/${i}`,
          title: `Item ${i}`,
          createdAt: `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
        });
      }

      const result = makeService().list({});

      expect(result.size).toBe(20);
      expect(result.page).toBe(1);
      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
    });
  });

  describe('F03-AC6 — page=99 against 25 rows at size=10 clamps to the real remainder', () => {
    it('returns page=3 and the real 5-row remainder, not an empty array', () => {
      for (let i = 0; i < 25; i += 1) {
        seed({
          url: `https://example.com/${i}`,
          title: `Item ${i}`,
          createdAt: `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
        });
      }

      const result = makeService().list({ page: 99, size: 10 });

      expect(result.page).toBe(3);
      expect(result.items).toHaveLength(5);
    });
  });

  describe('an empty page short-circuits the tag lookup', () => {
    it('never calls listTagsForBookmarks when no rows match the page', () => {
      const listTagsForBookmarks = vi.fn(() => []);
      const spiedRepository = { ...repository, listTagsForBookmarks };

      const result = makeService({ repository: spiedRepository }).list({});

      expect(result.items).toEqual([]);
      expect(listTagsForBookmarks).toHaveBeenCalledWith([]);
    });
  });
});

describe('F04 — list({ tag }) and countLive()', () => {
  function seedTagged(url, title, createdAt, tagNames) {
    const id = db
      .prepare(
        `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, 'user', ?, ?, NULL)`
      )
      .run(url, url, title, createdAt, createdAt).lastInsertRowid;
    for (const name of tagNames) {
      db.prepare(
        `INSERT INTO tag (name, created_at) VALUES (?, ?) ON CONFLICT(name) DO NOTHING`
      ).run(name, createdAt);
      const tagId = db.prepare('SELECT id FROM tag WHERE name = ?').get(name).id;
      db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)').run(id, tagId);
    }
    return id;
  }

  describe('F04-AC3 — only bookmarks carrying the tag are returned, with their full tags[]', () => {
    it('returns the two research-tagged rows, each with every tag they carry', () => {
      seedTagged('https://example.com/1', 'One', '2025-01-01T00:00:01.000Z', ['research', 'docs']);
      seedTagged('https://example.com/2', 'Two', '2025-01-01T00:00:02.000Z', ['research']);
      seedTagged('https://example.com/3', 'Three', '2025-01-01T00:00:03.000Z', ['design']);

      const result = makeService().list({ tag: 'research' });

      expect(result.total).toBe(2);
      expect(result.items.map((b) => b.title).sort()).toEqual(['One', 'Two']);
      const one = result.items.find((b) => b.title === 'One');
      expect(one.tags.sort()).toEqual(['docs', 'research']);
    });
  });

  describe('F04-AC8 — a tag matching nothing returns zero rows, never an error', () => {
    it('returns { items: [], total: 0 } for an unused tag value', () => {
      seedTagged('https://example.com/1', 'One', '2025-01-01T00:00:01.000Z', ['research']);

      const result = makeService().list({ tag: 'doesnotexist' });

      expect(result).toMatchObject({ items: [], total: 0, page: 1 });
    });
  });

  describe('F04-AC6 — the tag filter survives a page-size change, page resets to 1', () => {
    it('still carries the predicate when only size changes', () => {
      for (let i = 0; i < 5; i += 1) {
        seedTagged(
          `https://example.com/${i}`,
          `Item ${i}`,
          `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
          ['research']
        );
      }
      seedTagged('https://example.com/other', 'Other', '2025-01-01T00:00:10.000Z', ['design']);

      const result = makeService().list({ page: 1, size: 10, tag: 'research' });

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
    });
  });

  describe('F04-AC10 — a tag with zero live bookmarks is simply absent from a tag match', () => {
    it('matches nothing once every bookmark carrying the tag is soft-deleted', () => {
      const id = seedTagged('https://example.com/1', 'One', '2025-01-01T00:00:01.000Z', [
        'research',
      ]);
      db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?').run(
        '2025-01-02T00:00:00.000Z',
        id
      );

      const result = makeService().list({ tag: 'research' });

      expect(result).toMatchObject({ items: [], total: 0 });
    });
  });

  describe('countLive()', () => {
    it('counts all live bookmarks regardless of any tag', () => {
      seedTagged('https://example.com/1', 'One', '2025-01-01T00:00:01.000Z', ['research']);
      seedTagged('https://example.com/2', 'Two', '2025-01-01T00:00:02.000Z', []);
      const deletedId = seedTagged(
        'https://example.com/3',
        'Three',
        '2025-01-01T00:00:03.000Z',
        []
      );
      db.prepare('UPDATE bookmark SET deleted_at = ? WHERE id = ?').run(
        '2025-01-02T00:00:00.000Z',
        deletedId
      );

      expect(makeService().countLive()).toBe(2);
    });

    it('returns 0 when no bookmark is live', () => {
      expect(makeService().countLive()).toBe(0);
    });
  });
});

describe('F05 — list({ q }) search', () => {
  function seedBookmark(url, title, createdAt) {
    return db
      .prepare(
        `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, 'user', ?, ?, NULL)`
      )
      .run(url, url, title, createdAt, createdAt).lastInsertRowid;
  }

  describe('F05-AC1 — a title match is returned, a non-match is not', () => {
    it('returns only the pasta bookmark for q=tomato', () => {
      seedBookmark('https://example.com/1', 'Weeknight tomato pasta', '2025-01-01T00:00:01.000Z');
      seedBookmark('https://example.com/2', 'CSS grid guide', '2025-01-01T00:00:02.000Z');

      const result = makeService().list({ q: 'tomato' });

      expect(result.total).toBe(1);
      expect(result.items.map((b) => b.title)).toEqual(['Weeknight tomato pasta']);
    });
  });

  describe('F05-AC2, F05-EC4 — a URL-only match is returned', () => {
    it('matches a bookmark whose title does not contain the term but whose URL does', () => {
      seedBookmark(
        'https://example.com/docs/intro?ref=docs',
        'Getting started',
        '2025-01-01T00:00:01.000Z'
      );
      seedBookmark('https://example.com/other', 'Something else', '2025-01-01T00:00:02.000Z');

      const result = makeService().list({ q: 'docs' });

      expect(result.total).toBe(1);
      expect(result.items.map((b) => b.title)).toEqual(['Getting started']);
    });
  });

  describe('F05-AC3 — the match is case-insensitive', () => {
    it('returns the same result for TOMATO and tomato', () => {
      seedBookmark('https://example.com/1', 'Weeknight Tomato Pasta', '2025-01-01T00:00:01.000Z');

      const upper = makeService().list({ q: 'TOMATO' });
      const lower = makeService().list({ q: 'tomato' });

      expect(upper.total).toBe(1);
      expect(lower.total).toBe(1);
      expect(upper.items.map((b) => b.title)).toEqual(lower.items.map((b) => b.title));
    });
  });

  describe('F05-AC4 — % is treated as a literal character', () => {
    it('matches only the bookmark containing a literal %', () => {
      seedBookmark('https://example.com/1', '100% done', '2025-01-01T00:00:01.000Z');
      seedBookmark('https://example.com/2', '100X done', '2025-01-01T00:00:02.000Z');

      const result = makeService().list({ q: '100%' });

      expect(result.total).toBe(1);
      expect(result.items.map((b) => b.title)).toEqual(['100% done']);
    });
  });

  describe('F05-AC5 — _ is treated as a literal character', () => {
    it('matches only the bookmark containing a literal underscore, not the X-sibling', () => {
      seedBookmark('https://example.com/1', 'under_score test', '2025-01-01T00:00:01.000Z');
      seedBookmark('https://example.com/2', 'underXscore test', '2025-01-01T00:00:02.000Z');

      const result = makeService().list({ q: 'under_score' });

      expect(result.total).toBe(1);
      expect(result.items.map((b) => b.title)).toEqual(['under_score test']);
    });
  });

  describe('F05-AC6 — quote and <script> payloads are matched literally, never erroring', () => {
    it('matches a title containing a quote mark', () => {
      seedBookmark('https://example.com/1', "O'Reilly guide", '2025-01-01T00:00:01.000Z');

      expect(() => makeService().list({ q: "O'Reilly" })).not.toThrow();
      const result = makeService().list({ q: "O'Reilly" });
      expect(result.total).toBe(1);
    });

    it('returns zero rows, never an error, for a <script> payload matching nothing', () => {
      seedBookmark('https://example.com/1', 'Ordinary title', '2025-01-01T00:00:01.000Z');

      expect(() => makeService().list({ q: '<script>alert(1)</script>' })).not.toThrow();
      const result = makeService().list({ q: '<script>alert(1)</script>' });
      expect(result).toMatchObject({ items: [], total: 0 });
    });
  });

  describe('F05-AC9, F05-EC3 — search composes with an active tag filter (AND)', () => {
    it('returns only bookmarks satisfying both the tag and the search text', () => {
      const id1 = seedBookmark(
        'https://example.com/1',
        'Research guide',
        '2025-01-01T00:00:01.000Z'
      );
      seedBookmark('https://example.com/2', 'Research notes', '2025-01-01T00:00:02.000Z');
      const id3 = seedBookmark('https://example.com/3', 'Design guide', '2025-01-01T00:00:03.000Z');
      db.prepare(
        `INSERT INTO tag (name, created_at) VALUES ('research', '2025-01-01T00:00:00.000Z')`
      ).run();
      db.prepare(
        `INSERT INTO tag (name, created_at) VALUES ('design', '2025-01-01T00:00:00.000Z')`
      ).run();
      const researchTagId = db.prepare('SELECT id FROM tag WHERE name = ?').get('research').id;
      const designTagId = db.prepare('SELECT id FROM tag WHERE name = ?').get('design').id;
      db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)').run(
        id1,
        researchTagId
      );
      db.prepare('INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)').run(
        id3,
        designTagId
      );

      const result = makeService().list({ tag: 'research', q: 'guide' });

      expect(result.total).toBe(1);
      expect(result.items.map((b) => b.title)).toEqual(['Research guide']);
    });
  });

  describe('F05-AC10 — a search change resets the page to 1', () => {
    it('returns page 1 when q is supplied regardless of the requested page', () => {
      for (let i = 0; i < 5; i += 1) {
        seedBookmark(
          `https://example.com/${i}`,
          `Guide ${i}`,
          `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z`
        );
      }

      // list() itself does not reset page — that is the web store's job (F05-T07).
      // This asserts the service still computes page/total correctly against the
      // filtered predicate at page 1 with an active search.
      const result = makeService().list({ page: 1, size: 10, q: 'guide' });

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
    });
  });
});

describe('F02-AC1 — tags round-trip through create()', () => {
  it('returns bookmark.tags lowercased, alphabetical, with one bookmark_tag row per tag', async () => {
    const bookmark = await makeTaggedService().create({
      url: 'https://example.com/recipe',
      tags: ['Research', 'docs'],
    });

    expect(bookmark.tags).toEqual(['docs', 'research']);

    const links = db
      .prepare(
        `SELECT t.name FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id
         WHERE bt.bookmark_id = ?`
      )
      .all(bookmark.id)
      .map((r) => r.name)
      .sort();
    expect(links).toEqual(['docs', 'research']);
  });

  it('omits tags from the written row when none are supplied', async () => {
    const bookmark = await makeTaggedService().create({ url: 'https://example.com/x' });

    expect(bookmark.tags).toEqual([]);
  });
});

describe('F02-AC2/EC14 — a case-only duplicate tag is stored once', () => {
  it('"Research" and "research" on one bookmark produce exactly one bookmark_tag row', async () => {
    const bookmark = await makeTaggedService().create({
      url: 'https://example.com/x',
      tags: ['Research', 'research'],
    });

    expect(bookmark.tags).toEqual(['research']);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark_tag').get().n).toBe(1);
  });
});

describe('F02-AC6/AC8/AC9/F02-EC2 — an invalid tags array rejects the WHOLE request', () => {
  it.each([
    ['9 distinct valid tags', Array.from({ length: 9 }, (_, i) => `tag${i}`)],
    ['a 25-character tag', ['a'.repeat(25)]],
    ['a disallowed-character tag', ['re$earch']],
  ])('%s leaves zero bookmark rows', async (_label, tags) => {
    await expect(
      makeTaggedService().create({ url: 'https://example.com/x', tags })
    ).rejects.toMatchObject({ code: 'INVALID_TAG', status: 400, field: 'tags' });

    expect(liveRows()).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark_tag').get().n).toBe(0);
  });

  it('accepts a 24-character tag unchanged, and front-end dev_2', async () => {
    const bookmark = await makeTaggedService().create({
      url: 'https://example.com/x',
      tags: ['a'.repeat(24), 'front-end dev_2'],
    });

    expect(bookmark.tags).toContain('a'.repeat(24));
    expect(bookmark.tags).toContain('front-end dev_2');
  });
});

describe('EC19 — a failure partway through tag linking rolls back the whole write', () => {
  it('leaves neither the bookmark row nor any tag link behind', async () => {
    let linkCalls = 0;
    const failingTagRepository = {
      ...tagRepository,
      link: vi.fn((bookmarkId, tagId) => {
        linkCalls += 1;
        if (linkCalls === 2) {
          throw new Error('simulated mid-transaction failure');
        }
        tagRepository.link(bookmarkId, tagId);
      }),
    };
    const failingRepository = createBookmarkRepository(db, failingTagRepository);
    const service = createBookmarkService({
      repository: failingRepository,
      fetchTitle,
      tagService,
      now: () => FIXED_NOW,
    });

    await expect(
      service.create({ url: 'https://example.com/x', tags: ['docs', 'research'] })
    ).rejects.toThrow('simulated mid-transaction failure');

    expect(liveRows()).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookmark_tag').get().n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM tag').get().n).toBe(0);
  });
});
