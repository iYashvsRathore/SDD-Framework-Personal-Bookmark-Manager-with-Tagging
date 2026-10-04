import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createDb } from '../src/data/db.js';

/**
 * Route-level tests over a real listener and the global fetch, following
 * `tags-route.test.js`'s established pattern (lld.md section 11).
 */

let server;
let base;
let db;

async function start() {
  const app = createApp({ db, now: () => new Date('2025-01-15T10:30:00.000Z') });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}

beforeEach(async () => {
  db = createDb({ file: ':memory:' });
  await start();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

describe('F08-AC1 — GET /api/settings/theme on a fresh DB', () => {
  it('returns 200 with the default theme, without creating a row', async () => {
    const response = await fetch(`${base}/api/settings/theme`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: 'light' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM setting').get().n).toBe(0);
  });
});

describe('F08-AC3 — PUT /api/settings/theme with a valid body', () => {
  it('returns 200 with the new value and persists it', async () => {
    const response = await fetch(`${base}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: 'dark' });

    const getResponse = await fetch(`${base}/api/settings/theme`);
    expect(await getResponse.json()).toEqual({ theme: 'dark' });
  });
});

describe('F08-AC6 — PUT /api/settings/theme with an invalid body', () => {
  it('returns 400 INVALID_THEME and leaves no row', async () => {
    const response = await fetch(`${base}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'blue' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'INVALID_THEME',
        message: 'Theme must be "light" or "dark".',
        field: 'theme',
      },
    });
    expect(db.prepare('SELECT COUNT(*) AS n FROM setting').get().n).toBe(0);
  });

  it('a missing theme field is rejected the same way', async () => {
    const response = await fetch(`${base}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_THEME');
  });
});

/**
 * F08-AC5 / EC26 — restart persistence. lld.md section 11 names this a real
 * stop/restart check, carried here as the same declared proxy F06-AC9 and
 * F07-AC14 already use: a REAL on-disk SQLite file (not :memory:), closed and
 * reopened as a fresh connection and a fresh app/listener — what a process
 * restart does to this file — then read from a brand-new "session" with no
 * localStorage mirror involved (this is the api layer; GET is all AC5 needs).
 */
describe('F08-AC5 / EC26 — the theme survives a close/reopen of the real file-backed db', () => {
  let dbFile;
  let restartDb;
  let restartServer;
  let restartBase;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'f08-ac5-')), 'tagvault.db');
  });

  afterEach(async () => {
    if (restartServer) await new Promise((resolve) => restartServer.close(resolve));
    if (restartDb) restartDb.close();
    fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
  });

  it('GET returns the previously set value after the connection and server are closed and reopened', async () => {
    const firstDb = createDb({ file: dbFile });
    const firstApp = createApp({ db: firstDb, now: () => new Date('2025-01-15T10:30:00.000Z') });
    const firstServer = await new Promise((resolve) => {
      const s = firstApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    const firstBase = `http://127.0.0.1:${firstServer.address().port}`;

    const putResponse = await fetch(`${firstBase}/api/settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    expect(putResponse.status).toBe(200);

    // Close the connection and the listener — the only things a real process
    // restart does to a file-backed better-sqlite3 handle that matter here
    // (the file itself, not the process, is what must carry the truth forward).
    await new Promise((resolve) => firstServer.close(resolve));
    firstDb.close();

    restartDb = createDb({ file: dbFile });
    const reopenedApp = createApp({
      db: restartDb,
      now: () => new Date('2025-01-15T11:00:00.000Z'),
    });
    restartServer = await new Promise((resolve) => {
      const s = reopenedApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    restartBase = `http://127.0.0.1:${restartServer.address().port}`;

    const getResponse = await fetch(`${restartBase}/api/settings/theme`);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ theme: 'dark' });
  });
});
