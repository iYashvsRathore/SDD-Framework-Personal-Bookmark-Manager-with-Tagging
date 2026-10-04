import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * App-level regression (/test-phase app): a single continuous user journey
 * threading every feature (F01-F08) through one shared, real HTTP server and
 * one real (in-memory) SQLite connection, in the order a real session would
 * exercise them. Each per-feature gate already proved its own AC/EC set in
 * isolation (docs/04-testing.md); this is the one check no feature gate ran
 * — that the features compose correctly end to end, with state carried
 * forward from one step to the next.
 */

let server;
let base;
let db;

beforeAll(async () => {
  db = createDb({ file: ':memory:' });
  const app = createApp({ db, fetchTitle: async () => null });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('APP journey — F01 add -> F02 tag -> F03 list -> F04 filter -> F05 search -> F06 edit -> F07 delete/restore -> F08 theme', () => {
  it('APP-TC01: end-to-end journey carries state correctly across every feature', async () => {
    // F01 — add two bookmarks with tags (also exercises F02's write path)
    const r1 = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/journey-one',
        title: 'Journey One',
        tags: ['alpha', 'shared'],
      }),
    });
    expect(r1.status).toBe(201);
    const b1 = (await r1.json()).bookmark;
    expect(b1.tags.sort()).toEqual(['alpha', 'shared']);

    const r2 = await fetch(`${base}/api/bookmarks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/journey-two',
        title: 'Journey Two',
        tags: ['beta', 'shared'],
      }),
    });
    expect(r2.status).toBe(201);
    const b2 = (await r2.json()).bookmark;

    // F03 — list shows both, newest first
    const listRes = await fetch(`${base}/api/bookmarks`);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.total).toBe(2);
    expect(listBody.items.map((b) => b.id)).toEqual([b2.id, b1.id]);

    // F04 — filter by the shared tag returns both; filter by alpha returns only b1
    const filterShared = await fetch(`${base}/api/bookmarks?tag=shared`);
    expect((await filterShared.json()).total).toBe(2);
    const filterAlpha = await fetch(`${base}/api/bookmarks?tag=alpha`);
    const filterAlphaBody = await filterAlpha.json();
    expect(filterAlphaBody.total).toBe(1);
    expect(filterAlphaBody.items[0].id).toBe(b1.id);

    // F05 — search by title text
    const searchRes = await fetch(`${base}/api/bookmarks?q=Journey%20Two`);
    const searchBody = await searchRes.json();
    expect(searchBody.total).toBe(1);
    expect(searchBody.items[0].id).toBe(b2.id);

    // F06 — edit b1's title and tags
    const editRes = await fetch(`${base}/api/bookmarks/${b1.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: b1.url,
        title: 'Journey One Edited',
        tags: ['alpha'],
        updatedAt: b1.updated_at,
      }),
    });
    expect(editRes.status).toBe(200);
    const editedB1 = (await editRes.json()).bookmark;
    expect(editedB1.title).toBe('Journey One Edited');
    expect(editedB1.tags).toEqual(['alpha']);
    // F04 — now 'shared' only matches b2
    const filterSharedAfterEdit = await fetch(`${base}/api/bookmarks?tag=shared`);
    const filterSharedAfterEditBody = await filterSharedAfterEdit.json();
    expect(filterSharedAfterEditBody.total).toBe(1);
    expect(filterSharedAfterEditBody.items[0].id).toBe(b2.id);

    // F07 — delete b2, then restore it
    const deleteRes = await fetch(`${base}/api/bookmarks/${b2.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(204);
    const listAfterDelete = await fetch(`${base}/api/bookmarks`);
    const listAfterDeleteBody = await listAfterDelete.json();
    expect(listAfterDeleteBody.total).toBe(1);
    expect(listAfterDeleteBody.items[0].id).toBe(b1.id);

    const restoreRes = await fetch(`${base}/api/bookmarks/${b2.id}/restore`, { method: 'POST' });
    expect(restoreRes.status).toBe(200);
    const listAfterRestore = await fetch(`${base}/api/bookmarks`);
    const listAfterRestoreBody = await listAfterRestore.json();
    expect(listAfterRestoreBody.total).toBe(2);

    // F08 — theme defaults light, then flips to dark and persists
    const themeDefault = await fetch(`${base}/api/settings/theme`);
    expect((await themeDefault.json()).theme).toBe('light');

    const themeSet = await fetch(`${base}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    expect(themeSet.status).toBe(200);
    const themeGet = await fetch(`${base}/api/settings/theme`);
    expect((await themeGet.json()).theme).toBe('dark');

    // F02 — tag suggestions still reflect current live state (alpha, beta; 'shared' gone from b1 but live on b2)
    const tagsRes = await fetch(`${base}/api/tags?prefix=`);
    const tagNames = (await tagsRes.json()).sort();
    expect(tagNames).toEqual(['alpha', 'beta', 'shared']);
  });
});
