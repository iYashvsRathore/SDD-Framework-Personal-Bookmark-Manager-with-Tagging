/**
 * Idempotent schema bootstrap (data-model.md section 5). Runs inside the
 * connection that `db.js` opens, before the HTTP listener starts.
 */

export const SCHEMA_VERSION = 1;

const CREATE_BOOKMARK_TABLE = `
  CREATE TABLE IF NOT EXISTS bookmark (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL CHECK (length(url) BETWEEN 1 AND 2048),
    url_normalized TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
    title_source TEXT NOT NULL CHECK (title_source IN ('user', 'fetched', 'hostname')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL
  )
`;

const CREATE_TAG_TABLE = `
  CREATE TABLE IF NOT EXISTS tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 24),
    created_at TEXT NOT NULL
  )
`;

const CREATE_BOOKMARK_TAG_TABLE = `
  CREATE TABLE IF NOT EXISTS bookmark_tag (
    bookmark_id INTEGER NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
  )
`;

const CREATE_SETTING_TABLE = `
  CREATE TABLE IF NOT EXISTS setting (
    key TEXT PRIMARY KEY CHECK (key IN ('theme')),
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_UX_BOOKMARK_URL_LIVE =
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_bookmark_url_live ON bookmark(url_normalized) WHERE deleted_at IS NULL';

const CREATE_IX_BOOKMARK_LIST =
  'CREATE INDEX IF NOT EXISTS ix_bookmark_list ON bookmark(deleted_at, created_at DESC, id DESC)';

const CREATE_IX_BOOKMARK_TAG_LOOKUP =
  'CREATE INDEX IF NOT EXISTS ix_bookmark_tag_lookup ON bookmark_tag(tag_id, bookmark_id)';

const CREATE_UX_TAG_NAME = 'CREATE UNIQUE INDEX IF NOT EXISTS ux_tag_name ON tag(name)';

/**
 * @param {import('better-sqlite3').Database} db an already-open connection
 *   with `foreign_keys` already turned ON (db.js's responsibility, INV-12)
 */
export function bootstrapSchema(db) {
  const run = db.transaction(() => {
    db.exec(CREATE_BOOKMARK_TABLE);
    db.exec(CREATE_TAG_TABLE);
    db.exec(CREATE_BOOKMARK_TAG_TABLE);
    db.exec(CREATE_SETTING_TABLE);
    db.exec(CREATE_UX_BOOKMARK_URL_LIVE);
    db.exec(CREATE_IX_BOOKMARK_LIST);
    db.exec(CREATE_IX_BOOKMARK_TAG_LOOKUP);
    db.exec(CREATE_UX_TAG_NAME);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  });
  run();
}
