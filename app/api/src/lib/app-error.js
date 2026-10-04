/**
 * The single internal error type (hld.md section 8).
 *
 * Services throw an AppError; one Express error middleware translates it into the
 * one response shape the whole API uses:
 *   { "error": { "code", "message", "field?", "existingId?", "details?" } }
 *
 * No stack trace, SQL fragment or driver code ever reaches the client (U5).
 */

/** Code to HTTP status map, hld.md section 8. */
const STATUS_BY_CODE = Object.freeze({
  INVALID_URL: 400,
  INVALID_TAG: 400,
  NOT_FOUND: 404,
  DUPLICATE_URL: 409,
  EDIT_CONFLICT: 409,
  INVALID_THEME: 400,
  STORAGE_ERROR: 500,
});

/** Used for anything that is not a recognised AppError. */
export const STORAGE_ERROR_MESSAGE =
  'TagVault could not save that. Your other bookmarks are safe — try again.';

export class AppError extends Error {
  /**
   * @param {string} code one of the keys of STATUS_BY_CODE
   * @param {string} message user-facing text; says what happened and what to do next (U5)
   * @param {{ field?: string, existingId?: number, details?: object }} [options]
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 500;
    if (options.field !== undefined) this.field = options.field;
    if (options.existingId !== undefined) this.existingId = options.existingId;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function statusForCode(code) {
  return STATUS_BY_CODE[code] ?? 500;
}

/**
 * The ONE place a 409 DUPLICATE_URL is constructed.
 *
 * LD-02 requires the pre-insert lookup path and the unique-constraint path to return
 * BYTE-IDENTICAL bodies. They stay identical because both call this function — not
 * because two call sites were written to match.
 *
 * `existingId` is a bookmark id the user already owns, not an internal identifier,
 * so U5 is satisfied (spec.md section 8).
 *
 * F06 LD-03: `tags` is optional and additive. F01's existing call site (no second
 * argument) produces the byte-identical `{ title, url }` details body it always has —
 * `tags`/`updatedAt`/`title_source` are only added to `details` when `tags` is
 * supplied, which only F06's edit path does (for the duplicate banner's "Edit
 * existing" pre-fill — F06-RV02 adds `title_source` so that entry point can
 * reproduce the real title-decision state rather than assuming `'user'`).
 *
 * @param {{ id: number, title: string, url: string, updated_at?: string, title_source?: string }} existing the live row
 * @param {string[]} [tags] already-fetched tag names for `existing` (F06 only)
 */
export function duplicateUrlError(existing, tags) {
  const details = { title: existing.title, url: existing.url };
  if (tags !== undefined) {
    details.tags = tags;
    details.updatedAt = existing.updated_at;
    details.title_source = existing.title_source;
  }
  return new AppError('DUPLICATE_URL', 'You already saved this address.', {
    field: 'url',
    existingId: existing.id,
    details,
  });
}

/**
 * The ONE place a 409 EDIT_CONFLICT is constructed (AMD-003, LD-01). Every throw
 * site produces a byte-identical body, the same pattern `duplicateUrlError()`
 * already establishes (P6).
 *
 * @returns {AppError}
 */
export function editConflictError() {
  return new AppError(
    'EDIT_CONFLICT',
    'This bookmark changed in another tab. Reload to see the latest, then try again.'
  );
}

/**
 * The ONE place a 409 DUPLICATE_URL is constructed for F07's restore race
 * (LD-03, F07-AC7). Kept as a second, dedicated constructor — rather than a
 * branch inside `duplicateUrlError()` — so the two wordings can never drift
 * onto each other by accident (lld.md section 1, P6).
 *
 * @param {{ id: number }} existing the live row that now holds the URL
 * @returns {AppError}
 */
export function restoreDuplicateUrlError(existing) {
  return new AppError(
    'DUPLICATE_URL',
    'That address has been saved again since. Nothing was restored.',
    { field: 'url', existingId: existing.id }
  );
}

/**
 * The ONE place a 400 INVALID_THEME is constructed (AMD-004, lld.md section 3),
 * the same single-source-of-truth discipline `duplicateUrlError()` and
 * `editConflictError()` already establish (P6).
 *
 * @returns {AppError}
 */
export function invalidThemeError() {
  return new AppError('INVALID_THEME', 'Theme must be "light" or "dark".', {
    field: 'theme',
  });
}

/**
 * Build the client-facing body. Only the whitelisted keys are copied out, so an
 * internal field added to an AppError later cannot leak by accident.
 * @param {unknown} err
 * @returns {{ status: number, body: { error: object } }}
 */
export function toErrorResponse(err) {
  if (!(err instanceof AppError)) {
    return {
      status: 500,
      body: { error: { code: 'STORAGE_ERROR', message: STORAGE_ERROR_MESSAGE } },
    };
  }
  const error = { code: err.code, message: err.message };
  if (err.field !== undefined) error.field = err.field;
  if (err.existingId !== undefined) error.existingId = err.existingId;
  if (err.details !== undefined) error.details = err.details;
  return { status: err.status, body: { error } };
}
