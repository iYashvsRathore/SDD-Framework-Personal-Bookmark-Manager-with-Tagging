/**
 * The one `setting` row (data-model.md "setting" table, F08).
 */
export function createSettingRepository(db) {
  const getStmt = db.prepare('SELECT value FROM setting WHERE key = ?');
  const upsertStmt = db.prepare(
    `INSERT INTO setting (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );

  return {
    /**
     * @param {string} key
     * @returns {string | null} the stored value, or `null` if no row exists
     */
    get(key) {
      const row = getStmt.get(key);
      return row ? row.value : null;
    },

    /**
     * @param {string} key
     * @param {string} value
     * @param {string} updatedAt ISO-8601 UTC
     */
    upsert(key, value, updatedAt) {
      upsertStmt.run(key, value, updatedAt);
    },
  };
}
