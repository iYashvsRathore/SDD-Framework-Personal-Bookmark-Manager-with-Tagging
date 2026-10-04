import { escapeLikePattern } from '../lib/like-escape.js';

/**
 * The shared predicate/count query builder (AD-07, AS-F03-01).
 *
 * `buildPredicate()` returns the ONE `{ where, params }` pair that both
 * `countWhere` and `listPage` consume, so `total` can never disagree with the
 * rows actually returned (data-model.md section 3).
 *
 * F03 wires only the `deleted_at IS NULL` predicate. F04 extended this SAME
 * function with an optional tag `EXISTS` subquery; F05 refactors it to a
 * clause array (LD-01) and adds an optional search `LIKE` clause (LD-02) —
 * `countWhere` and `listPage` never need to change to add a new predicate
 * (AS-F03-01).
 *
 * `where` is assembled only from a fixed vocabulary of clause fragments chosen
 * in code, never from request input; every *value* travels as a bound
 * parameter in `params` (S4).
 *
 * @param {{ tag?: string | null, q?: string | null }} [args] `tag` and `q` must
 *   already be normalized by the caller (see `normalizeTagFilterValue` and
 *   `normalizeSearchValue`) — absent/`null` means that predicate is not applied
 * @returns {{ where: string, params: unknown[] }}
 */
export function buildPredicate({ tag, q } = {}) {
  const clauses = ['deleted_at IS NULL'];
  const params = [];

  if (tag) {
    clauses.push(
      'EXISTS (SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id ' +
        'WHERE bt.bookmark_id = bookmark.id AND t.name = ?)'
    );
    params.push(tag);
  }

  if (q) {
    // S6: the pattern is escaped before being wrapped and bound — never
    // interpreted as a wildcard the caller intended (F05-AC4, AC5, AC6).
    const pattern = `%${escapeLikePattern(q)}%`;
    clauses.push(`(title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')`);
    params.push(pattern, pattern);
  }

  return { where: clauses.join(' AND '), params };
}

/**
 * Normalizes a raw `tag` query-parameter value for `buildPredicate()` (LD-02).
 *
 * Deliberately lenient and NEVER throws: an unrecognized, oddly-cased, or
 * malformed value simply normalizes to `null` ("no filter" / "matches
 * nothing" downstream), never a 400 (F04-AC7, F04-AC8). This is a separate,
 * one-line rule from `tag-service.js`'s strict storage validation (F02) —
 * the two concerns are intentionally not shared (LD-02).
 *
 * @param {unknown} raw `req.query.tag`, any shape (a repeated query parameter
 *   arrives as an array, which this treats as "no filter")
 * @returns {string | null} a trimmed, lowercased, non-empty string, or `null`
 */
export function normalizeTagFilterValue(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed === '' ? null : trimmed;
}

/**
 * Normalizes a raw `q` (search) query-parameter value for `buildPredicate()`
 * (LD-03) — a separate, lenient, NEVER-throwing normalizer colocated with
 * `normalizeTagFilterValue`, mirroring that function's precedent exactly.
 *
 * Unlike `normalizeTagFilterValue`, this does NOT lowercase: case-insensitive
 * matching is the `LIKE` operator's own job (SQLite's default collation for
 * ASCII, F05-AC3), not this function's.
 *
 * @param {unknown} raw `req.query.q`, any shape (a repeated query parameter
 *   arrives as an array, which this treats as "no search")
 * @returns {string | null} a trimmed string capped at 200 characters, or
 *   `null` for anything that is not a non-empty string after trimming
 */
export function normalizeSearchValue(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  return trimmed.slice(0, 200);
}
