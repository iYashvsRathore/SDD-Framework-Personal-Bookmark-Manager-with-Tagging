/**
 * Splits a bookmark's URL into a bold hostname and the remaining path/query, for
 * the card row (F03-AC8). Ported from `docs/mockup.html`'s card renderer.
 */
export interface DisplayUrl {
  readonly host: string;
  readonly rest: string;
}

/**
 * @param raw the bookmark's stored `url` — already validated at save time, so a
 *   parse failure here is not expected, but the fallback keeps rendering safe
 *   rather than letting a template throw (S3).
 */
export function displayUrl(raw: string): DisplayUrl {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { host: raw, rest: '' };
  }

  // A leading www. is stripped for display only — the stored URL is untouched.
  const host = parsed.host.replace(/^www\./, '');
  const rest = parsed.pathname.replace(/\/$/, '') + parsed.search;

  return { host, rest };
}
