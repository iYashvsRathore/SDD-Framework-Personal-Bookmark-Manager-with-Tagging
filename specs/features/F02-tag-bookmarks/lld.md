# F02: Tag Bookmarks (Low-Level Design)

**Feature ID:** F02-tag-bookmarks
**Status:** approved — design gate approved 2026-10-01
**Spec version:** 1, approved 2026-10-01
**HLD version:** 2
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F02 code exists yet. Every "the code will…" statement here is an instruction to `/build-feature`; nothing is claimed as verified behavior.

## 1. Design Overview

F02 adds tags to the bookmark the user is saving. The `tag` and `bookmark_tag` tables, their four indexes, and the `bookmark.tags` field already returned by F03's list query are all already in place from F01/F03 — this feature writes to that schema for the first time rather than extending it.

Three additions carry the work. A new `api/src/services/tag-service.js` owns the normalize/validate/dedupe/cap rules (shared with F06, per `spec.md` §5) and the prefix-suggestion query. `api/src/data/bookmark-repository.js`'s existing one-transaction insert is extended to also upsert and link tags, so a bookmark and its tags are written or rolled back together (NFR-02, EC19) exactly as `data-model.md` §5 already requires. `GET /api/tags` gains a `prefix` branch for autocomplete, reusing the same route the F04 sidebar already calls.

On `web`, a new `TagInput` component fills the tag row `docs/mockup.html` has and F01 deliberately left out (F01 C-F01-05). It injects `BookmarksStore` directly, the same pattern `BookmarkForm` and `BookmarkList` already use, so no new state-sharing mechanism is introduced.

The client is deliberately lenient (silent truncate/cap/dedupe, per the mockup) while the API is deliberately strict (reject-whole on the same conditions, per C-F02-01). `tag-service.normalizeAndValidate()` is the one place that asymmetry is implemented, and F02-AC6/AC8/AC9 test it directly over HTTP, independent of the client (F02-RK1).

## 2. Alternatives Considered

All four decisions were presented to dev-1 as option tables on 2026-10-01 and answered "Accept Recommendation." The three stated gaps (malformed `tags` shape, ASCII-only charset, and the LD-03 shared-route confirmation) were answered the same way.

### LD-01 Where tag normalize/validate/suggest logic lives

| Option | Pros | Cons |
|---|---|---|
| **A: a dedicated `services/tag-service.js`** — `normalizeAndValidate(rawTags)` (split/trim/lowercase/dedupe/cap/charset, reject-whole) and `suggest(prefixRaw)` | Mirrors the `validate-url.js` / `url-normalize.js` precedent (HLD §6.3); one place F06 reuses, matching `spec.md` §5's statement that F02 builds the shared service; keeps `bookmark-service.js` focused; this is the layer Q4 is measured on | One more file |
| B: inline in `bookmark-service.js` | Fewer files | F06 must duplicate the rules; violates P6; contradicts `spec.md` §5's stated division of ownership |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** one more service file, in exchange for F06 reusing the exact same rules rather than re-deriving them.

### LD-02 Writing the bookmark and its tag links atomically

| Option | Pros | Cons |
|---|---|---|
| **A: extend `bookmark-repository.insert(row, tagNames)`** — the same `better-sqlite3` transaction now also upserts each tag and links it, before returning the saved row with `tags` attached | `data-model.md` §5 already states "bookmark plus its tag links" is one transaction; a crash mid-write cannot leave a bookmark with half its tags (EC19); no new table, no new orchestration layer; the repository already owns the transaction boundary (HLD §5) | `bookmark-repository.js` now also calls into `tag-repository.js`'s prepared statements, so it depends on a second repository |
| B: a separate `data/transactions.js` orchestrator that calls both repositories | Keeps "one repository per entity" | A fourth data-layer file for one call site — more indirection than P4 asks for |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** `bookmark-repository.js` takes a `tagRepository` dependency. Both repositories still issue only prepared statements (S4); the transaction boundary does not move.

### LD-03 `GET /api/tags` serves two shapes from one route

`spec.md` §2 fixes `GET /api/tags?prefix=` as returning a bare, alphabetical, ≤10 string array (F02-AC11–AC13). The already-shipped route (F01/F03) returns `[{ id, name, bookmark_count }]` for the F04 sidebar, unconditionally.

| Option | Pros | Cons |
|---|---|---|
| **A: one route, branch on whether `prefix` is present** — present (including `''`) → `tagService.suggest(prefix)` (string array); absent → the unchanged F04-shape query | No conflict with the already-approved F02-AC11–13, which name this exact route; the F04 sidebar shape is untouched and still undecided by F02 | One `if` in the route handler |
| B: a new route, e.g. `GET /api/tags/suggest?prefix=` | Cleaner separation of the two shapes | Contradicts the approved spec, which names `GET /api/tags?prefix=` explicitly — changing it would need a `/clarify` spec revision, not a free design choice |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** one route answers two shapes depending on a query parameter's presence; documented here and in §4 so `/review-phase` does not read it as an inconsistency.

### LD-04 The tag-chip input component

| Option | Pros | Cons |
|---|---|---|
| **A: `TagInput` injects `BookmarksStore` directly** — same pattern as `BookmarkForm` and `BookmarkList`; renders chips from `store.tags()`, calls `store.addTagChip()` / `removeTagChip()` / `removeLastTagChip()`, debounces its own calls to `store.loadTagSuggestions(prefix)` | Matches the codebase's one established state pattern exactly; trivially reusable by F06 — same store, same component, mounted into the edit dialog later with no new wiring | Component is coupled to the global store rather than being a fully generic, store-free control |
| B: a generic component with a two-way `model<string[]>()` binding, no store coupling | More "reusable" in the abstract | Every other feature component already injects the store directly; this would be the only exception, adding a second pattern for no requirement that asks for it (P4) |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** `TagInput` cannot be dropped into an app that does not have `BookmarksStore` — acceptable, since nothing in this project ever will.

### Three confirmed gaps

| Gap | Resolution |
|---|---|
| A malformed `tags` field (not an array, or an element that is not a string) reaches the API directly | `INVALID_TAG` 400, `field: 'tags'`, message `Tags must be a list of text values.` No row written — consistent with C-F02-01's reject-whole stance (dev-1, 2026-10-01, "Accept Recommendation"). |
| Character allow-list charset | ASCII only: `a-z0-9`, space, `-`, `_`, matched after lowercasing. Every F02-AC9 fixture is ASCII; D1 is synthetic-data-only (dev-1, 2026-10-01, "Accept Recommendation"). |
| LD-03's same-route branch, confirmed even though F04's exact sidebar shape is not yet designed | Confirmed (dev-1, 2026-10-01). F02 only fixes the `prefix`-present branch; the `prefix`-absent branch's existing query and shape are untouched and remain F04's to finish designing. |

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web`.

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/lib/like-escape.js` (new) | `escapeLikePattern(value)` — escapes `\`, `%` and `_` with a leading `\` before a value is bound into a `LIKE ... ESCAPE '\'` pattern (S6). Used by the tag-prefix query; `data-model.md` §3 already reserves this exact convention for F05's future search, so this is the shared home for it, not a tag-only helper |
| `api` | `app/api` | `src/services/tag-service.js` (new) | `createTagService({ tagRepository })` → `{ normalizeAndValidate(rawTags), suggest(prefixRaw) }` (LD-01). Pure validation logic plus the one query delegation |
| `api` | `app/api` | `src/data/tag-repository.js` (changed) | Adds `upsertAndGetId(name, createdAt)` and `findByPrefix(prefixNormalized, limit)`. `listWithLiveBookmarks()` (F01/F03) is unchanged |
| `api` | `app/api` | `src/data/bookmark-repository.js` (changed) | `insert(row, tagNames)` — the existing transaction now also upserts and links each tag, then returns the saved row with `tags: tagNames` attached (LD-02). Takes `tagRepository` as a constructor dependency |
| `api` | `app/api` | `src/services/bookmark-service.js` (changed) | `create()` validates `payload.tags` via `tagService.normalizeAndValidate()` before the duplicate lookup; the saved bookmark's `tags` field comes back from the repository. Takes `tagService` as a constructor dependency. `list()` is unchanged — F03 already attaches `tags` to every item |
| `api` | `app/api` | `src/routes/tags.js` (changed) | Branches on `req.query.prefix` (LD-03): present → `tagService.suggest(prefix)`; absent → the unchanged `tagRepository.listWithLiveBookmarks()` |
| `api` | `app/api` | `src/app.js` (changed) | Wiring only: construct `tagRepository` before `bookmarkRepository` (now a dependency), construct `tagService`, pass both into the bookmark service and the tags router |
| `web` | `app/web` | `src/app/core/models.ts` (changed) | `CreateBookmarkRequest.tags?: readonly string[]`; `Bookmark.tags` / `BookmarkListItem` already carry `tags` from F03 — unchanged |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | `suggestTags(prefix: string): Promise<string[]>` → `GET /api/tags?prefix=` |
| `web` | `app/web` | `src/app/core/tag-chip.ts` (new) | `normalizeChipValue(raw)` (trim/lowercase/slice 24, mirrors `docs/mockup.html`'s `addTag()`) and `splitCommaSeparated(raw)` — pure, unit-testable, ported verbatim from the mockup |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (changed) | `tags`, `tagSuggestions`, `tagsError` signals; `addTagChip()`, `addTagsFromText()`, `removeTagChip()`, `removeLastTagChip()`, `loadTagSuggestions(prefix)`; `save()`'s payload and failure-mapping both extended; `reset()`/`clearMessages()` extended |
| `web` | `app/web` | `src/app/features/tag-input/tag-input.{ts,html}` (new) | The chip UI: labelled input, Enter/comma commit, Backspace-removes-last, per-chip remove button, `<datalist>` suggestions, debounced suggestion fetch (F02-AC10) |
| `web` | `app/web` | `src/app/features/bookmark-form/bookmark-form.html` (changed) | Mounts `<app-tag-input>` between *Title* and the Cancel/Save row, filling the gap F01 left (C-F01-05) |
| `web` | `app/web` | `src/app/features/bookmark-form/bookmark-form.ts` (changed) | `onSubmit()` now includes `tags` (from `store.tags()`) in the emitted payload when non-empty |
| `web` | `app/web` | `src/styles.css` (changed) | Ports `.ci` (the chip-input container) and `.chip button` (the remove control) from `docs/mockup.html` — F01 deliberately left these un-ported because nothing rendered them yet |

No file outside these paths is touched. No entity, field, index or invariant is added to `data-model.md`.

## 4. API / Interface Contract

Error bodies use the shape fixed in HLD §8: `{ "error": { "code", "message", "field?" } }`.

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `POST` | `/api/bookmarks` | `{ url, title?, tags?: string[] }` — `tags` is new; everything else is F01's unchanged contract | `201 { bookmark: { …F01 fields…, tags: string[] } }` — `tags` lowercased, deduped, alphabetical (F02-AC1) | *(in addition to F01's `INVALID_URL`/`DUPLICATE_URL`/`STORAGE_ERROR`)* `400 { error: { code: 'INVALID_TAG', message, field: 'tags' } }` — one of the four §7 messages. **No row is written** for any of these (C-F02-01) |
| `GET` | `/api/tags?prefix=` | `prefix` present (any string, including `''`) | `200 string[]` — ≤10 names, alphabetical, matched case-insensitively against the stored lowercase names (F02-AC11, AC13). `[]` when no tag matches, including when no tag exists at all (F02-AC12, EC25) | `500 STORAGE_ERROR` |
| `GET` | `/api/tags` | `prefix` absent | `200 [{ id, name, bookmark_count }]` — unchanged F01/F03 query | `500 STORAGE_ERROR` |
| function | `tagService.normalizeAndValidate(rawTags)` → `{ ok: true, tags: string[] } \| { ok: false, message: string }` | `payload.tags`, any shape, including `undefined` | `undefined` → `{ ok: true, tags: [] }` (C-F02-05, tags are optional). An array of valid strings → the final deduped, capped, alphabetical list | Never throws. Rejects the **whole** array on the first shape/length/charset failure, or on a post-dedupe count over 8 |
| function | `tagService.suggest(prefixRaw)` → `string[]` | any string, or a non-string (coerced to `''`) | ≤10 matching names, alphabetical | Never throws |

Every F02 acceptance criterion is reachable from this table: AC1 via `POST` 201; AC2–AC5, AC7 via the client-side silent rules in §6 plus the same `POST` 201 contract; AC6, AC8, AC9 via `POST` 400 `INVALID_TAG`; AC10 via §6; AC11–AC13 via `GET /api/tags?prefix=`.

## 5. Data Access

**Tables/entities used** — all already defined in `data-model.md` v3. No entity, field, index or invariant is added, changed or removed.

| Entity | F02 use |
|---|---|
| `tag` | Read (prefix match) and write (upsert on demand) — F02 is the first feature to write a `tag` row |
| `bookmark_tag` | Write (link rows) — F02 is the first feature to write this table |
| `bookmark` | Unchanged: F02 adds no new column use beyond what F01/F03 already read and write |

**Indexes used:** `ux_tag_name` (the upsert's implicit uniqueness check and the prefix match itself, since `name LIKE ? || '%'` can use a unique index), `ix_bookmark_tag_lookup` (created by the F01 bootstrap, exercised for the first time by the link inserts).

**Queries** — all prepared statements with bound parameters (S4).

| Function | Statement (described) |
|---|---|
| `tagRepository.upsertAndGetId(name, createdAt)` | `INSERT INTO tag (name, created_at) VALUES (?, ?) ON CONFLICT(name) DO NOTHING`, then `SELECT id FROM tag WHERE name = ?` — idempotent, so re-using an existing tag name never errors (EC14 merges at the data level via `ux_tag_name`, exactly as `data-model.md` already documents) |
| `tagRepository.link(bookmarkId, tagId)` | `INSERT OR IGNORE INTO bookmark_tag (bookmark_id, tag_id) VALUES (?, ?)` — `OR IGNORE` is defence-in-depth against a duplicate pair; the composite PK already guarantees it can never happen twice for one bookmark |
| `tagRepository.findByPrefix(prefixNormalized, limit)` | `SELECT name FROM tag WHERE name LIKE ? ESCAPE '\' ORDER BY name ASC LIMIT ?` — bound as `prefixNormalized + '%'` after `escapeLikePattern()` has run on it (S6); `prefixNormalized` is already lowercased by the caller |
| `bookmarkRepository.insert(row, tagNames)` | Unchanged `INSERT INTO bookmark (...)` (F01), now followed — **inside the same transaction** — by one `upsertAndGetId` + one `link` call per name in `tagNames`, then the existing `findLiveById` re-select. The row returned to the service has `tags: tagNames` attached directly, since `tagNames` is already the exact final, deduped, alphabetical list that was written — no second read of `bookmark_tag` is needed to answer `POST`'s own response |

**Transaction boundary (LD-02, NFR-02, EC19):** unchanged from F01 — one `better-sqlite3` transaction per `insert()` call. A failure partway through tag linking rolls back the bookmark row too, so a crash mid-write cannot leave a bookmark with some but not all of its tags.

## 6. UI Changes and States

Ported from `docs/mockup.html`'s `#tg`/`#ci`/`#tl` tag row and `addTag()` function (U6) — the row F01 (C-F01-05) deliberately left out of the dialog.

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Tag chip input** (`TagInput`, mounted inside `BookmarkForm`) | n/a — chip commit and the silent truncate/cap/dedupe rules are synchronous, client-side, and instantaneous | The chip list is simply absent when `store.tags()` is empty; no placeholder chip | `tagsError` region (`aria-live="polite"`) shows the one message a direct-API `INVALID_TAG` could produce on `save()` — unreachable through the UI itself, since the client enforces the same caps first, but present so a future bypass is never silent | A committed chip appears in the `.ci` row immediately on Enter/comma/blur-equivalent | `<label for="tg">Tags <span class="opt">(press Enter or comma)</span></label>`; `Tab` reaches the input in visual order; `Enter`/`,` commits (AC10); `Backspace` on an empty input removes the most recent chip and keeps focus in the input (AC10); every chip's remove button carries `aria-label="Remove tag <name>"` (AC10) |
| **Tag suggestions** (`<datalist>`) | n/a — the fetch is a native, synchronous-feeling datalist lookup with no spinner, matching the mockup | `GET /api/tags?prefix=` returning `[]` renders no options and no error (AC12, EC25) | Not applicable — a failed suggestion fetch degrades to an empty suggestion list (§8), never a visible error, since suggestions are a convenience, not a requirement | Choosing an option commits it as a chip through the same `addTagChip()` path as typing it (AC13) | The native `<datalist>` is reachable from the same labelled input; no separate focus stop |

**Where the existing dialog changes:** the tag row is inserted between *Title* and the Cancel/Save button row, matching the mockup's field order exactly. No other part of `BookmarkForm` (the URL field, the duplicate banner, the title-fetch notice) changes.

**Destructive actions (U4):** none in F02. Removing a chip is a reversible, in-progress edit to an unsaved form, not a destructive action on stored data.

### U6 deviations — declared, with reasons

None. The chip input, its Enter/comma commit, its silent truncation and cap, and the `<datalist>` suggestions are ported directly from `docs/mockup.html`'s `#tg`/`#ci`/`#tl` and `addTag()`; no wording or behavior is changed.

## 7. Validation Rules

All validation that counts happens in `api`, in `tag-service.js` (S1). The client echoes the cheap, silent rules (truncate, cap, dedupe) purely for immediate feedback — `tag-service.test.js` and `tags-route.test.js` assert the **API's** behavior directly, independent of whatever the client already filtered.

### 7.1 Server rules (reject-whole) and exact messages

Checked per element, in array order, stopping at the first failure; the count check runs once, after every element has passed and been deduped.

| # | Check | User message (`INVALID_TAG`, `field: 'tags'`) |
|---|---|---|
| 1 | `payload.tags`, if present, must be an `Array` of `string` elements | `Tags must be a list of text values.` |
| 2 | *(silent, not a rejection)* trim each element; drop one that is empty or whitespace-only (EC15) | — |
| 3 | lowercase the remainder | — |
| 4 | length 1–24 after trim/lowercase (F02-EC3) | `Tags can be up to 24 characters.` |
| 5 | allow-list: `a`–`z`, `0`–`9`, space, `-`, `_` | `Tags can only contain letters, numbers, spaces, hyphens and underscores.` |
| 6 | *(silent)* merge into a `Set` — a duplicate differing only by case collapses to one entry (EC14) | — |
| 7 | after the full array is processed: the `Set`'s size must be ≤ 8 | `You can add up to 8 tags.` |

The final, successful result is the `Set`'s members **sorted alphabetically** (AS-F02-01), which is exactly what `bookmark.tags` and `GET /api/tags?prefix=` both return.

### 7.2 Client rules (silent, no message — mirrors `docs/mockup.html`'s `addTag()`)

| Rule | Behavior |
|---|---|
| Normalize | `value.trim().toLowerCase().slice(0, 24)` — truncates rather than rejecting (F02-AC7) |
| Dedupe | `chips.includes(value)` — a second `Research`/`research` chip is silently not added (F02-AC2) |
| Cap | `chips.length < 8` — a 9th chip is silently not added; the input still clears (F02-AC5) |
| Empty | an empty or whitespace-only value is silently not added (F02-AC3) |
| Comma split | a pasted or typed comma-separated value is split and each part run through the same rules (F02-AC4, F02-EC1) |

**Why the client is lenient and the server is strict:** this is the deliberate asymmetry C-F02-01 fixes and F02-RK1 names as the risk a regression here would hide. The client never needs to *tell* the user "too many tags" because it never lets them type one; the server, reachable directly, must say so.

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `tags` is present but not an array, or contains a non-string element (bypasses the client entirely) | `tag-service.js` rule 1 | `400 INVALID_TAG` `field: 'tags'`. **No row written.** Unreachable through the UI; a direct-API case only |
| More than 8 distinct valid tags submitted (F02-AC6, EC2) | `tag-service.js` rule 7, after dedupe | `400 INVALID_TAG` `field: 'tags'`, `You can add up to 8 tags.` **No row written**, not even the first 8 |
| A tag over 24 characters submitted directly (F02-AC8, F02-EC3) | `tag-service.js` rule 4 | `400 INVALID_TAG` `field: 'tags'`, `Tags can be up to 24 characters.` **No row written.** A 24-character tag is accepted unchanged |
| A tag with a disallowed character submitted directly (F02-AC9) | `tag-service.js` rule 5 | `400 INVALID_TAG` `field: 'tags'`, `Tags can only contain letters, numbers, spaces, hyphens and underscores.` **No row written** |
| Empty or whitespace-only tag typed in the UI (F02-AC3, EC15) | `TagInput` / `BookmarksStore.addTagChip()` | Not an error. Silently not added; no chip, no message |
| Duplicate tag differing only by case (F02-AC2, EC14) | Client: `addTagChip()`'s `includes()` check. Server: the `Set` merge in rule 6, backstopped by `ux_tag_name` at the data level | Not an error. The chip list/the stored link shows the tag once |
| `GET /api/tags?prefix=` fails (database failure) | `tags.js` → the existing error middleware | `500 STORAGE_ERROR`, same safe message as every other 500. `TagInput` degrades to an empty suggestion list rather than showing an error — suggestions are a convenience (§6) |
| Database failure during the tag upsert/link step mid-transaction | `bookmark-repository.js` → error middleware | `500 STORAGE_ERROR`. The whole transaction rolls back: no bookmark row and no tag link survive a failure partway through (NFR-02, EC19) |

**One rule this table encodes, carried from F01:** no `INVALID_TAG` message exposes an internal identifier, a stack trace or a SQL fragment (U5); each says exactly what the limit is.

## 9. Security Considerations

One row per untrusted input F02 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `tags` array shape | Must be an `Array` of `string` before any element is processed; a non-array or non-string element rejects the whole request | **S1** |
| Tag text — length, charset, count | Trimmed, lowercased, 1–24 characters, ASCII allow-list (`a`-`z`, `0`-`9`, space, `-`, `_`), at most 8 distinct — enforced **server-side regardless of what the client already filtered**, because the API is reachable directly with `curl` (C-F02-01, F02-RK1) | **S1** |
| Tag text — storage | Bound parameter on both the `tag` upsert and the `bookmark_tag` link insert; never concatenated into SQL | **S4** |
| Tag text — rendering | Rendered through Angular interpolation only, including inside a chip's `aria-label="Remove tag <name>"` — no `[innerHTML]` anywhere a tag name could appear | **S3** |
| Tag-prefix query (`GET /api/tags?prefix=`) | The prefix is **data, never a pattern**: `%`, `_` and `\` are escaped with `\` before the value is bound, and the statement carries `ESCAPE '\'` — identical to the convention `data-model.md` §3 already reserves for F05's future search | **S6** |
| Tag-prefix query — case | Matched case-insensitively by lowercasing the prefix before escaping/binding, against already-lowercase stored names — no `LIKE` collation trick, no case-insensitive index needed | S1 |

**Not newly applicable in F02:** the URL and title trust-boundary rows are unchanged from F01; F02 adds no new outbound network call.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (TagInput + BookmarksStore)
  participant R as api routes
  participant S as bookmark-service + tag-service
  participant D as data (bookmark-repository + tag-repository)

  U->>W: Type a tag, press Enter/comma (or paste a comma list)
  W->>W: normalizeChipValue (trim/lowercase/slice 24), dedupe, cap at 8 - all silent (AC2-AC5, AC7)
  W->>W: chip appended to store.tags()

  U->>W: Activate "Save bookmark"
  W->>R: POST /api/bookmarks { url, title?, tags: store.tags() }
  R->>S: create(payload)
  S->>S: validateUrl, validateUserTitle (F01, unchanged)
  S->>S: tagService.normalizeAndValidate(payload.tags)
  alt invalid shape/length/charset/count (AC6, AC8, AC9)
    S-->>R: AppError INVALID_TAG field=tags
    R-->>W: 400 { error }
    W-->>U: tagsError region (unreachable via normal UI use)
  else valid
    S->>S: normalizeUrl, duplicate lookup (F01, unchanged)
    alt new
      S->>D: BEGIN; INSERT bookmark; upsert+link each tag; COMMIT (EC19)
      D-->>S: saved row + tags: [...]
      S-->>R: { bookmark }
      R-->>W: 201 { bookmark }
      W-->>U: Dialog closes; toast (F01, unchanged)
    end
  end

  U->>W: Focus the tag input (AC12) / type a prefix (AC11, AC13)
  W->>R: GET /api/tags?prefix=<value> (debounced 250ms)
  R->>S: tagService.suggest(prefix)
  S->>D: findByPrefix(escape(lowercase(prefix)), 10)
  D-->>S: up to 10 names, alphabetical
  S-->>R: string[]
  R-->>W: 200 [...]
  W-->>U: <datalist> options; choosing one commits it as a chip (AC13)
```

## 11. Test Hooks

- **`createTagService({ tagRepository })`** — `normalizeAndValidate` is pure and takes no I/O, so every row of §7.1's table is a plain unit test with no database. `suggest` is tested against a real `:memory:` `tagRepository`, the same pattern F01's `createDb({ file: ':memory:' })` already established.
- **`tagRepository.upsertAndGetId`** tested directly against a real `:memory:` schema: calling it twice with the same name returns the same id (EC14 merging at the data level, backed by `ux_tag_name`), proving the repository, not just the service, enforces it.
- **`escapeLikePattern`** exported and pure — a table test covers `%`, `_`, `\` and a combination, mirroring `address-range.js`'s exhaustive-table-test style.
- **An HTTP-level test (`tags-route.test.js`)**, following `list-route.test.js`'s established pattern (`createApp` on a random port, real `fetch`), drives F02-AC11–AC13 end to end, including the >10-tags cap and the case-insensitive match.
- **`tag-chip.ts`'s `normalizeChipValue`/`splitCommaSeparated`** are pure and unit-tested without rendering the component, the same way `relative-time.ts` and `url-display.ts` were tested in F03.
- **`TagInput`** is tested with `BookmarksStore` provided through Angular DI (the existing `BookmarkForm` pattern) — the keyboard contract (Enter, comma, Backspace, remove-button `aria-label`) is assertable without an HTTP call, since chip commit never reaches the network.
- **`BookmarksStore.save()`'s new `tagsError` branch** needs a stubbed `ApiService.createBookmark()` rejection carrying `field: 'tags'` — a case the UI cannot otherwise reach, so the test exists specifically to keep that branch from silently rotting.

## 12. Architecture Impact

**None.** `hld.md` v2, `data-model.md` v3 and `component-map.json` v1 already describe everything this feature needs: the `tag`/`bookmark_tag` tables, all four indexes, the `GET /api/tags` route, and `bookmark.tags` in the list response. No entity, field, index, route shape, or component path is added, changed or removed outside what §3 already lists.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; this LLD precedes every line of F02 code |
| P2 Human approval gates | pass | LD-01…LD-04 and the three stated gaps were each put to dev-1 as option tables and answered "Accept Recommendation" on 2026-10-01 |
| P3 Honesty over polish | pass | Nothing here is claimed as verified; every outcome is stated as what `/test-phase F02-tag-bookmarks` must observe |
| P4 Simplicity first | pass | No new table, no new transaction orchestrator (LD-02 option B rejected), no new route (LD-03 option B rejected), no store-decoupled component (LD-04 option B rejected) |
| P5 Incremental delivery | pass | `tasks.md` orders `api` before `web`; every task leaves the app buildable and runnable |
| P6 Single source of truth | pass | `tag-service.js` is written once and is the file F06 reuses (§2 LD-01); `escapeLikePattern` is written once for both F02 and F05's future search |
| P7 Measurable requirements | pass | §4 and §7 give every AC an observable outcome: an HTTP status plus error code and field, an exact string, or an exact array value |
| Q1 Every AC testable | pass | §11 names the seam for each; no AC is left as an untestable assertion |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (HLD §5); `tag-service.js` and `like-escape.js` both sit inside it |
| S1 Validation at the boundary | pass | §7.1 places every rule in `tag-service.js`; the client's §7.2 rules are a convenience only, asserted as unreachable-but-necessary in §9 |
| S3 Output escaping | pass | Tag text rendered by Angular interpolation only, including inside `aria-label`; no `[innerHTML]` |
| S4 Parameterized queries | pass | §5: every statement is prepared and bound; `ON CONFLICT(name) DO NOTHING` and `OR IGNORE` are fixed SQL, not built from input |
| S6 Search text is data, never a pattern | pass | §9: the tag-prefix value is escaped with `escapeLikePattern()` before binding, with an explicit `ESCAPE '\'` clause |
| A4 Component map | pass | Every file in §3 resolves under `api` (`app/api`) or `web` (`app/web`), both declared in `component-map.json` v1 |
| U1/U2 Keyboard and labels | pass | §6: `<label for="tg">`, Tab order, Enter/comma commit, Backspace-removes-last, every remove button's `aria-label` (F02-AC10) |
| U3 Empty/loading/error states | pass | §6: the empty suggestion list (AC12/EC25) and the (UI-unreachable but present) `tagsError` region are both covered |
| U5 Actionable errors | pass | Every `INVALID_TAG` message in §7.1 states the exact limit; none exposes an internal identifier |
| U6 Approved UX reference | pass | §6, §7.2: the chip input, its commit keys, its silent truncate/cap/dedupe, and the `<datalist>` suggestions are ported directly from `docs/mockup.html`; no deviation is claimed |
| D1 Synthetic data | pass | Every tag named in this document is a generic topic word |
| E1 Evidence | pass | This session's material interactions are logged per the `evidence-logging` skill |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, `tasks.md` written alongside | `/design-feature F02-tag-bookmarks` CREATE mode; LD-01…LD-04 and three stated gaps all answered "Accept Recommendation" by dev-1 in one round | design |
