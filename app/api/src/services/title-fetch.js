import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isBlockedAddress } from '../lib/address-range.js';
import { validateUrl } from '../lib/validate-url.js';

/**
 * The SSRF-guarded title fetcher — the single outbound network path in the entire
 * system, and the component RK02 names as the easiest in the project to get wrong.
 *
 * Built as a factory (LD-01) so `lookup`, `request` and `clock` can be injected. The
 * injected `lookup` IS the DNS harness: it makes F01-AC13 ("no TCP connection is
 * opened") observable by asserting that `request` was never called, makes F01-EC5
 * testable by returning a public address on hop 1 and a private one on hop 2, and
 * makes the DNS-rebinding shape reachable.
 *
 * fetchTitle NEVER throws. hld.md section 8 makes a failed fetch a 201, so an
 * exception escaping here would turn a specified success into a 500.
 */

/** One hard total budget across resolve + connect + response + read (NFR-05, AC6). */
export const TOTAL_BUDGET_MS = 5000;
/** EC08 read cap. */
export const MAX_BYTES = 512 * 1024;
/** At most 3 hops, each fully re-validated (F01-EC5). */
export const MAX_REDIRECTS = 3;
/** data-model.md INV-05: a fetched title is truncated to 300. */
export const MAX_TITLE_LENGTH = 300;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = 'TagVault/1.0 (+local bookmark manager; title fetch only)';

const defaultClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

function failure(reason) {
  return { ok: false, reason };
}

/** Bounded: only the first 5,000 characters after `<title` are ever scanned (TD-06). */
const TITLE_PATTERN = /<title[^>]*>([\s\S]{0,5000}?)<\/title>/i;

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
});

/**
 * Decode entities, collapse whitespace, truncate to 300. The result is PLAIN TEXT and
 * is stored as plain text, never as HTML (S3, F01-AC16): `<script>alert(1)</script>`
 * in a page title ends up as literal characters that Angular interpolation escapes.
 * @param {string} raw
 * @returns {string}
 */
export function cleanTitle(raw) {
  const decoded = raw.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity) => {
    const key = entity.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)) return NAMED_ENTITIES[key];
    if (key.startsWith('#x')) {
      const code = parseInt(key.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    if (key.startsWith('#')) {
      const code = parseInt(key.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return match;
  });

  const collapsed = decoded.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_TITLE_LENGTH ? collapsed.slice(0, MAX_TITLE_LENGTH) : collapsed;
}

/**
 * @param {{
 *   lookup: Function,
 *   request: Function,
 *   clock?: { now: Function, setTimeout: Function, clearTimeout: Function },
 *   isBlocked?: Function,
 * }} deps
 */
export function createTitleFetcher({
  lookup,
  request,
  clock = defaultClock,
  // Injected so the ONE loopback integration test can point the real fetcher at
  // 127.0.0.1 (lld.md section 11). Production never overrides it.
  isBlocked = isBlockedAddress,
} = {}) {
  if (typeof lookup !== 'function' || typeof request !== 'function') {
    throw new TypeError('createTitleFetcher requires a lookup and a request function');
  }

  /** Resolve every address, and refuse if ANY of them is blocked (hld.md section 8). */
  function resolveAndCheck(hostname, deadline) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      const remaining = deadline - clock.now();
      if (remaining <= 0) return finish({ ok: false, reason: 'timeout' });

      lookup(hostname, { all: true, family: 0 }, (err, addresses) => {
        if (err) return finish({ ok: false, reason: 'dns' });

        const list = Array.isArray(addresses) ? addresses : [];
        if (list.length === 0) return finish({ ok: false, reason: 'dns' });

        for (const entry of list) {
          const address = typeof entry === 'string' ? entry : entry?.address;
          const family = typeof entry === 'string' ? undefined : entry?.family;
          if (isBlocked(address, family)) {
            // Refused BEFORE any socket is opened (F01-AC13, EC09).
            return finish({ ok: false, reason: 'blocked' });
          }
        }

        const first = typeof list[0] === 'string' ? { address: list[0], family: 4 } : list[0];
        finish({ ok: true, address: first.address, family: first.family });
      });
    });
  }

  /** One hop. Returns a title, a redirect target, or a failure. Never throws. */
  function performRequest(url, validated, deadline) {
    return new Promise((resolve) => {
      let settled = false;
      let req = null;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (req) {
          try {
            req.destroy();
          } catch {
            /* the socket is already gone; nothing to do */
          }
        }
        resolve(value);
      };

      const remaining = deadline - clock.now();
      if (remaining <= 0) return finish(failure('timeout'));

      const parsed = new URL(url);
      const options = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers: {
          accept: 'text/html',
          'user-agent': USER_AGENT,
          host: parsed.host,
        },
        // Connect to the ALREADY-VALIDATED address. This closes the DNS-rebinding
        // window: no second resolution happens between the check and the socket.
        lookup: (_hostname, _opts, callback) => callback(null, validated.address, validated.family),
        // Redirects are never followed by the client; they are followed manually
        // with a full re-check per hop (RK02, F01-EC5).
        maxRedirects: 0,
        timeout: remaining,
      };

      try {
        req = request(options, (res) => {
          const status = res.statusCode;

          if (REDIRECT_STATUSES.has(status)) {
            const location = res.headers?.location;
            if (!location) return finish(failure('redirect-without-location'));
            try {
              return finish({ ok: true, redirectTo: new URL(location, url).toString() });
            } catch {
              return finish(failure('bad-redirect-target'));
            }
          }

          if (status < 200 || status >= 300) return finish(failure(`status-${status}`));

          const contentType = String(res.headers?.['content-type'] ?? '').toLowerCase();
          if (!contentType.split(';')[0].trim().startsWith('text/html')) {
            return finish(failure('non-html'));
          }

          const decoder = new TextDecoder('utf-8');
          let text = '';
          let bytes = 0;

          res.on('data', (chunk) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            bytes += buffer.length;
            text += decoder.decode(buffer, { stream: true });

            // Stop as soon as the closing tag is in hand — a huge page must not be
            // allowed to consume the budget (EC08).
            if (/<\/title>/i.test(text)) {
              try {
                res.destroy();
              } catch {
                /* already closed */
              }
              return finish({ ok: true, body: text });
            }
            if (bytes >= MAX_BYTES) {
              try {
                res.destroy();
              } catch {
                /* already closed */
              }
              return finish({ ok: true, body: text, truncated: true });
            }
          });

          res.on('end', () => finish({ ok: true, body: text }));
          res.on('error', () => finish(failure('read-error')));
        });
      } catch {
        return finish(failure('request-error'));
      }

      if (req && typeof req.on === 'function') {
        req.on('error', () => finish(failure('network')));
        req.on('timeout', () => finish(failure('timeout')));
      }
      if (req && typeof req.end === 'function') req.end();
    });
  }

  /**
   * @param {string} rawUrl a URL that has already passed validateUrl
   * @returns {Promise<{ ok: true, title: string } | { ok: false, reason: string }>}
   */
  return async function fetchTitle(rawUrl) {
    const deadline = clock.now() + TOTAL_BUDGET_MS;
    let budgetTimer = null;
    let timedOut = false;

    const budgetExpired = new Promise((resolve) => {
      budgetTimer = clock.setTimeout(() => {
        timedOut = true;
        resolve(failure('timeout'));
      }, TOTAL_BUDGET_MS);
    });

    try {
      const walk = async () => {
        let current = rawUrl;
        const visited = new Set();

        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
          if (timedOut || clock.now() >= deadline) return failure('timeout');

          // Every hop is re-validated in full, not just the first (F01-EC5, RK02).
          const check = validateUrl(current);
          if (!check.ok) return failure('invalid-redirect-target');

          if (visited.has(current)) return failure('redirect-loop');
          visited.add(current);

          const resolved = await resolveAndCheck(new URL(current).hostname, deadline);
          if (!resolved.ok) return failure(resolved.reason);

          const response = await performRequest(current, resolved, deadline);
          if (!response.ok) return response;

          if (response.redirectTo) {
            current = response.redirectTo;
            continue;
          }

          const match = TITLE_PATTERN.exec(response.body ?? '');
          if (!match) return failure('no-title');

          const title = cleanTitle(match[1]);
          // An empty or whitespace-only <title> counts as no title (F01-EC3, INV-06).
          if (title === '') return failure('empty-title');

          return { ok: true, title };
        }

        // A 4th hop is refused.
        return failure('too-many-redirects');
      };

      return await Promise.race([walk(), budgetExpired]);
    } catch {
      // Belt and braces: fetchTitle never throws.
      return failure('error');
    } finally {
      if (budgetTimer !== null) clock.clearTimeout(budgetTimer);
    }
  };
}

/** Production wiring: real DNS, real sockets, real clock. */
export function createProductionTitleFetcher() {
  return createTitleFetcher({
    lookup: dns.lookup,
    request: (options, callback) =>
      options.protocol === 'http:'
        ? http.request(options, callback)
        : https.request(options, callback),
    clock: defaultClock,
  });
}
