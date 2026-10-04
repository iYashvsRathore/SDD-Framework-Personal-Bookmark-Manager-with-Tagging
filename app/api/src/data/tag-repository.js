/**
 * `tag` table + `bookmark_tag` links (data-model.md "tag"/"bookmark_tag").
 */
export function createTagRepository(db) {
  const findByNameStmt = db.prepare('SELECT id FROM tag WHERE name = ?');
  const insertStmt = db.prepare('INSERT INTO tag (name, created_at) VALUES (?, ?)');
  const findByPrefixStmt = db.prepare(
    `SELECT name FROM tag WHERE name LIKE ? ESCAPE '\\' ORDER BY name ASC LIMIT ?`
  );
  const linkStmt = db.prepare(
    'INSERT OR IGNORE INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)'
  );
  const listWithLiveBookmarksStmt = db.prepare(
    `SELECT t.name AS name, COUNT(*) AS count
     FROM tag t
     JOIN bookmark_tag bt ON bt.tag_id = t.id
     JOIN bookmark b ON b.id = bt.bookmark_id
     WHERE b.deleted_at IS NULL
     GROUP BY t.id
     ORDER BY t.name ASC`
  );

  return {
    /**
     * Creates the tag row if it does not already exist (EC14's data-level half).
     *
     * @param {string} name already-normalized (trimmed, lowercased)
     * @param {string} createdAt ISO-8601 UTC, used only on first creation
     * @returns {number} the tag's id, new or existing
     */
    upsertAndGetId(name, createdAt) {
      const existing = findByNameStmt.get(name);
      if (existing) return existing.id;
      const info = insertStmt.run(name, createdAt);
      return Number(info.lastInsertRowid);
    },

    /**
     * @param {string} escapedPrefix already lowercased and LIKE-escaped (S6)
     * @param {number} limit
     * @returns {string[]} matching names, alphabetical
     */
    findByPrefix(escapedPrefix, limit) {
      return findByPrefixStmt.all(`${escapedPrefix}%`, limit).map((r) => r.name);
    },

    /**
     * Links a tag to a bookmark. A duplicate pair is silently a no-op — the
     * composite PK already prevents a second row (data-model.md section 1).
     *
     * @param {number} bookmarkId
     * @param {number} tagId
     */
    link(bookmarkId, tagId) {
      linkStmt.run(bookmarkId, tagId);
    },

    /**
     * The tag sidebar list (R04, EC17, data-model.md section 3) — a tag with
     * no live bookmarks is simply absent, never deleted.
     *
     * @returns {{ name: string, count: number }[]} alphabetical
     */
    listWithLiveBookmarks() {
      return listWithLiveBookmarksStmt.all();
    },
  };
}
