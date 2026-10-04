import http from 'node:http';
import dns from 'node:dns';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTitleFetcher } from '../src/services/title-fetch.js';

/**
 * F01-AC6 / NFR-05 — REAL wall-clock measurement.
 *
 * title-fetch.test.js proves the 5s budget against an INJECTED FAKE clock: it
 * asserts the timer is armed for exactly 5000ms and that advancing the fake clock
 * resolves the promise. That proves the budget LOGIC, but not that a real, genuinely
 * unresponsive connection is actually abandoned within 5 real seconds rather than,
 * say, hanging on a socket-level default that is longer.
 *
 * This test opens a REAL server on 127.0.0.1 that accepts the TCP connection and
 * then never writes a response, uses the REAL default clock (setTimeout/Date.now),
 * and measures actual elapsed wall-clock time with Date.now().
 *
 * Like title-fetch.loopback.test.js, it must disable the SSRF guard to reach
 * 127.0.0.1 at all. That override exists ONLY in this file and in
 * title-fetch.loopback.test.js for this stated reason. See the reviewer note there.
 */

let server;
let port;

beforeAll(async () => {
  // Accepts the connection, writes nothing, ever. A real "unresponsive host".
  server = http.createServer(() => {
    /* never respond */
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('F01-AC6 / NFR-05 — real elapsed time against a genuinely unresponsive host', () => {
  it('abandons the fetch within 5 real seconds (observed, not simulated)', async () => {
    const fetchTitle = createTitleFetcher({
      lookup: dns.lookup,
      request: (options, callback) => http.request(options, callback),
      // Real default clock — no fake timers. Guard disabled ONLY to reach
      // 127.0.0.1; the SSRF guard's own behavior is not under test here.
      isBlocked: () => false,
    });

    const start = Date.now();
    const result = await fetchTitle(`http://127.0.0.1:${port}/slow`);
    const elapsedMs = Date.now() - start;

    expect(result).toEqual({ ok: false, reason: 'timeout' });
    // Observed interval must be <= 5s per NFR-05/AC6, with a small margin for
    // event-loop and scheduling jitter on a loaded CI/dev machine.
    expect(elapsedMs).toBeLessThanOrEqual(5500);
    expect(elapsedMs).toBeGreaterThanOrEqual(4900);
  }, 8000);
});
