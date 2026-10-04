/**
 * Pagination clamp helpers (lld.md section 4, F03-AC5, F03-AC6).
 *
 * Every function here is pure and NEVER throws: an invalid `page` or `size` from
 * the query string always falls back to a valid value rather than producing a 400
 * or an unbounded query (S1). The route passes raw, possibly-invalid values
 * straight through — this module is the one place they are made safe.
 */

export const PAGE_SIZES = Object.freeze([10, 20, 50]);
export const DEFAULT_SIZE = 20;

/**
 * Parses a raw query value as a base-10 integer, accepting only a value that is
 * ENTIRELY digits (with an optional leading '-'). `Number('7.5')`, `Number(' ')`
 * and `Number('')` all coerce to something other than NaN, which would silently
 * accept input this function must reject, so a string is checked against a strict
 * pattern first rather than coerced directly.
 *
 * @param {unknown} raw
 * @returns {number} a finite integer, or NaN when `raw` is not one
 */
function toInt(raw) {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

/**
 * @param {unknown} raw `req.query.size`, any shape
 * @returns {number} one of PAGE_SIZES, or DEFAULT_SIZE for anything else (F03-AC5)
 */
export function clampSize(raw) {
  const n = toInt(raw);
  return PAGE_SIZES.includes(n) ? n : DEFAULT_SIZE;
}

/**
 * @param {unknown} raw `req.query.page`, any shape
 * @param {number} maxPage the already-computed last valid page (>= 1)
 * @returns {number} an integer in [1, maxPage] (F03-AC5, F03-AC6)
 */
export function clampPage(raw, maxPage) {
  const n = toInt(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, maxPage);
}

/**
 * @param {number} total the live row count matching the predicate
 * @param {number} size the already-clamped page size
 * @returns {number} the last valid page, never less than 1 (F03-EC2)
 */
export function computeMaxPage(total, size) {
  return Math.max(1, Math.ceil(total / size));
}
