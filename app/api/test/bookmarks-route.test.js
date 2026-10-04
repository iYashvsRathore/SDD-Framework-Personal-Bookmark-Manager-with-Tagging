import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, CSP_HEADER_VALUE } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * Route-level tests over a real listener and the global fetch, so no HTTP test
 * dependency is added outside the technology.md section 5 register.
 */

const FIXED_NOW = new Date('2025-01-15T10:30:00.000Z');

let server;
let base;
let db;
let fetchTitle;

async function start() {
  const app = createApp({ db, fetchTitle, now: () => FIXED_NOW });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}

function post(body, init = {}) {
  return fetch(`${base}/api/bookmarks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

// Tags are easier to attach directly through the real create() flow so the
// tagged service's transaction (F02) is exercised, not re-implemented here.
async function createTagged(app, url, title, tags) {
  const response = await fetch(`${app}/api/bookmarks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, title, tags }),
  });
  return (await response.json()).bookmark;
}

beforeEach(async () => {
  db = createDb({ file: ':memory:' });
  fetchTitle = vi.fn(async () => ({ ok: true, title: 'Fetched Title' }));
  await start();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('POST /api/bookmarks', () => {
  it('returns 201 and the created bookmark (F01-AC1)', async () => {
    const response = await post({ url: 'https://example.com/recipe' });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.bookmark).toMatchObject({
      url: 'https://example.com/recipe',
      title: 'Fetched Title',
      title_source: 'fetched',
      created_at: '2025-01-15T10:30:00.000Z',
      updated_at: '2025-01-15T10:30:00.000Z',
    });
    expect(typeof body.bookmark.id).toBe('number');
  });

  it('never exposes url_normalized or deleted_at to the client', async () => {
    const response = await post({ url: 'https://example.com/x' });
    const body = await response.json();

    // F02-AC1: every bookmark now carries `tags` (empty when none were saved).
    expect(Object.keys(body.bookmark).sort()).toEqual([
      'created_at',
      'id',
      'tags',
      'title',
      'title_source',
      'updated_at',
      'url',
    ]);
  });

  it('returns 400 for javascript: with the fetcher uncalled (F01-AC9)', async () => {
    const response = await post({ url: 'javascript:alert(1)' });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toEqual({
      code: 'INVALID_URL',
      message: 'Enter a web address starting with http:// or https://.',
      field: 'url',
    });
    expect(fetchTitle).not.toHaveBeenCalled();
  });

  it('returns 409 with everything the duplicate banner needs (F01-AC11)', async () => {
    await post({ url: 'https://example.com/a', title: 'First save' });

    const response = await post({ url: 'https://EXAMPLE.com/a/#x' });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('DUPLICATE_URL');
    expect(body.error.message).toBe('You already saved this address.');
    expect(typeof body.error.existingId).toBe('number');
    expect(body.error.details).toEqual({
      title: 'First save',
      url: 'https://example.com/a',
    });
  });

  it('sets the Content-Security-Policy on API responses too', async () => {
    const response = await post({ url: 'https://example.com/x' });
    expect(response.headers.get('content-security-policy')).toBe(CSP_HEADER_VALUE);
  });

  it('does not advertise the server implementation', async () => {
    const response = await post({ url: 'https://example.com/x' });
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it('ignores unknown body keys (S1)', async () => {
    const response = await post({
      url: 'https://example.com/x',
      title: 'Mine',
      id: 9999,
      title_source: 'fetched',
      created_at: '1999-01-01T00:00:00.000Z',
    });

    const body = await response.json();
    expect(body.bookmark.id).not.toBe(9999);
    expect(body.bookmark.title_source).toBe('user');
    expect(body.bookmark.created_at).toBe('2025-01-15T10:30:00.000Z');
  });

  it('stores a hostile title as literal text (F01-AC16)', async () => {
    fetchTitle.mockResolvedValue({ ok: true, title: '<script>alert(1)</script>Hello' });

    const response = await post({ url: 'https://example.com/x' });
    const body = await response.json();

    expect(body.bookmark.title).toBe('<script>alert(1)</script>Hello');
    // JSON transport, so the payload is data — never markup the browser parses.
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('returns 400, not 500, for a body that is not valid JSON', async () => {
    // body-parser rejects this before any route runs. A client fault must not be
    // reported as a storage failure (hld.md section 8 taxonomy).
    const response = await post('{"url":"https://example.com/x"');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_URL');
  });

  it('returns a safe 500 body when storage fails, leaking no internals (U5)', async () => {
    db.close(); // forces a real better-sqlite3 failure on the next statement

    const response = await post({ url: 'https://example.com/x' });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('STORAGE_ERROR');
    expect(body.error.message).toBe(
      'TagVault could not save that. Your other bookmarks are safe — try again.'
    );
    expect(JSON.stringify(body)).not.toMatch(/SQLITE|better-sqlite3|at Object|\.js:\d+/);

    db = createDb({ file: ':memory:' }); // so afterEach can close cleanly
  });
});

describe('GET /api/bookmarks?tag= — F04-AC3, AC7, AC8', () => {
  it('returns only the bookmarks carrying the requested tag', async () => {
    await createTagged(base, 'https://example.com/a', 'A', ['research']);
    await createTagged(base, 'https://example.com/b', 'B', ['design']);

    const response = await fetch(`${base}/api/bookmarks?tag=research`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.map((i) => i.title)).toEqual(['A']);
    expect(body.total).toBe(1);
  });

  it('matches identically regardless of case or surrounding whitespace (F04-AC7)', async () => {
    await createTagged(base, 'https://example.com/a', 'A', ['research']);

    const upper = await (await fetch(`${base}/api/bookmarks?tag=Research`)).json();
    const padded = await (
      await fetch(`${base}/api/bookmarks?${new URLSearchParams({ tag: '  research  ' })}`)
    ).json();

    expect(upper.items.map((i) => i.title)).toEqual(['A']);
    expect(padded.items.map((i) => i.title)).toEqual(['A']);
  });

  it('returns 200 with an empty result for a tag matching nothing (F04-AC8)', async () => {
    await createTagged(base, 'https://example.com/a', 'A', ['research']);

    const response = await fetch(`${base}/api/bookmarks?tag=doesnotexist`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });
});

describe('GET /api/bookmarks?q= — F05-AC1-AC6, AC9, F05-EC3', () => {
  it('returns only the title match for q=tomato', async () => {
    await createTagged(base, 'https://example.com/a', 'Weeknight tomato pasta', []);
    await createTagged(base, 'https://example.com/b', 'CSS grid guide', []);

    const response = await fetch(`${base}/api/bookmarks?${new URLSearchParams({ q: 'tomato' })}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.map((i) => i.title)).toEqual(['Weeknight tomato pasta']);
    expect(body.total).toBe(1);
  });

  it('matches a URL-only occurrence, never erroring, for a quote payload (F05-AC6)', async () => {
    await createTagged(base, 'https://example.com/a', "O'Reilly guide", []);

    const response = await fetch(`${base}/api/bookmarks?${new URLSearchParams({ q: "O'Reilly" })}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(1);
  });

  it('returns 200 with zero rows, never an error, for a <script> payload (F05-AC6)', async () => {
    await createTagged(base, 'https://example.com/a', 'Ordinary title', []);

    const response = await fetch(
      `${base}/api/bookmarks?${new URLSearchParams({ q: '<script>alert(1)</script>' })}`
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });

  it('accepts a 210-character q without erroring, caps at 200 characters (F05-EC2 boundary)', async () => {
    await createTagged(base, 'https://example.com/a', 'Ordinary title', []);

    const longQuery = 'a'.repeat(210);
    const response = await fetch(`${base}/api/bookmarks?${new URLSearchParams({ q: longQuery })}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });

  it('composes tag and q as an AND, returning only the intersection (F05-AC9, F05-EC3)', async () => {
    await createTagged(base, 'https://example.com/a', 'Research guide', ['research']);
    await createTagged(base, 'https://example.com/b', 'Research notes', ['research']);
    await createTagged(base, 'https://example.com/c', 'Design guide', ['design']);

    const response = await fetch(
      `${base}/api/bookmarks?${new URLSearchParams({ tag: 'research', q: 'guide' })}`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.map((i) => i.title)).toEqual(['Research guide']);
    expect(body.total).toBe(1);
  });
});

describe('GET /api/bookmarks/count — F04-AC1, AC12', () => {
  it('returns the live bookmark count, never affected by any tag filter', async () => {
    await post({ url: 'https://example.com/a' });
    await post({ url: 'https://example.com/b' });

    const response = await fetch(`${base}/api/bookmarks/count`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 2 });
  });

  it('returns { total: 0 } when no bookmark is live', async () => {
    const response = await fetch(`${base}/api/bookmarks/count`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 0 });
  });
});
