# Data Model

**Version:** 3
**Status:** approved (dev-1, 2026-10-01); amended by AMD-001 and AMD-002 (dev-1, 2026-10-01)

> Shared artifact. Change only through `/amend-architecture`. The ER diagram lives in `er-diagram.md` and must match this file.

## 1. Entities

### bookmark

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, `AUTOINCREMENT` | `AUTOINCREMENT` (not bare `ROWID`) so an id is never reused after a hard delete; R13 restore keeps the original id, so ids must be stable. |
| `url` | TEXT | `NOT NULL`, length 1–2048, `http`/`https` only | The URL exactly as the user typed it, after trimming. This is what is rendered and linked. Length cap serves EC04. |
| `url_normalized` | TEXT | `NOT NULL`, unique among live rows (§3, §4) | Derived key used **only** for the R10 duplicate check. Never displayed. Normalization rule in §4 INV-02. |
| `title` | TEXT | `NOT NULL`, length 1–300 | Plain text, never HTML (S3/EC07). 300 accommodates a fetched `<title>`; the add/edit form caps *user-typed* titles at 140 to match `docs/mockup.html` (U6). Both limits are deliberate — see INV-05. |
| `title_source` | TEXT | `NOT NULL`, `CHECK (title_source IN ('user','fetched','hostname'))` | Drives the R01/EC06 non-blocking notice: `hostname` means the fetch failed or was refused and the hostname was substituted. Returned to the client in the create response so no second round trip is needed (AD-03). |
| `created_at` | TEXT | `NOT NULL`, ISO-8601 UTC (`YYYY-MM-DDTHH:MM:SS.sssZ`) | The R03 sort key. Set once at insert and **never** modified, including on edit (AS02, AS03) and on R13 restore. |
| `updated_at` | TEXT | `NOT NULL`, ISO-8601 UTC | Maintained for diagnostics and EC21 conflict detection. Does **not** affect ordering. |
| `deleted_at` | TEXT NULL | `NULL` for a live row, ISO-8601 UTC for a soft-deleted row | AD-04 option B. Every read filters `deleted_at IS NULL`. R13 Undo sets it back to `NULL`. |

> TEXT ISO-8601 is used for timestamps rather than a numeric epoch because SQLite has no native date type and lexicographic ordering of this fixed-width UTC format is identical to chronological ordering — so the `created_at DESC` index in §3 sorts correctly with no conversion.

### tag

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, `AUTOINCREMENT` | |
| `name` | TEXT | `NOT NULL`, `UNIQUE`, length 1–24, lowercase, allowed characters: letters, digits, `-`, `_`, space | Stored already-normalized (trimmed, lowercased) per R02 and C03. The `UNIQUE` constraint is what makes EC14 (`Research` vs `research`) merge at the data level rather than only in application code. |
| `created_at` | TEXT | `NOT NULL`, ISO-8601 UTC | First time this tag name was used anywhere. |

> A `tag` row is created on demand the first time a name is used, and is **not** deleted when its last bookmark link goes away. EC17 ("tag disappears from the filter list") is satisfied by the tag-list *query*, which returns only tags having at least one live bookmark — not by deleting the row. This keeps R14 autocomplete stable and avoids a delete/restore race with R13: restoring a bookmark must not have to resurrect a tag row that was swept away while the undo toast was still on screen.

### bookmark_tag

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `bookmark_id` | INTEGER | `NOT NULL`, FK → `bookmark(id)` `ON DELETE CASCADE` | |
| `tag_id` | INTEGER | `NOT NULL`, FK → `tag(id)` `ON DELETE CASCADE` | |

Composite primary key `(bookmark_id, tag_id)`. The PK is itself what enforces EC14's "duplicates within one bookmark are merged" at the data level: the same tag cannot be linked twice.

> Soft delete (AD-04) means the cascade almost never fires — links survive a soft delete so that R13 Undo restores the bookmark **with its tags intact**. The cascade exists for a genuine hard delete (test-data teardown, the NFR-01 seeding reset).

### setting

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `key` | TEXT | PK, `CHECK (key IN ('theme'))` | AD-05. The `CHECK` is a deliberate allow-list so this table cannot become an open key-value write surface reachable from the API (S1). Adding a key is a schema change, which means an AMD. |
| `value` | TEXT | `NOT NULL`, for `theme`: `CHECK` restricted to `'light'`/`'dark'` at the service boundary | R12, EC26. |
| `updated_at` | TEXT | `NOT NULL`, ISO-8601 UTC | |

## 2. Relationships

| From | To | Cardinality | Enforced by |
|---|---|---|---|
| `bookmark` | `bookmark_tag` | 1 : 0..8 | FK + `ON DELETE CASCADE`; the upper bound of 8 (R02, C03) is enforced in the tag service, not by the schema — SQLite cannot express a per-parent row-count limit declaratively. Stated here so `/review-phase` checks the service, not the DDL. |
| `tag` | `bookmark_tag` | 1 : 0..N | FK + `ON DELETE CASCADE` |
| `bookmark` | `tag` | many-to-many, through `bookmark_tag` | Composite PK prevents duplicate links |
| `setting` | — | standalone | No relationship. Deliberately not joined to anything (single-user app, AS01). |

## 3. Indexes and Query Approach

| Index | Supports (feature / NFR) |
|---|---|
| `CREATE UNIQUE INDEX ux_bookmark_url_live ON bookmark(url_normalized) WHERE deleted_at IS NULL` | R10, EC05, EC16 — the duplicate rule enforced at data level (S-defence-in-depth). The **partial** `WHERE` is load-bearing: without it a soft-deleted bookmark would permanently block re-adding the same URL, which would make R07+R01 together produce a dead URL. Uniqueness therefore holds over *live* rows only. |
| `CREATE INDEX ix_bookmark_list ON bookmark(deleted_at, created_at DESC, id DESC)` | R03 (newest first), R15 (`LIMIT`/`OFFSET`), NFR-01. `deleted_at` leads so the AD-04 predicate is satisfied by the index rather than by a post-filter. `id DESC` is the tie-breaker: without it, two bookmarks written in the same millisecond can swap places between two page requests, which would let one row appear on both page 1 and page 2, or on neither (EC22, EC23). |
| `CREATE INDEX ix_bookmark_tag_lookup ON bookmark_tag(tag_id, bookmark_id)` | R04 filter — `tag_id` leads because the query is always "which bookmarks carry this tag". Also serves the EC17 `NOT EXISTS` tag-list probe. |
| `CREATE UNIQUE INDEX ux_tag_name ON tag(name)` (from the `UNIQUE` constraint) | R14 autocomplete (`name LIKE ? || '%'` is a prefix match, so it **does** use this index), EC14 case-merge, EC25. |

**Query approach.**

- **List / search / filter (R03, R04, R05, R15)** — one WHERE-clause builder produces the predicate set, and it is used by **both** the `COUNT(*)` query and the page query (AD-07). They must never be built separately, or `total` will disagree with the rows returned. Predicates: always `deleted_at IS NULL`; optionally `EXISTS (SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.bookmark_id = bookmark.id AND t.name = ?)` for R04; optionally `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` for R05.
- **Search (R05, AD-06)** — a leading-wildcard `LIKE` cannot use an index, so this is a scan of the live rows. At the 1,000-record volume in NFR-01 that is the accepted design; RK05 requires it to be **measured**, not assumed. `ORDER BY` and `LIMIT/OFFSET` still use `ix_bookmark_list`.
- **`ORDER BY` and page size are never built from raw input.** `ORDER BY` is a fixed constant string. `size` is clamped to the `{10, 20, 50}` allow-list and `page` to `[1, max(1, ceil(total/size))]` (EC24, EC23, S1).
- **Every statement is a prepared statement with bound parameters** (S4). `%` and `_` in search text are escaped with a backslash before binding, and the statement carries `ESCAPE '\'` (S6, EC12).
- **Tag list for the filter sidebar (R04, EC17)** — `SELECT t.name, COUNT(*) FROM tag t JOIN bookmark_tag bt ON bt.tag_id = t.id JOIN bookmark b ON b.id = bt.bookmark_id WHERE b.deleted_at IS NULL GROUP BY t.id`. A tag with no live bookmarks is absent from the result, which is exactly EC17.

## 4. Data-Level Validation and Invariants

| ID | Invariant | Enforced by |
|---|---|---|
| INV-01 | `url` is non-empty, ≤ 2048 characters, and its scheme is `http` or `https`. Its hostname must be present and contain at least one dot; single-label names such as `localhost` and `intranet` are rejected at the boundary. | Service-layer validation at the API boundary (S1, R09, EC01–EC04, F01-EC1). Not expressible as a SQLite `CHECK` that could parse a URL, so it is a boundary rule — recorded here so `/review-phase` looks for it in the service, not the schema. |
| INV-02 | `url_normalized` is derived deterministically: lowercase the scheme and host, apply IDNA/punycode to the host (EC20), drop a default port (`:80` for http, `:443` for https), drop the fragment, drop one trailing `/` from the path, whether or not the path is otherwise empty (so `/a/` and `/a` are the same resource, and `example.com/` and `example.com` are too), and preserve path case and the query string. | Service layer computes it; `ux_bookmark_url_live` enforces the resulting uniqueness. Path case is preserved deliberately — `example.com/A` and `example.com/a` are different resources on most servers, so folding them would merge two legitimately distinct bookmarks. Only the last slash is dropped and only once, so `/a//` normalizes to `/a/` — a deeper collapse would merge paths that a server may legitimately treat as distinct (F01-AC12, AMD-002). |
| INV-03 | No two **live** bookmarks share a `url_normalized`. Soft-deleted rows are exempt. | `ux_bookmark_url_live` (partial unique index). R10, EC05. |
| INV-04 | On edit, the record being edited is excluded from its own duplicate check. | Service passes the row's own `id` into the lookup as `AND id <> ?`. EC16. |
| INV-05 | `title` is 1–300 characters of plain text. A *user-supplied* title is additionally capped at 140 at the form and at the API boundary. | `CHECK` on length at the data level; the 140 cap is a boundary rule matching the mockup's `maxlength="140"` (U6). The two limits differ on purpose: a fetched `<title>` is truncated to 300 per the security skill, and refusing to store it would turn a successful fetch into a spurious failure. |
| INV-06 | `title` is never empty. If no user title is given and the fetch does not yield one, the hostname is used and `title_source = 'hostname'`. The hostname is used with a leading `www.` removed (C-F01-04), and a fetch that returns an empty or whitespace-only `<title>` counts as not yielding one (F01-EC3). | Service layer. R01, EC06, EC09, F01-EC3. |
| INV-07 | Every `tag.name` is trimmed, lowercase, 1–24 characters, and unique across the table. | `UNIQUE` + `CHECK(length(name) BETWEEN 1 AND 24)`; the character allow-list is a boundary rule. R02, C03, EC14, EC15. |
| INV-08 | A bookmark carries at most 8 distinct tags. | Service layer (see §2). C03. |
| INV-09 | A live bookmark's tag links survive a soft delete and are restored unchanged by Undo. | No cascade fires on soft delete — `deleted_at` is an `UPDATE`, not a `DELETE`. R13. |
| INV-10 | `created_at` never changes after insert, including on edit and on restore. | Service layer never writes `created_at` on an `UPDATE`. AS02, AS03, R06, R13. |
| INV-11 | `setting.key` is restricted to the allow-list. | `CHECK (key IN ('theme'))`. AD-05, S1. |
| INV-12 | Foreign keys are enforced. | `PRAGMA foreign_keys = ON` **must be executed on every connection** — SQLite defaults it to OFF, and a missed pragma silently disables every FK in this model. Set at connection open, and asserted by a test. |

## 5. Persistence and Restart Survival

- **Storage medium and location:** a single SQLite file at `app/api/data/tagvault.db`, matching `component-map.json` → `api.dataStore.location`. Embedded and read in-process by `better-sqlite3` 13.0.3 — no database server and no container (A1, A5). The `data/` folder is created on startup if absent. The `.db`, `.db-wal` and `.db-shm` files are git-ignored: they hold user data, and D1 forbids committing anything but synthetic data.
- **Write durability:** `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` at startup. Every multi-statement write — creating a bookmark together with its tag links, editing a bookmark and replacing its links, restoring a soft-deleted bookmark — runs inside **one** `better-sqlite3` transaction. A crash mid-transaction rolls back completely, so EC19 ("restarted mid-write") cannot leave a bookmark with half its tags. This is what NFR-02's "no partial writes" check exercises.
- **Schema creation and migration on startup:** the server executes an idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` script on boot, inside a transaction, before the HTTP listener starts. A `user_version` pragma records the schema version (1). No migration framework is added: there is exactly one schema version and the project ends before a second one is plausible (P4). Should a later AMD change the schema, the migration approach becomes part of that AMD.
- **Backup / recovery:** no automatic backup. The recovery procedure is to copy `tagvault.db` while the app is stopped — an operation the file-based design makes trivial. Stated explicitly so the absence of a backup feature is a recorded decision rather than an oversight. This is acceptable under AS01 (single user, single machine) and is not a requirement in R01–R15.
- **What survives a restart:** all bookmarks, tags, links, and the theme preference (AD-05). What does not: the R13 undo buffer — a soft-deleted bookmark stays soft-deleted across a restart and is no longer reachable from the UI, because the toast that offered Undo is gone. This is a deliberate, documented limitation, not a defect; recovering it would need a trash screen, which is outside R07/R13.

## 6. Seed and Test Data

- Synthetic only (D1). Every URL is under `example.com`, `example.org` or `example.net`; every tag is a generic topic word; no personal data, no real hostnames.
- **NFR-01 seeding (1,000 records):** a script inserts 1,000 bookmarks as `https://example.com/article/{n}` with titles `Sample bookmark {n}`, distributed across ~20 tags with 0–8 tags each, `created_at` spread over a synthetic date range so the newest-first ordering and the pagination boundaries are genuinely exercised. Inserted in one transaction.
- **Functional fixtures:** a handful of records covering the edge cases that need specific shapes — a bookmark whose `title_source` is `hostname` (EC06), two URLs differing only by case/trailing slash/fragment (EC05), a title containing `<script>alert(1)</script>` as literal text (EC07), a tag used by exactly one bookmark (EC17), and titles containing `%` and `_` (EC12).
- Seed data is never written to `tagvault.db` automatically on startup. An empty database is the correct first-run state, because EC10's empty state is a requirement that must be reachable.

## 7. Change Log

| Version | Date | Change | Why | AMD |
|---|---|---|---|---|
| 1 | 2026-09-30 | Initial data model: `bookmark`, `tag`, `bookmark_tag`, `setting`; partial unique index on live `url_normalized`; WAL + per-write transaction | `/architecture` CREATE mode, decisions AD-02 (join table), AD-04 (soft delete), AD-05 (settings table), AD-06 (`LIKE`), AD-07 (`COUNT(*)`) | — |
| 2 | 2026-10-01 | INV-01 now requires the hostname to contain a dot; INV-06 now specifies the leading-`www.` strip and counts an empty or whitespace-only `<title>` as no title. **No schema object changed** — both are boundary rules, so `user_version` stays 1 and no migration is required | Resolves the `docs/mockup.html` vs `hld.md` disagreements raised by F01; the stricter rule invalidates no existing row | AMD-001 |
| 3 | 2026-10-01 | INV-02 now drops one trailing `/` from **any** path, not only an empty one, and states that the collapse happens once so `/a//` becomes `/a/`. Path case is still preserved — that half is unchanged. **No schema object changed**; `user_version` stays 1 and no migration is required | F01-AC12 requires `https://example.com/a/` and `https://example.com/a` to be the same bookmark, which the previous wording made impossible. dev-1 ruled for the broad reading at the F01 Build gate and the shipped `normalizeUrl` already implements it, so this is the invariant catching up to an approved decision rather than a behavior change. No stored row is invalidated | AMD-002 |
