/**
 * URL validation at the API boundary (lld.md section 7.1, hld.md section 8, INV-01).
 *
 * The rule order is fixed and stops at the first failure, so the message is always
 * specific to the actual fault. Rules 3, 4 and 5 deliberately share one message:
 * telling the user which of the three shapes they got wrong would leak parser detail
 * without helping them (F01-AC8, F01-AC9, AMD-001).
 *
 * This module never throws on user input and never touches the network.
 * It is shared verbatim with F06 (hld.md section 6.3).
 */

export const MAX_URL_LENGTH = 2048;
export const MAX_USER_TITLE_LENGTH = 140;

/** The three exact strings. Any change here is a user-visible contract change. */
export const MESSAGES = Object.freeze({
  EMPTY: 'Enter a web address to save.',
  TOO_LONG: 'That web address is too long (limit 2,048 characters).',
  NOT_A_WEB_ADDRESS: 'Enter a web address starting with http:// or https://.',
  TITLE_TOO_LONG: 'That title is too long (limit 140 characters).',
});

const ALLOWED_PROTOCOLS = Object.freeze(['http:', 'https:']);

/**
 * @param {unknown} raw the submitted value, straight off the request body
 * @returns {{ ok: true, url: string } | { ok: false, message: string }}
 */
export function validateUrl(raw) {
  // Rule 1 — trim; must not be empty or whitespace-only (EC01, F01-AC7).
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (url === '') {
    return { ok: false, message: MESSAGES.EMPTY };
  }

  // Rule 2 — length after trimming. Checked BEFORE parsing, so no unbounded string
  // ever reaches the parser (EC04, F01-EC4, F01-AC10).
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, message: MESSAGES.TOO_LONG };
  }

  // Rule 3 — must parse. new URL() is a parser, not a validator (LD-04): it happily
  // accepts javascript: and http://localhost, so rules 4 and 5 below do the real work.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  // Rule 4 — scheme allow-list (EC02, EC03, F01-AC9).
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  // Rule 5 — hostname present and containing at least one dot (INV-01, AMD-001,
  // F01-EC1). This removes every single-label name — localhost, intranet, router —
  // before the resolver is ever consulted, which is a security control, not a
  // formatting rule (S2, RK02).
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  return { ok: true, url };
}

/**
 * Rule 6 — defence in depth for a user-supplied title (INV-05). maxlength="140" stops
 * this in the browser; a direct API call is the case S1 cares about.
 * @param {unknown} raw
 * @returns {{ ok: true, title: string } | { ok: false, message: string }}
 */
export function validateUserTitle(raw) {
  const title = typeof raw === 'string' ? raw.trim() : '';
  if (title.length > MAX_USER_TITLE_LENGTH) {
    return { ok: false, message: MESSAGES.TITLE_TOO_LONG };
  }
  return { ok: true, title };
}
