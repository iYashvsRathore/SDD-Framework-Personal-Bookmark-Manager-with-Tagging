import { AppError, duplicateUrlError, restoreDuplicateUrlError } from '../lib/app-error.js';

/** Never exposes `url_normalized` or `deleted_at` to a caller (S1, F03's leak test). */
const SELECT_COLUMNS = 'id, url, title, title_source, created_at, updated_at';

/**
 * `bookmark` table reads/writes, plus the `bookmark_tag` link replacement that
 * `insert()`/`update()` perform transactionally (data-model.md "bookmark",
 * section 5's "no partial writes").
 *
 * @param {import('better-sqlite3').Database} db
 * @param {ReturnType<import('./tag-repository.js').createTagRepository>} [tagRepository]
 *   optional — a caller that never wires it (pre-F02) simply never attaches tags
 */
export function createBookmarkRepository(db, tagRepository) {
  const findLiveByNormalizedStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM bookmark WHERE deleted_at IS NULL AND url_normalized = ?`
  );
  const findLiveByNormalizedExcludingStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM bookmark WHERE deleted_at IS NULL AND url_normalized = ? AND id <> ?`
  );
  const findLiveByIdStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM bookmark WHERE deleted_at IS NULL AND id = ?`
  );
  const findDeletedByIdStmt = db.prepare(
    `SELECT id, url, url_normalized, title, title_source, created_at, updated_at, deleted_at
     FROM bookmark WHERE deleted_at IS NOT NULL AND id = ?`
  );
  const insertStmt = db.prepare(
    `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at)
     VALUES (@url, @url_normalized, @title, @title_source, @created_at, @updated_at, NULL)`
  );
  const updateStmt = db.prepare(
    `UPDATE bookmark
     SET url = @url, url_normalized = @url_normalized, title = @title,
         title_source = @title_source, updated_at = @updated_at
     WHERE id = @id AND deleted_at IS NULL`
  );
  const deleteLinksStmt = db.prepare('DELETE FROM bookmark_tag WHERE bookmark_id = ?');
  const softDeleteStmt = db.prepare(
    'UPDATE bookmark SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL'
  );
  const restoreStmt = db.prepare('UPDATE bookmark SET deleted_at = NULL WHERE id = ?');
  const selectByIdStmt = db.prepare(`SELECT ${SELECT_COLUMNS} FROM bookmark WHERE id = ?`);

  function attachTags(bookmarkId, tagNames) {
    if (!tagRepository || tagNames.length === 0) return;
    const now = selectByIdStmt.get(bookmarkId)?.created_at;
    for (const name of tagNames) {
      const tagId = tagRepository.upsertAndGetId(name, now);
      tagRepository.link(bookmarkId, tagId);
    }
  }

  return {
    /**
     * @param {string} urlNormalized
     * @returns {object | null} the live row, or `null`
     */
    findLiveByNormalized(urlNormalized) {
      return findLiveByNormalizedStmt.get(urlNormalized) ?? null;
    },

    /**
     * @param {string} urlNormalized
     * @param {number} excludeId the row's own id, excluded from the match (LD-02)
     * @returns {object | null}
     */
    findLiveByNormalizedExcluding(urlNormalized, excludeId) {
      return findLiveByNormalizedExcludingStmt.get(urlNormalized, excludeId) ?? null;
    },

    /**
     * @param {number} id
     * @returns {object | null} the live row, or `null`
     */
    findLiveById(id) {
      return findLiveByIdStmt.get(id) ?? null;
    },

    /**
     * @param {number} id
     * @returns {object | null} the soft-deleted row (including `url_normalized`
     *   and `deleted_at`, needed by the restore race check), or `null`
     */
    findDeletedById(id) {
      return findDeletedByIdStmt.get(id) ?? null;
    },

    /**
     * Inserts the bookmark and links its tags, all inside one transaction
     * (data-model.md section 5 — no partial writes, EC19).
     *
     * @param {{ url: string, url_normalized: string, title: string, title_source: string, created_at: string, updated_at: string }} data
     * @param {string[]} [tags] already-validated, deduped, alphabetical tag names
     * @returns {object} the inserted row with a `tags` array attached
     */
    insert(data, tags = []) {
      const run = db.transaction(() => {
        const info = insertStmt.run(data);
        const id = Number(info.lastInsertRowid);
        attachTags(id, tags);
        return id;
      });
      let id;
      try {
        id = run();
      } catch (err) {
        // LD-02: the race window between the pre-insert lookup and this write —
        // the unique index itself is what rejects. Byte-identical to the
        // lookup path's own DUPLICATE_URL (F01-AC14).
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          const existing = findLiveByNormalizedStmt.get(data.url_normalized);
          if (existing) throw duplicateUrlError(existing);
        }
        throw err;
      }
      const row = selectByIdStmt.get(id);
      return { ...row, tags: [...tags] };
    },

    /**
     * Updates the bookmark and replaces its tag set, all inside one
     * transaction (data-model.md section 5).
     *
     * @param {number} id
     * @param {{ url: string, url_normalized: string, title: string, title_source: string, updated_at: string }} data
     * @param {string[]} [tags] already-validated, deduped, alphabetical tag names
     * @returns {object} the updated row with a `tags` array attached
     */
    update(id, data, tags = []) {
      const run = db.transaction(() => {
        const info = updateStmt.run({ ...data, id });
        if (info.changes === 0) {
          throw new AppError('NOT_FOUND', 'That bookmark is no longer here.');
        }
        deleteLinksStmt.run(id);
        attachTags(id, tags);
      });
      try {
        run();
      } catch (err) {
        // LD-02: symmetrical to insert()'s race-translation path.
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          const existing = findLiveByNormalizedExcludingStmt.get(data.url_normalized, id);
          if (existing) throw duplicateUrlError(existing);
        }
        throw err;
      }
      const row = selectByIdStmt.get(id);
      return { ...row, tags: [...tags] };
    },

    /**
     * @param {string} where a fixed-vocabulary WHERE clause from `buildPredicate()`
     * @param {unknown[]} params bound parameters matching `where`
     * @returns {number}
     */
    countWhere(where, params) {
      return db.prepare(`SELECT COUNT(*) AS n FROM bookmark WHERE ${where}`).get(...params).n;
    },

    /**
     * @param {{ where: string, params: unknown[], limit: number, offset: number }} args
     * @returns {object[]} rows via `SELECT_COLUMNS`, newest first
     */
    listPage({ where, params, limit, offset }) {
      return db
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM bookmark WHERE ${where}
           ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
        )
        .all(...params, limit, offset);
    },

    /**
     * @param {number[]} bookmarkIds
     * @returns {{ bookmark_id: number, name: string }[]}
     */
    listTagsForBookmarks(bookmarkIds) {
      if (bookmarkIds.length === 0) return [];
      const placeholders = bookmarkIds.map(() => '?').join(', ');
      return db
        .prepare(
          `SELECT bt.bookmark_id AS bookmark_id, t.name AS name
           FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id
           WHERE bt.bookmark_id IN (${placeholders})`
        )
        .all(...bookmarkIds);
    },

    /**
     * @param {number} id
     * @param {string} deletedAt ISO-8601 UTC
     * @returns {number} rows changed — 0 means the id did not exist or was
     *   already soft-deleted (F07-AC9, AC10)
     */
    softDelete(id, deletedAt) {
      return softDeleteStmt.run(deletedAt, id).changes;
    },

    /**
     * F07: clears `deleted_at`, after re-checking the live-uniqueness race
     * inside the same transaction (LD-03, F07-AC7).
     *
     * @param {number} id
     * @param {string} urlNormalized the row's own normalized URL
     * @returns {object} the restored row (no `deleted_at`, via `SELECT_COLUMNS`)
     * @throws {AppError} the restore-specific DUPLICATE_URL when another live
     *   row now holds the same normalized URL
     */
    restore(id, urlNormalized) {
      const run = db.transaction(() => {
        const collision = findLiveByNormalizedStmt.get(urlNormalized);
        if (collision) {
          throw restoreDuplicateUrlError(collision);
        }
        restoreStmt.run(id);
      });
      run();
      return selectByIdStmt.get(id);
    },
  };
}
