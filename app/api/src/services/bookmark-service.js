import { AppError, duplicateUrlError, editConflictError } from '../lib/app-error.js';
import { validateUrl, validateUserTitle } from '../lib/validate-url.js';
import { clampPage, clampSize, computeMaxPage } from '../lib/pagination.js';
import { hostnameForTitle, normalizeUrl } from './url-normalize.js';
import { buildPredicate, normalizeSearchValue, normalizeTagFilterValue } from './list-query.js';

/**
 * The create orchestration: validate -> normalize -> duplicate lookup -> title
 * decision -> transactional insert (lld.md section 10).
 *
 * This is the layer Q4's >=80% coverage is measured on, so every dependency that
 * would otherwise make it untestable — the fetcher and the clock — is injected.
 *
 * `tagService` is optional (undefined-safe): a caller that never wires it keeps
 * F01's exact pre-F02 behavior, since no tags are ever validated or attached.
 */

export function createBookmarkService({
  repository,
  fetchTitle,
  tagService,
  now = () => new Date(),
}) {
  /** ISO-8601 UTC, the format data-model.md fixes so lexicographic order == chronological. */
  const timestamp = () => now().toISOString();

  /**
   * F06-RV01: the url/title/tag validation block shared, verbatim, by `create()`
   * and `update()` — extracted so the two orchestrations cannot drift apart on
   * rule order or error wrapping (P6).
   *
   * @param {{ url?: unknown, title?: unknown, tags?: unknown }} payload
   * @returns {{ url: string, userTitle: string, tags: string[] }}
   * @throws {AppError} INVALID_URL or INVALID_TAG, identical to the inline checks
   *   this replaces
   */
  function validatePayload(payload) {
    const urlCheck = validateUrl(payload.url);
    if (!urlCheck.ok) {
      throw new AppError('INVALID_URL', urlCheck.message, { field: 'url' });
    }
    const url = urlCheck.url;

    const titleCheck = validateUserTitle(payload.title);
    if (!titleCheck.ok) {
      throw new AppError('INVALID_URL', titleCheck.message, { field: 'title' });
    }
    const userTitle = titleCheck.title;

    let tags = [];
    if (tagService) {
      const tagCheck = tagService.normalizeAndValidate(payload.tags);
      if (!tagCheck.ok) {
        throw new AppError('INVALID_TAG', tagCheck.message, { field: 'tags' });
      }
      tags = tagCheck.tags;
    }

    return { url, userTitle, tags };
  }

  /**
   * F06-RV01: the fetch-or-hostname-fallback title decision shared by `create()`
   * and `update()` — identical behavior to the two inline copies it replaces
   * (a supplied title never calls the fetcher; a failed fetch is never an error
   * response, hld.md section 8).
   *
   * @param {string} url
   * @param {string} userTitle
   * @returns {Promise<{ title: string, titleSource: 'user' | 'fetched' | 'hostname' }>}
   */
  async function decideTitle(url, userTitle) {
    if (userTitle !== '') {
      return { title: userTitle, titleSource: 'user' };
    }
    const fetched = await fetchTitle(url);
    if (fetched.ok) {
      return { title: fetched.title, titleSource: 'fetched' };
    }
    return { title: hostnameForTitle(url), titleSource: 'hostname' };
  }

  return {
    /**
     * @param {{ url?: unknown, title?: unknown, tags?: unknown }} payload the raw
     *   request body. Only `url`, `title` and `tags` are ever read: `id`,
     *   `title_source`, `created_at` and `deleted_at` are NEVER taken from the
     *   request, so a client cannot forge title_source to suppress the fetch or
     *   backdate created_at (S1).
     */
    async create(payload = {}) {
      // 1-2b. Validate url/title/tags (lld.md section 7.1, C-F02-01) — reject-whole,
      // before the duplicate lookup, so an invalid payload never writes a row.
      const { url, userTitle, tags } = validatePayload(payload);

      // 3. Normalize — strictly AFTER validation (LD-04).
      const urlNormalized = normalizeUrl(url);

      // 4. Duplicate lookup (AC11, AC12, EC05).
      const existing = repository.findLiveByNormalized(urlNormalized);
      if (existing) throw duplicateUrlError(existing);

      // 5. Decide the title.
      const { title, titleSource } = await decideTitle(url, userTitle);

      // 6. created_at and updated_at are bound to the SAME captured instant (AC1).
      const at = timestamp();

      return repository.insert(
        {
          url,
          url_normalized: urlNormalized,
          title,
          title_source: titleSource,
          created_at: at,
          updated_at: at,
        },
        tags
      );
    },

    /**
     * F06: validate -> fetch live row by id (NOT_FOUND) -> conflict check
     * (EDIT_CONFLICT) -> normalize -> duplicate-exclude-self lookup
     * (DUPLICATE_URL) -> title decision (identical to create()'s) ->
     * transactional update (lld.md section 5, section 10).
     *
     * @param {number} id the bookmark being edited (the route's :id, parsed
     *   upstream — never SQL-built here, bound only, S4)
     * @param {{ url?: unknown, title?: unknown, tags?: unknown, updatedAt?: unknown }} payload
     *   the raw request body. As with create(), only url/title/tags/updatedAt
     *   are ever read — id, title_source, created_at, deleted_at are NEVER
     *   taken from the request (S1).
     */
    async update(id, payload = {}) {
      // 1-2b. Validate the three reused fields completely before any row lookup
      // (lld.md section 7's fixed order) — an invalid shape is rejected before
      // the row is even fetched, so no row is ever touched on a 400.
      const { url, userTitle, tags } = validatePayload(payload);

      // 2. The row must still exist as a live record (F06-AC10, EC21).
      const existingRow = repository.findLiveById(id);
      if (!existingRow) {
        throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
      }

      // 3. Optimistic concurrency (LD-01, AMD-003): the server decides, never
      // the client's claim. Missing, wrong-typed, or mismatched are ALL treated
      // identically — none is coerced or defaulted.
      if (typeof payload.updatedAt !== 'string' || payload.updatedAt !== existingRow.updated_at) {
        throw editConflictError();
      }

      // 4. Normalize — strictly AFTER validation (same ordering create() uses).
      const urlNormalized = normalizeUrl(url);

      // 5. Duplicate lookup, excluding the record's own id (LD-02, F06-AC3, AC4).
      const duplicate = repository.findLiveByNormalizedExcluding(urlNormalized, id);
      if (duplicate) {
        const duplicateTags = repository.listTagsForBookmarks([duplicate.id]).map((r) => r.name);
        throw duplicateUrlError(duplicate, duplicateTags);
      }

      // 6. Decide the title — identical to create()'s, re-run whenever no user
      // title is supplied, regardless of whether the URL changed (C-F06-02).
      const { title, titleSource } = await decideTitle(url, userTitle);

      return repository.update(
        id,
        {
          url,
          url_normalized: urlNormalized,
          title,
          title_source: titleSource,
          updated_at: timestamp(),
        },
        tags
      );
    },

    /**
     * The real paging contract (lld.md section 5, F03-AC1/AC3/AC5/AC6/AC7).
     * F04 adds `tag` (lld.md section 5): normalized here, then threaded into
     * `buildPredicate()` so the filtered total, page and rows are always
     * computed against the SAME predicate (F04-AC3, AC6, AC8). F05 adds `q`
     * the same way (lld.md section 5, LD-01, LD-03): normalized via
     * `normalizeSearchValue()` alongside `tag`, so `q` and `tag` compose
     * through the one `buildPredicate()` call (F05-AC9, EC3).
     *
     * @param {{ page?: unknown, size?: unknown, tag?: unknown, q?: unknown }} [args] raw,
     *   possibly-invalid values straight from the route's query string — never
     *   validated there
     * @returns {{ items: object[], total: number, page: number, size: number }}
     *   `total`/`page`/`size` are always the CLAMPED values, never the raw request
     *   values (F03-AC5, F03-AC6)
     */
    list({ page, size, tag, q } = {}) {
      const { where, params } = buildPredicate({
        tag: normalizeTagFilterValue(tag),
        q: normalizeSearchValue(q),
      });
      const clampedSize = clampSize(size);

      const total = repository.countWhere(where, params);
      const maxPage = computeMaxPage(total, clampedSize);
      const clampedPage = clampPage(page, maxPage);
      const offset = (clampedPage - 1) * clampedSize;

      const rows = repository.listPage({ where, params, limit: clampedSize, offset });

      // An empty page never calls listTagsForBookmarks's statement (F03-AC2).
      const tagRows = repository.listTagsForBookmarks(rows.map((row) => row.id));
      const tagsByBookmarkId = new Map();
      for (const { bookmark_id: bookmarkId, name } of tagRows) {
        const tags = tagsByBookmarkId.get(bookmarkId) ?? [];
        tags.push(name);
        tagsByBookmarkId.set(bookmarkId, tags);
      }

      const items = rows.map((row) => ({ ...row, tags: tagsByBookmarkId.get(row.id) ?? [] }));

      return { items, total, page: clampedPage, size: clampedSize };
    },

    /**
     * The live (unfiltered) bookmark count (LD-04, F04-AC1, AC12) — the exact
     * same `buildPredicate()` + `countWhere()` call `list()` already makes for
     * its own `total` when no tag is given, just not threaded through
     * `clampPage`/`listPage`.
     *
     * @returns {number} the live bookmark count
     */
    countLive() {
      const { where, params } = buildPredicate();
      return repository.countWhere(where, params);
    },

    /**
     * F07: soft-delete (lld.md section 5, section 8). Rejects a non-integer
     * `id` with NOT_FOUND BEFORE any repository call (F07-AC10) — this is
     * what keeps a NaN bind value from ever reaching the repository.
     *
     * @param {unknown} id the route's coerced, possibly-invalid `:id`
     * @throws {AppError} NOT_FOUND on a non-integer id or 0 rows changed
     *   (already deleted, never existed — F07-AC6, AC9, AC10)
     */
    softDelete(id) {
      if (!Number.isInteger(id)) {
        throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
      }
      const changes = repository.softDelete(id, timestamp());
      if (changes === 0) {
        throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
      }
    },

    /**
     * F07: restore (lld.md section 5, section 8). Rejects a non-integer `id`
     * BEFORE any repository call (F07-AC10), then confirms the row is
     * currently soft-deleted (F07-AC8) before attempting the write.
     *
     * @param {unknown} id the route's coerced, possibly-invalid `:id`
     * @returns {object} the restored row, no `tags` attached (lld.md section 5)
     * @throws {AppError} NOT_FOUND on a non-integer id or when the row is not
     *   currently soft-deleted; the restore-specific DUPLICATE_URL on the race
     */
    restore(id) {
      if (!Number.isInteger(id)) {
        throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
      }
      const row = repository.findDeletedById(id);
      if (!row) {
        throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
      }
      return repository.restore(id, row.url_normalized);
    },
  };
}
