/**
 * The client-side echo of the §7.1 validation rules.
 *
 * This is a CONVENIENCE, not a control. The server runs the same rules and its
 * status is what the acceptance criteria assert (S1); this exists only so a typo
 * does not cost a round trip. The messages are duplicated verbatim from the API so
 * a user sees the same words whichever layer catches the mistake.
 */

export const MAX_URL_LENGTH = 2048;
export const MAX_USER_TITLE_LENGTH = 140;

export const MESSAGES = {
  EMPTY: 'Enter a web address to save.',
  TOO_LONG: 'That web address is too long (limit 2,048 characters).',
  NOT_A_WEB_ADDRESS: 'Enter a web address starting with http:// or https://.',
  TITLE_TOO_LONG: 'That title is too long (limit 140 characters).',
} as const;

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export type UrlCheck = { ok: true; url: string } | { ok: false; message: string };

/** Rules 1-5 of §7.1, applied in the same order as the server. */
export function validateUrl(raw: unknown): UrlCheck {
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (value === '') return { ok: false, message: MESSAGES.EMPTY };
  if (value.length > MAX_URL_LENGTH) return { ok: false, message: MESSAGES.TOO_LONG };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  // A hostname with no dot is a bare or intranet name, not a public web address
  // (F01-EC1, C-F01-02). Rejecting it here also keeps `http://localhost:3000` out.
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { ok: false, message: MESSAGES.NOT_A_WEB_ADDRESS };
  }

  return { ok: true, url: value };
}

export type TitleCheck = { ok: true; title: string } | { ok: false; message: string };

/** Rule 6 of §7.1. */
export function validateUserTitle(raw: unknown): TitleCheck {
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (value.length > MAX_USER_TITLE_LENGTH) {
    return { ok: false, message: MESSAGES.TITLE_TOO_LONG };
  }

  return { ok: true, title: value };
}
