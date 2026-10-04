import http from 'node:http';
import dns from 'node:dns';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTitleFetcher } from '../src/services/title-fetch.js';

/**
 * ===================================================================
 *  THE LD-01 HONESTY CHECK — the ONLY F01 test that opens a socket.
 * ===================================================================
 *
 * Every other title-fetch test drives a hand-written fake `request`. A fake can
 * drift from Node's real API, so a fetcher that passes every unit test could still
 * fail against a real socket. This test runs the REAL fetcher — real node:http,
 * real dns.lookup — against a throwaway server on 127.0.0.1.
 *
 * To reach 127.0.0.1 at all it passes `isBlocked: () => false`, which DISABLES THE
 * SSRF GUARD FOR THIS TEST ONLY. That override exists solely here. Production wires
 * createProductionTitleFetcher(), which never overrides it, and the guard's own
 * behavior is asserted exhaustively in address-range.test.js and title-fetch.test.js.
 *
 * Reviewers: this is not a guard bypass in the product. If you ever see
 * `isBlocked:` outside this file, that IS a finding.
 */

let server;
let port;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<html><head><title>  Loopback &amp; Real  </title></head><body>x</body></html>');
      return;
    }
    if (req.url === '/json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"title":"not html"}');
      return;
    }
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end('<html><head><title>Missing</title></head></html>');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** The real fetcher, with the loopback rule disabled for this file only. */
function realFetcherWithGuardDisabled() {
  return createTitleFetcher({
    lookup: dns.lookup,
    request: (options, callback) => http.request(options, callback),
    isBlocked: () => false,
  });
}

describe('LD-01 honesty check — the real fetcher against a real loopback server', () => {
  it('extracts, decodes and collapses a title over a real socket', async () => {
    const fetchTitle = realFetcherWithGuardDisabled();

    const result = await fetchTitle(`http://127.0.0.1:${port}/html`);

    expect(result).toEqual({ ok: true, title: 'Loopback & Real' });
  });

  it('refuses a real non-HTML response', async () => {
    const fetchTitle = realFetcherWithGuardDisabled();

    const result = await fetchTitle(`http://127.0.0.1:${port}/json`);

    expect(result).toEqual({ ok: false, reason: 'non-html' });
  });

  it('refuses a real 404', async () => {
    const fetchTitle = realFetcherWithGuardDisabled();

    const result = await fetchTitle(`http://127.0.0.1:${port}/missing`);

    expect(result).toEqual({ ok: false, reason: 'status-404' });
  });

  it('WITH the guard enabled, the same real fetcher opens no connection to loopback', async () => {
    let requestCalls = 0;
    const fetchTitle = createTitleFetcher({
      lookup: dns.lookup,
      request: (options, callback) => {
        requestCalls += 1;
        return http.request(options, callback);
      },
      // No isBlocked override: the real guard applies.
    });

    const result = await fetchTitle(`http://127.0.0.1:${port}/html`);

    expect(result).toEqual({ ok: false, reason: 'blocked' });
    expect(requestCalls).toBe(0);
  });
});
