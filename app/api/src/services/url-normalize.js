/**
 * URL normalization (INV-02, LD-04 option A) and the INV-06 hostname fallback.
 *
 * PRECONDITION: the input has already passed validateUrl(). These functions are NOT
 * validators — new URL() parses javascript:alert(1) and http://localhost without
 * complaint, which is exactly why the scheme and dot checks run first (LD-04).
 * A precondition breach is a caller bug and throws; user input never reaches here
 * unvalidated.
 *
 * Shared verbatim with F06 (hld.md section 6.3) so EC05 and EC16 cannot drift.
 */

const ALLOWED_PROTOCOLS = Object.freeze(['http:', 'https:']);

function parseOrThrow(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError('normalizeUrl called with a URL that did not pass validateUrl');
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new TypeError('normalizeUrl called with a non-http(s) URL — validate first (LD-04)');
  }
  return parsed;
}

/**
 * Derive url_normalized (INV-02). Lowercasing of scheme and host, and IDNA/punycode
 * for the host (EC20), come from the WHATWG parser rather than from hand-written code.
 *
 * On top of that this function drops the fragment, drops a default port, and drops a
 * trailing '/' from the path.
 *
 * Path CASE is preserved deliberately: example.com/A and example.com/a are different
 * resources on most servers, so folding them would merge two legitimately distinct
 * bookmarks (INV-02, F01-AC12 last clause). The trailing slash is folded but the case
 * is not — that asymmetry is what F01-AC12 asks for.
 *
 * @param {string} url a URL that has already passed validateUrl
 * @returns {string}
 */
export function normalizeUrl(url) {
  const parsed = parseOrThrow(url);

  // The parser already lowercases the scheme and host, applies IDNA, and omits a
  // default port from `host`.
  let path = parsed.pathname;
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // parsed.search keeps its leading '?'; the fragment is simply never read.
  return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
}

/**
 * The INV-06 / C-F01-04 fallback title: the hostname with a leading 'www.' removed.
 * Used when no user title was supplied and the fetch did not yield one.
 *
 * Known and accepted (F01-RK1): two hosts differing only by 'www.' produce the same
 * displayed title while remaining two distinct bookmarks, because url_normalized
 * keeps the 'www.'. Cosmetic, not a duplicate-detection flaw.
 *
 * @param {string} url a URL that has already passed validateUrl
 * @returns {string}
 */
export function hostnameForTitle(url) {
  const { hostname } = parseOrThrow(url);
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}
