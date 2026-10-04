import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * Route-level tests over a real listener and the global fetch, following
 * `list-route.test.js`'s established pattern (lld.md section 11).
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

/** Seed a tag directly, bypassing HTTP, so these tests are about the route only. */
function seedTag(name) {
  db.prepare('INSERT INTO tag (name, created_at) VALUES (?, ?)').run(
    name,
    '2025-01-15T10:30:00.000Z'
  );
}

beforeEach(async () => {
  db = createDb({ file: ':memory:' });
  await start();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('F02-AC11 — GET /api/tags?prefix= returns a bare, alphabetical array', () => {
  it('matches case-insensitively and alphabetically against seeded tags', async () => {
    for (const name of ['docs', 'design', 'database', 'urgent']) {
      seedTag(name);
    }

    const response = await fetch(`${base}/api/tags?prefix=d`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['database', 'design', 'docs']);
  });

  it('EC4: matches regardless of the prefix case', async () => {
    for (const name of ['docs', 'design', 'database', 'urgent']) {
      seedTag(name);
    }

    // spec.md's F02-AC11 originally gave `prefix=DA` -> ["database","design"],
    // but "design" does not start with "da" under the plain prefix match this LLD
    // specifies (lld.md section 4/5). Flagged at the Build gate (F02-T05,
    // E-build-201) and corrected in spec.md at the Review gate (F02-RV04,
    // 2026-10-01): the approved example is now this same case-insensitivity
    // check (lowercase "doc" vs uppercase "DOC").
    const response = await fetch(`${base}/api/tags?prefix=DOC`);

    expect(await response.json()).toEqual(['docs']);
  });
});

describe('F02-AC12/EC25 — no tags exist yet', () => {
  it('returns [] for prefix=, not an error', async () => {
    const response = await fetch(`${base}/api/tags?prefix=`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe('F02-AC13/EC5 — more than 10 tags share a prefix', () => {
  it('returns exactly 10, alphabetically', async () => {
    for (let i = 0; i < 15; i += 1) {
      seedTag(`s${String(i).padStart(2, '0')}`);
    }

    const response = await fetch(`${base}/api/tags?prefix=s`);
    const body = await response.json();

    expect(body).toHaveLength(10);
    expect(body).toEqual(['s00', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09']);
  });
});

describe('GET /api/tags (no prefix) — F01/F03 shape unchanged', () => {
  it('still returns the sidebar shape', async () => {
    seedTag('docs');

    const response = await fetch(`${base}/api/tags`);

    expect(response.status).toBe(200);
    // No bookmark links yet, so the sidebar's live-bookmark join returns none.
    expect(await response.json()).toEqual([]);
  });
});

describe('Full smoke contract still 200/200/200', () => {
  it('answers /api/health, /api/bookmarks and /api/tags', async () => {
    const results = await Promise.all(
      ['/api/health', '/api/bookmarks', '/api/tags'].map((path) => fetch(`${base}${path}`))
    );

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
  });
});

describe('NFR-04/S6 — a literal "_" in the prefix is data, never a LIKE wildcard', () => {
  it('a prefix containing "_" matches only a tag name that literally contains it, not any single character', async () => {
    // Unescaped, the LIKE pattern "a_b%" would treat "_" as "any one character"
    // and wrongly match "a1bc" too. Escaped (lld.md section 9/5), it must match
    // only the tag that literally contains "a_b".
    seedTag('a1bc');
    seedTag('a_bc');

    const response = await fetch(`${base}/api/tags?prefix=${encodeURIComponent('a_b')}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['a_bc']);
  });
});
