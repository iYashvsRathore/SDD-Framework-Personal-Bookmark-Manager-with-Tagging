import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createTitleFetcher } from '../src/services/title-fetch.js';

/**
 * F01-EC2 — the DNS-rebinding half, explicitly.
 *
 * title-fetch.test.js already asserts (in "connects to the VALIDATED address,
 * closing the DNS-rebinding window") that the options passed to `request` carry a
 * `lookup` override bound to the FIRST resolved address. This file adds the attack
 * scenario spec.md and lld.md section 11 actually describe: a hostname whose second
 * DNS answer differs from its first (the classic rebinding shape), and asserts the
 * fetcher never gives that second answer a chance to matter — because it never
 * re-resolves between the check and the connect.
 *
 * spec.md section 3 explicitly carries "the DNS-rebinding half of F01-EC2" to
 * /test-phase as a fault-injection item; this is that test.
 */

const PUBLIC = [{ address: '93.184.216.34', family: 4 }];
const PRIVATE = [{ address: '127.0.0.1', family: 4 }];

function makeRebindingLookup() {
  const calls = [];
  // First call: public. Any SUBSEQUENT call for the same host: private. A lookup
  // implementation that re-resolves mid-request would hand the attacker's second
  // (private) answer to the connector.
  const fn = (hostname, _options, callback) => {
    calls.push(hostname);
    const answer = calls.filter((h) => h === hostname).length === 1 ? PUBLIC : PRIVATE;
    queueMicrotask(() => callback(null, answer));
  };
  fn.calls = calls;
  return fn;
}

function makeRequest(onConnect) {
  const calls = [];
  const fn = (options, callback) => {
    calls.push(options);
    onConnect?.(options);
    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = { 'content-type': 'text/html; charset=utf-8' };
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => {
      queueMicrotask(() => {
        callback(res);
        queueMicrotask(() => {
          res.emit('data', Buffer.from('<html><head><title>Rebind Target</title></head></html>'));
          res.emit('end');
        });
      });
    };
    return req;
  };
  fn.calls = calls;
  return fn;
}

describe('F01-EC2 — DNS rebinding: a host whose SECOND answer is private', () => {
  it('resolves once, connects to the FIRST (public) answer, and never re-resolves', async () => {
    const lookup = makeRebindingLookup();
    const request = makeRequest();
    const fetchTitle = createTitleFetcher({ lookup, request });

    const result = await fetchTitle('https://rebinder.example.com/x');

    expect(result).toEqual({ ok: true, title: 'Rebind Target' });
    // The production connector's injected `lookup` (bound to the validated address)
    // is what request.calls[0].lookup is; the OUTER lookup — the one an attacker
    // controls — was invoked exactly once for this hostname.
    expect(lookup.calls.filter((h) => h === 'rebinder.example.com')).toHaveLength(1);

    // Prove the address actually wired into the connect options is the FIRST
    // (public) answer, not a re-resolved private one.
    const connectLookup = request.calls[0].lookup;
    const resolved = await new Promise((resolve) =>
      connectLookup('rebinder.example.com', {}, (_e, address) => resolve(address))
    );
    expect(resolved).toBe('93.184.216.34');
  });

  it('a host that is ALREADY private on the first answer is still refused (baseline)', async () => {
    const lookup = (hostname, _options, callback) => queueMicrotask(() => callback(null, PRIVATE));
    const request = makeRequest();
    const fetchTitle = createTitleFetcher({ lookup, request });

    const result = await fetchTitle('https://private-from-the-start.example.com/x');

    expect(result).toEqual({ ok: false, reason: 'blocked' });
    expect(request.calls).toHaveLength(0);
  });
});
