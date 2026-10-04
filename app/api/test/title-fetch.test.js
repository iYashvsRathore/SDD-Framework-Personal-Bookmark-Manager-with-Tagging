import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { MAX_BYTES, cleanTitle, createTitleFetcher } from '../src/services/title-fetch.js';

/* ------------------------------------------------------------------ *
 * Test doubles for the LD-01 seam. The injected `lookup` IS the DNS
 * harness; asserting that `request` was never called is how F01-AC13's
 * "no TCP connection is opened" becomes observable (AS-F01-01).
 * ------------------------------------------------------------------ */

const PUBLIC = [{ address: '93.184.216.34', family: 4 }];
const PRIVATE = [{ address: '127.0.0.1', family: 4 }];

function makeLookup(mapping) {
  const calls = [];
  const fn = (hostname, _options, callback) => {
    calls.push(hostname);
    const entry =
      typeof mapping === 'function' ? mapping(hostname, calls.length) : mapping[hostname];
    queueMicrotask(() => {
      if (entry instanceof Error) callback(entry);
      else callback(null, entry ?? PUBLIC);
    });
  };
  fn.calls = calls;
  return fn;
}

function makeResponse({ statusCode = 200, headers = {}, chunks = [] }) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = headers;
  res.destroyed = false;
  res.destroy = () => {
    res.destroyed = true;
  };
  res.emitBody = () => {
    for (const chunk of chunks) {
      if (res.destroyed) return;
      res.emit('data', Buffer.from(chunk));
    }
    if (!res.destroyed) res.emit('end');
  };
  return res;
}

/** @param responder (options, callIndex) => response | 'hang' */
function makeRequest(responder) {
  const calls = [];
  const responses = [];
  const fn = (options, callback) => {
    calls.push(options);
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => {
      queueMicrotask(() => {
        const res = responder(options, calls.length);
        if (res === 'hang') return;
        responses.push(res);
        callback(res);
        queueMicrotask(() => res.emitBody());
      });
    };
    return req;
  };
  fn.calls = calls;
  fn.responses = responses;
  return fn;
}

function makeClock() {
  let time = 1_000_000;
  const timers = [];
  return {
    now: () => time,
    setTimeout: (fn, ms) => {
      const timer = { fn, at: time + ms, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      if (timer) timer.cancelled = true;
    },
    advance(ms) {
      time += ms;
    },
    fireDue() {
      for (const timer of timers) {
        if (!timer.cancelled && timer.at <= time) {
          timer.cancelled = true;
          timer.fn();
        }
      }
    },
  };
}

const html = (title) => [`<html><head><title>${title}</title></head><body>hi</body></html>`];
const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8' };

function fetcherFor({ lookup, request, clock }) {
  return createTitleFetcher({ lookup, request, clock: clock ?? makeClock() });
}

/* ------------------------------------------------------------------ */

describe('F01-AC13 / EC09 — a private resolved address opens NO connection', () => {
  it.each([
    ['127.0.0.1', [{ address: '127.0.0.1', family: 4 }]],
    ['10.0.0.1', [{ address: '10.0.0.1', family: 4 }]],
    ['192.168.1.1', [{ address: '192.168.1.1', family: 4 }]],
    ['169.254.169.254', [{ address: '169.254.169.254', family: 4 }]],
    ['::1', [{ address: '::1', family: 6 }]],
    ['::ffff:127.0.0.1', [{ address: '::ffff:127.0.0.1', family: 6 }]],
  ])('refuses a host resolving to %s without calling request', async (_label, addresses) => {
    const lookup = makeLookup({ 'private.example.com': addresses });
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS, chunks: html('X') }));
    const fetchTitle = fetcherFor({ lookup, request });

    const result = await fetchTitle('https://private.example.com/x');

    expect(result).toEqual({ ok: false, reason: 'blocked' });
    // The assertion that matters: zero TCP connections.
    expect(request.calls).toHaveLength(0);
  });

  it('refuses when ANY of several resolved addresses is private', async () => {
    const lookup = makeLookup({
      'mixed.example.com': [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    });
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS, chunks: html('X') }));

    const result = await fetcherFor({ lookup, request })('https://mixed.example.com/x');

    expect(result.ok).toBe(false);
    expect(request.calls).toHaveLength(0);
  });
});

describe('F01-AC4 — a successful fetch', () => {
  it('extracts the title and reports ok', async () => {
    const lookup = makeLookup({ 'example.com': PUBLIC });
    const request = makeRequest(() =>
      makeResponse({ headers: HTML_HEADERS, chunks: html('Weeknight tomato pasta') })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/recipe');

    expect(result).toEqual({ ok: true, title: 'Weeknight tomato pasta' });
  });

  it('connects to the VALIDATED address, closing the DNS-rebinding window', async () => {
    const lookup = makeLookup({ 'example.com': PUBLIC });
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS, chunks: html('T') }));

    await fetcherFor({ lookup, request })('https://example.com/x');

    const options = request.calls[0];
    expect(typeof options.lookup).toBe('function');
    const resolved = await new Promise((resolve) =>
      options.lookup('example.com', {}, (_e, address, family) => resolve({ address, family }))
    );
    expect(resolved).toEqual({ address: '93.184.216.34', family: 4 });
  });
});

describe('F01-EC5 — redirect chains are re-validated on every hop', () => {
  it('abandons the chain at a hop that resolves to a private address', async () => {
    const lookup = makeLookup({ 'hop1.example.com': PUBLIC, 'hop2.example.com': PRIVATE });
    const request = makeRequest(() =>
      makeResponse({ statusCode: 302, headers: { location: 'https://hop2.example.com/next' } })
    );

    const result = await fetcherFor({ lookup, request })('https://hop1.example.com/start');

    expect(result).toEqual({ ok: false, reason: 'blocked' });
    // Hop 1 connected; hop 2 never did.
    expect(request.calls).toHaveLength(1);
    expect(lookup.calls).toEqual(['hop1.example.com', 'hop2.example.com']);
  });

  it('refuses a 4th hop', async () => {
    const lookup = makeLookup(() => PUBLIC);
    let n = 0;
    const request = makeRequest(() => {
      n += 1;
      return makeResponse({
        statusCode: 302,
        headers: { location: `https://example.com/r${n}` },
      });
    });

    const result = await fetcherFor({ lookup, request })('https://example.com/start');

    expect(result).toEqual({ ok: false, reason: 'too-many-redirects' });
    expect(request.calls).toHaveLength(4);
  });

  it('detects a redirect loop', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({ statusCode: 302, headers: { location: 'https://example.com/a' } })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/a');

    expect(result).toEqual({ ok: false, reason: 'redirect-loop' });
  });

  it('refuses a redirect to a non-http(s) scheme', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({ statusCode: 302, headers: { location: 'file:///etc/passwd' } })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/a');

    expect(result).toEqual({ ok: false, reason: 'invalid-redirect-target' });
    expect(request.calls).toHaveLength(1);
  });

  it('refuses a redirect to a dotless host', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({ statusCode: 302, headers: { location: 'http://localhost:3000/x' } })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/a');

    expect(result).toEqual({ ok: false, reason: 'invalid-redirect-target' });
    expect(request.calls).toHaveLength(1);
  });
});

describe('EC06 — every failure shape returns ok:false and never throws', () => {
  it.each([
    ['a 404', { statusCode: 404, headers: HTML_HEADERS }],
    ['a 500', { statusCode: 500, headers: HTML_HEADERS }],
    ['a 403', { statusCode: 403, headers: HTML_HEADERS }],
  ])('%s yields ok:false', async (_label, response) => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() => makeResponse(response));

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
  });

  it.each([
    ['application/json', 'application/json'],
    ['application/pdf', 'application/pdf'],
    ['text/plain', 'text/plain; charset=utf-8'],
    ['a missing Content-Type', undefined],
  ])('refuses %s as non-HTML', async (_label, contentType) => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: contentType ? { 'content-type': contentType } : {},
        chunks: html('Should not be read'),
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: false, reason: 'non-html' });
  });

  it('returns ok:false when DNS fails', async () => {
    const lookup = makeLookup({ 'example.com': new Error('ENOTFOUND') });
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS }));

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: false, reason: 'dns' });
    expect(request.calls).toHaveLength(0);
  });

  it('returns ok:false when the socket errors', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = (_options, _callback) => {
      const req = new EventEmitter();
      req.destroy = () => {};
      req.end = () => queueMicrotask(() => req.emit('error', new Error('ECONNRESET')));
      return req;
    };

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: false, reason: 'network' });
  });
});

describe('F01-EC3 — an empty or whitespace-only title is NOT a title (INV-06)', () => {
  it.each([
    ['empty', '<html><head><title></title></head></html>'],
    ['whitespace only', '<html><head><title>   \n\t  </title></head></html>'],
    ['entity whitespace', '<html><head><title>&nbsp;</title></head></html>'],
  ])('%s yields ok:false', async (_label, body) => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS, chunks: [body] }));

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('empty-title');
  });

  it('yields ok:false when there is no title element at all', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({ headers: HTML_HEADERS, chunks: ['<html><body>no head</body></html>'] })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: false, reason: 'no-title' });
  });
});

describe('EC08 — the read is bounded', () => {
  it('abandons a body that exceeds 512 KB', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: ['<html><head>', 'x'.repeat(MAX_BYTES + 1024), '<title>Too late to matter</title>'],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/huge');

    expect(result.ok).toBe(false);
    expect(request.responses[0].destroyed).toBe(true);
  });

  it('stops reading as soon as </title> arrives', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: ['<html><head><title>Early</title>', 'x'.repeat(1024)],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: true, title: 'Early' });
    expect(request.responses[0].destroyed).toBe(true);
  });
});

describe('F01-AC6 / NFR-05 — one hard 5 s budget on the injected clock', () => {
  it('abandons an unresponsive host when the budget expires', async () => {
    const clock = makeClock();
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() => 'hang');

    const pending = fetcherFor({ lookup, request, clock })('https://example.com/slow');

    clock.advance(5000);
    clock.fireDue();

    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('arms the budget timer for exactly 5,000 ms', async () => {
    const clock = makeClock();
    const armed = [];
    const wrapped = {
      ...clock,
      setTimeout: (fn, ms) => {
        armed.push(ms);
        return clock.setTimeout(fn, ms);
      },
    };
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() => makeResponse({ headers: HTML_HEADERS, chunks: html('T') }));

    await fetcherFor({ lookup, request, clock: wrapped })('https://example.com/x');

    expect(armed).toEqual([5000]);
  });
});

describe('title cleaning (F01-AC4, F01-AC16, INV-05)', () => {
  it('decodes HTML entities', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: ['<html><head><title>&amp;Hello</title></head></html>'],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: true, title: '&Hello' });
  });

  it('collapses whitespace', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: ['<html><head><title>\n  a  b\n</title></head></html>'],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: true, title: 'a b' });
  });

  it('truncates a 400-character title to 300', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const long = 'T'.repeat(400);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: [`<html><head><title>${long}</title></head></html>`],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result.ok).toBe(true);
    expect(result.title).toHaveLength(300);
    expect(result.title).toBe('T'.repeat(300));
  });

  // F01-AC16: the title is PLAIN TEXT. Nothing is stripped or executed — the
  // characters are kept literally and escaped at render time by interpolation.
  it('keeps a <script> title as literal text', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = makeRequest(() =>
      makeResponse({
        headers: HTML_HEADERS,
        chunks: [
          '<html><head><title>&lt;script&gt;alert(1)&lt;/script&gt;Hello</title></head></html>',
        ],
      })
    );

    const result = await fetcherFor({ lookup, request })('https://example.com/x');

    expect(result).toEqual({ ok: true, title: '<script>alert(1)</script>Hello' });
  });

  it.each([
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&#x41;', 'A'],
    ['&#65;', 'A'],
  ])('cleanTitle decodes %s', (entity, expected) => {
    expect(cleanTitle(entity)).toBe(expected);
  });

  it('cleanTitle leaves an unknown entity alone rather than guessing', () => {
    expect(cleanTitle('&notarealentity;')).toBe('&notarealentity;');
  });
});

describe('the factory contract', () => {
  it('requires lookup and request', () => {
    expect(() => createTitleFetcher({})).toThrow(TypeError);
    expect(() => createTitleFetcher({ lookup: () => {} })).toThrow(TypeError);
  });

  it('never throws, whatever the injected request does', async () => {
    const lookup = makeLookup(() => PUBLIC);
    const request = () => {
      throw new Error('boom');
    };

    await expect(fetcherFor({ lookup, request })('https://example.com/x')).resolves.toEqual({
      ok: false,
      reason: 'request-error',
    });
  });
});
