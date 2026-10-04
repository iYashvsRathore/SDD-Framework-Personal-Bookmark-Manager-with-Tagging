# F03: List Bookmarks (Low-Level Design)

**Feature ID:** F03-list-bookmarks
**Status:** approved — LD-01…LD-04 accepted by dev-1 ("Accept Recommendation") 2026-10-01; design gate approved 2026-10-01
**Spec version:** 1, approved 2026-10-01
**HLD version:** 2
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F03 code exists yet. Every "the code will…" statement is an instruction to `/build-feature`; every expected outcome is checked for the first time in `/test-phase F03-list-bookmarks`.

## 1. Design Overview

F03 replaces F01's placeholder list (`listRecent()` / `countLive()` / the hardcoded `F01_LIST_LIMIT`) with the real, request-driven paging contract `hld.md` §6.2 and `data-model.md` §3 describe, and replaces the `web` shell's neutral main-region placeholder with the real bookmark list, its cards, and a new pagination control.

The work concentrates in one new `api` module (`lib/pagination.js`, the clamp helpers) and a small extension to the existing bookmark repository and service (`services/list-query.js` for the shared predicate builder AD-07 and AS-F03-01 require, `bookmark-service.list()`, and two new repository functions). Per AS-F03-01, the predicate builder is shaped now with only the `deleted_at IS NULL` predicate wired in; F04 and F05 add their own predicate to the same builder rather than writing a second one.

On the `web` side, F03 adds the card list, the count region, the three new states (loading/empty/error, success already existing as "cards"), and the pagination control (the declared `hld.md` §7 U6 addition). Tags render as static, non-interactive chips per C-F03-01 — they will be empty for every bookmark until F02 exists, which is the expected, EC5-covered state, not a defect.

**Out of scope, unchanged from `spec.md` §5:** search, tag-filter interactivity, edit/delete behavior, undo, theme. F03 renders Edit/Delete buttons with the correct accessible names and no handler at all — later features wire the behavior onto the same markup.

## 2. Alternatives Considered

All four decisions were presented to dev-1 with option tables on 2026-10-01 and answered "Accept Recommendation."

### LD-01 The shared predicate/count query builder (AD-07, AS-F03-01)

| Option | Pros | Cons |
|---|---|---|
| **A: `buildPredicate()` → `{ where, params }` (only `deleted_at IS NULL` wired in for F03); `countWhere(where, params)` and `listPage({ where, params, limit, offset })` both consume the *same* pair** | Exactly the "one predicate set feeds both queries" AD-07 requires — `total` can never disagree with the rows returned, which is the defect `data-model.md` §3 names this pattern to prevent. F04's tag predicate and F05's search predicate extend `buildPredicate()` without touching `countWhere` or `listPage` (AS-F03-01) | `where`/`params` are threaded through two repository functions that, in F03, only ever see one fixed value — a small amount of interface ahead of its first real variant |
| B: independent `countLive()` / `listPage()`, each hard-coding `deleted_at IS NULL` directly in its own SQL string | No unused generality right now | The exact anti-pattern AD-07 exists to rule out: two separately-maintained predicates can silently drift once F04/F05 each add a clause to only one of them, producing a `total` that disagrees with the rendered rows. AS-F03-01 explicitly commits to a single shared builder, which this option does not deliver |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** the `where`/`params` plumbing exists before it has a second value, in exchange for F04 and F05 never needing to touch `countWhere` or `listPage` to add their own predicate.
**Challenge applied:** *what breaks at 1,000 records?* Nothing — `countWhere` and `listPage` each prepare their statement per call rather than caching it, which is an accepted, declared cost (no NFR requires prepared-statement caching, and a `COUNT`/paged `SELECT` at 1,000 rows against an indexed predicate is cheap regardless). *On restart?* Read-only path, unaffected. *Keyboard-only?* Unaffected — this is a data-access decision.

### LD-02 Where "Added N days ago" is computed

| Option | Pros | Cons |
|---|---|---|
| **A: a pure client function `relativeTime(iso, now)` in `web/core`, porting the mockup's `ago()` bucket logic verbatim (C-F03-03)** | Matches `hld.md` §5's layering rule that services "must not format user-facing markup"; zero extra round trip; deterministic unit test via an injected `now` | The displayed text can go one bucket stale if a tab is left open across a day boundary — accepted, since the list already refetches on every page or page-size change and this is a single-user, single-machine app (AS01) |
| B: the server returns an already-formatted string in the list response | No client-side date math | Bakes an opinionated, locale-bound display string into a JSON API contract that otherwise returns raw `created_at`; contradicts the HLD's services/UI split, and would need re-computing anyway if the client's clock and the server's disagree |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** a small, documented staleness window in exchange for keeping formatting out of the API contract.
**Challenge applied:** *at 1,000 records?* Irrelevant — this runs once per rendered card, not over the full table. *On restart?* `created_at` never changes (INV-10), so the computed text is correct immediately after a restart. *Keyboard-only?* Unaffected — plain text, no interaction.

### LD-03 Pagination control shape

| Option | Pros | Cons |
|---|---|---|
| **A: a labelled page-size `<select>` (10/20/50) + Previous/Next buttons, disabled (not hidden) at the ends + "Page X of Y" as text** | A fixed, small number of controls regardless of `total` — no risk of an unbounded control list at 1,000 records / size 10 (100 pages); disabling rather than hiding keeps the tab order stable for F03-AC9; "Page X of Y" is exactly the text AC9 requires | No direct jump to a distant page — not requested by any AC; F03-AC6 is a **server** clamp behavior, not a UI affordance |
| B: a numbered page-button row with ellipsis truncation for large page counts | Direct jump to any page | New, untested-by-any-AC truncation logic; more interactive elements in RK04's keyboard walkthrough for a capability `spec.md` does not ask for (P4) |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** no deep-link-to-page-N control, in exchange for a control surface exactly sized to what F03-AC4/AC6/AC9 require.
**Challenge applied:** *at 1,000 records?* At size 10 this is 100 pages; option A's control count is still 3 (select, Previous, Next) regardless — this is precisely why A was chosen over B. *On restart?* N/A, client-only control. *Keyboard-only?* AC9 is written against exactly this shape — native `<select>`, native `<button>`s, current page as text.

### LD-04 Stale / out-of-order list response handling

| Option | Pros | Cons |
|---|---|---|
| **A: a monotonically increasing request token in the store; a response is applied only if its token is still the current one, otherwise discarded** | Works with the existing `Promise`-based `ApiService` (no shape change to F01's calling convention); guarantees a superseded response can never overwrite the screen with stale data; trivially unit-tested by resolving two fakes out of order | The superseded request still completes server-side — harmless, since `GET /api/bookmarks` has no side effect |
| B: switch `ApiService` to Observables and drive the store with `switchMap` for real HTTP-level cancellation | Actually aborts the outdated request at the transport level | Introduces a second calling convention into one store for one method, when F01's entire store is `async`/`await` today, for a benefit ("the browser doesn't finish downloading a discarded response") no AC asks for (P4) |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** an abandoned request still completes on the wire, in exchange for not introducing a second async style into the store.
**Challenge applied:** *what breaks at 1,000 records?* Nothing new — the risk this guards against (a slow page-1 response arriving after a fast page-2 response) is independent of table size. *On restart?* N/A, in-memory per page load. *Keyboard-only?* A user tabbing quickly through Next/Previous is exactly the scenario this prevents from flashing stale content.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web` (both `workspaceRoot: "."`).

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/lib/pagination.js` (new) | `PAGE_SIZES = [10, 20, 50]`, `DEFAULT_SIZE = 20`. Pure functions `clampSize(raw)`, `clampPage(raw, maxPage)`, `computeMaxPage(total, size)` — never throw, never a 400 (F03-AC5) |
| `api` | `app/api` | `src/services/list-query.js` (new) | `buildPredicate()` → `{ where, params }` (AD-07, AS-F03-01). F03 wires only `deleted_at IS NULL`; F04/F05 extend this same function |
| `api` | `app/api` | `src/data/bookmark-repository.js` (changed) | Adds `countWhere(where, params)`, `listPage({ where, params, limit, offset })`, `listTagsForBookmarks(ids)`. Removes `listRecent()`, `countLive()` and the `F01_LIST_LIMIT` constant — `spec.md` NFR-04 names this replacement explicitly |
| `api` | `app/api` | `src/services/bookmark-service.js` (changed) | `list({ page, size })` replaces `listRecent()`: builds the predicate, clamps size, counts, clamps page against the real total, pages, attaches each row's tags. The layer Q4 is measured on |
| `api` | `app/api` | `src/routes/bookmarks.js` (changed) | `GET /api/bookmarks` now reads `page`/`size` from the query string and passes them through to `service.list()` unchanged — the route still does no clamping itself (`hld.md` §5) |
| `api` | `app/api` | `test/*.test.js` (new/changed) | Vitest specs — see §11 |
| `web` | `app/web` | `src/app/core/models.ts` (changed) | `PAGE_SIZES`, `DEFAULT_PAGE_SIZE`, `BookmarkListItem` (`Bookmark` + `tags`), `ListBookmarksResponse` |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | `listBookmarks(page, size): Promise<ListBookmarksResponse>` |
| `web` | `app/web` | `src/app/core/relative-time.ts` (new) | `relativeTime(iso, now?)` — LD-02, ported verbatim from the mockup's `ago()` |
| `web` | `app/web` | `src/app/core/url-display.ts` (new) | `displayUrl(raw)` → `{ host, rest }`, host with a leading `www.` stripped, for the card's bold-host + path rendering (F03-AC8) |
| `web` | `app/web` | `src/app/core/icons.ts` (changed) | Adds `edit` and `trash` icon paths, ported from `docs/mockup.html` |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (changed) | Adds `items`, `total`, `page`, `size`, `listLoading`, `listError`, `countText`, `maxPage`; adds `loadList()`, `changePage()`, `changePageSize()`, `retryList()` with the LD-04 request-token guard. `save()` now calls `loadList()` on success instead of splicing into the now-removed `saved` signal (F01's `saved` signal and its two tests in `bookmarks.store.spec.ts` are updated to match) |
| `web` | `app/web` | `src/app/features/bookmark-list/bookmark-list.ts`, `bookmark-list.html` (new) | Cards, tag chips, Edit/Delete buttons (rendered, unwired), count region, loading/empty/error states, the pagination control. Injects `BookmarksStore` directly, matching `BookmarkForm`'s existing pattern |
| `web` | `app/web` | `src/styles.css` (changed) | Ports `.card`, `.chip`, `.list`, `.meta`, `.foot`, `.act`, `.url` from `docs/mockup.html`, plus new pagination-control styles (the declared `hld.md` §7 U6 addition) |
| `web` | `app/web` | `src/app/app.ts`, `src/app/app.html` (changed) | Replace the F01 neutral main-region placeholder with `<app-bookmark-list>`; wire its `addRequested` output to the existing `openDialog()` so the empty state's *Add bookmark* action opens F01's dialog |
| `web` | `app/web` | `src/app/state/bookmarks.store.spec.ts` (changed) | Updated for the removed `saved` signal and the new list state |

## 4. API / Interface Contract

Error bodies use the shape fixed in `hld.md` §8 (unchanged by F03).

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `GET` | `/api/bookmarks` | `page`, `size` query parameters — both optional, both accepted as raw strings, **never validated as 400** | `200 { items: BookmarkListItem[], total: number, page: number, size: number }` — `items` newest-`created_at`-first, `id DESC` tie-break, each item's `tags: string[]` | `500 { error: { code: 'STORAGE_ERROR', … } }` — database failure only. **Never 400** (F03-AC5) |
| function | `buildPredicate()` → `{ where: string, params: unknown[] }` | none in F03 | `{ where: 'deleted_at IS NULL', params: [] }` | never throws |
| function | `clampSize(raw)` → `number` | any value from `req.query.size` | one of `10`/`20`/`50`; `20` for anything else (F03-AC5) | never throws |
| function | `clampPage(raw, maxPage)` → `number` | any value from `req.query.page`, plus the computed `maxPage` | an integer in `[1, maxPage]`; `1` for anything non-numeric or `< 1` (F03-AC5, F03-AC6) | never throws |
| function | `computeMaxPage(total, size)` → `number` | the counted total and the clamped size | `Math.max(1, Math.ceil(total / size))` | never throws |
| function | `countWhere(where, params)` → `number` | the shared predicate pair | the live row count matching the predicate | — |
| function | `listPage({ where, params, limit, offset })` → `Bookmark[]` (no `tags`) | the shared predicate pair plus the clamped `limit`/`offset` | the page's rows, `ORDER BY created_at DESC, id DESC` | — |
| function | `listTagsForBookmarks(ids)` → `{ bookmark_id, name }[]` | the ids of the rows just fetched (internal, not user input) | every live tag link for those ids | `[]` immediately, with no query, when `ids.length === 0` (an empty page, F03-AC2) |
| method | `ApiService.listBookmarks(page, size)` → `Promise<ListBookmarksResponse>` | the store's current `page`/`size` signals | the parsed JSON body | rejects with the `HttpErrorResponse`, mapped by the existing `api-error.ts` |

**Every acceptance criterion is reachable from this table or from §6:** AC1/AC3/AC7/AC12 via the success shape and ordering; AC2/AC10/AC11 via §6's states; AC4/AC9 via §6's pagination control; AC5/AC6 via `clampSize`/`clampPage`/`computeMaxPage`; AC8 via §6's card row.

## 5. Data Access

**No entity, field, index, or invariant is added, changed, or removed.** Every table and index already exists in `data-model.md` v3.

| Entity | F03 use |
|---|---|
| `bookmark` | Read only — the page query and the count query, both filtered by `deleted_at IS NULL` |
| `tag` | Read only, via the per-bookmark tag lookup |
| `bookmark_tag` | Read only — see the index note below |
| `setting` | Not used |

**Indexes used:**

- `ix_bookmark_list (deleted_at, created_at DESC, id DESC)` — serves both `countWhere` (the `deleted_at` predicate) and `listPage` (the predicate plus the `ORDER BY`/`LIMIT`/`OFFSET`). The `id DESC` tie-break is what keeps a page split stable when two bookmarks share the exact same `created_at` instant (F03-EC1) — without it, a row could appear on two consecutive page requests or on neither.
- The **composite primary key** `bookmark_tag(bookmark_id, tag_id)` — not `ix_bookmark_tag_lookup(tag_id, bookmark_id)`. `listTagsForBookmarks(ids)` asks "which tags does *this* bookmark have", which is a `bookmark_id`-leading lookup; `ix_bookmark_tag_lookup` leads with `tag_id` and serves the opposite question (F04's "which bookmarks have this tag"). The composite PK already covers the `bookmark_id`-leading case, so no new index is proposed.

**Queries** — prepared statements only (S4); no value is ever concatenated into SQL.

| Function | Statement (described) |
|---|---|
| `countWhere(where, params)` | `SELECT COUNT(*) AS n FROM bookmark WHERE ${where}` — `where` is assembled only from the fixed vocabulary `buildPredicate()` produces (today: the single constant `'deleted_at IS NULL'`); every *value* in it is a bound parameter from `params`. Prepared fresh per call rather than cached, an accepted cost recorded in LD-01 |
| `listPage({ where, params, limit, offset })` | `SELECT id, url, title, title_source, created_at, updated_at FROM bookmark WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?` — `limit`/`offset` are bound integers, never string-built (S1, S4, F03-AC5) |
| `listTagsForBookmarks(ids)` | `SELECT bt.bookmark_id, t.name FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.bookmark_id IN (?, ?, …)` — one `?` per id, built to match `ids.length` exactly. `ids` are bookmark ids the service already fetched from `listPage`, not raw request input, so the placeholder count is derived from a trusted internal array length, and every value bound is still a parameter. Returns `[]` immediately with no query when `ids` is empty |

**Service orchestration (`bookmark-service.list({ page, size })`):** `buildPredicate()` → `clampSize(size)` → `countWhere` → `computeMaxPage(total, clampedSize)` → `clampPage(page, maxPage)` → `listPage(...)` → `listTagsForBookmarks(rows.map(r => r.id))`, grouped into a `Map<id, string[]>` and merged onto each row as `tags`. `total`, `page`, and `size` in the response are always the **clamped** values, never the raw request values (F03-AC5, F03-AC6).

## 6. UI Changes and States

Ported from `docs/mockup.html` (U6): `.card`, `.chip`, `.list`, `.meta`, `.foot` markup and classes. The pagination control has no mockup counterpart — it is the declared `hld.md` §7 U6 addition.

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Bookmark list region** | `aria-busy="true"` on the list region plus a visible text indicator (`Loading bookmarks…`); pagination controls disabled while in flight (F03-AC10) | `No bookmarks yet` heading, the exact explanatory text from F03-AC2, and a primary *Add bookmark* button that opens F01's existing dialog (F03-AC2) | Plain-text `Something went wrong loading your bookmarks.` in an `aria-live` region, plus a *Retry* button that re-issues the identical `page`/`size` request (F03-AC11, F03-EC4) | The count region (`aria-live="polite"`) reads `N bookmark`/`N bookmarks` (F03-AC1, AC12); the card list; the pagination control | `Tab` order is every card's *Edit* then *Delete*, in visual order, then the pagination control (F03-AC9) |
| **Bookmark card** | n/a — covered at the list-region level | n/a | n/a | Title as a real `<a>` (already-validated `href` from save time); bold hostname (leading `www.` stripped) + path via `displayUrl()`; `Added <relativeTime>`; a tag-chip row **only when the bookmark has ≥1 tag** — no empty chip container otherwise (F03-EC5); *Edit*/*Delete* buttons | Tag chips are plain `<span>` text, not buttons — no click handler, no filter action (C-F03-01); `aria-label="Edit <title>"` / `aria-label="Delete <title>"` on the two buttons, present in the DOM with no handler wired (F06/F07 add the behavior); title link is real text, not `[innerHTML]` (S3) |
| **Pagination control** | Page-size `<select>` and Previous/Next disabled while `listLoading` (F03-AC10) | n/a | n/a | `<label for>` page-size `<select>` (10/20/50, F03-AC4); Previous/Next `<button>`s, disabled — not hidden — at the first/last page; `Page X of Y` rendered as text | Native `<select>` with an associated `<label>`; current page conveyed as text, never by position or colour alone (F03-AC9) |

**Empty-state wiring:** `bookmark-list.ts` emits `addRequested` when its *Add bookmark* button is activated; `app.ts` listens and calls the existing `openDialog()`, so F01's dialog opens through the same path the header button and FAB already use. No new dialog is created.

**Destructive actions (U4):** none in F03. Delete, its confirmation, and its undo are F07's; the buttons rendered here carry no handler.

### U6 deviations — declared, with reasons

Both already recorded in `hld.md` §7; restated here per `spec.md` U6 row.

| Deviation | Reason |
|---|---|
| A pagination control (page-size `<select>` + Previous/Next) is added below the list, with no counterpart in `docs/mockup.html` | R15 requires it. Styled to match the reference's existing button and chip treatment (LD-03) |
| The list-fetch-error state and its *Retry* button have no counterpart — the mockup's list never fails | C-F03-04. New copy, not sourced from the reference: `Something went wrong loading your bookmarks.` |

## 7. Validation Rules

F03 introduces no user-facing validation message — both query parameters clamp silently rather than erroring (F03-AC5), which is itself the rule the acceptance criteria assert.

| Field | Rule | User message |
|---|---|---|
| `size` (query parameter) | Must be one of `{10, 20, 50}`; anything else (non-numeric, out of range, missing) falls back to `20` | *(none — never surfaces to the user; the response simply carries the clamped value, F03-AC5)* |
| `page` (query parameter) | Must be an integer `≥ 1`; anything else (non-numeric, `0`, negative, missing) falls back to `1`; any value `>` the last valid page clamps down to that last page | *(none — never surfaces to the user, F03-AC5, F03-AC6)* |

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `size` outside `{10, 20, 50}`, non-numeric, or absent (F03-AC5, F03-EC2) | `lib/pagination.js` `clampSize` | `200` with `size: 20` (or the valid value supplied) — never `400` |
| `page` non-numeric, `0`, negative, or absent (F03-AC5) | `lib/pagination.js` `clampPage` | `200` with `page: 1` — never `400` |
| `page` beyond the last valid page (F03-AC6, F03-EC2) | `bookmark-service.list()`, after `total` is known | `200` with `page` clamped to `Math.ceil(total / size)` and that page's real rows — never an empty array |
| Two bookmarks share the exact same `created_at` at a page boundary (F03-EC1) | `ix_bookmark_list`'s `id DESC` tie-break, exercised by `listPage`'s fixed `ORDER BY` | The split is total and stable: no row appears on two pages, none is skipped |
| `GET /api/bookmarks` fails outright — network error or non-2xx (F03-AC11, F03-EC4) | `web` `bookmarks.store.ts` `loadList()` catch branch | `listError.set(true)`; list region shows the plain-text message plus *Retry*; *Retry* calls `loadList()` again with the same `page`/`size` |
| A list response arrives after a newer request has already been issued (LD-04) | `loadList()`'s request-token check | The stale response is discarded; only the current request's result is ever applied to `items`/`total`/`page`/`size` |
| Database failure on `countWhere` or `listPage` | repository → the existing `app.js` error middleware (unchanged from F01) | `500 STORAGE_ERROR`, the existing safe message; full detail to the server console only (U5) |

## 9. Security Considerations

One row per untrusted input F03 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `page` query parameter | Coerced to an integer and clamped to `[1, maxPage]` in `lib/pagination.js`, **before** it is ever used; bound as an integer into `OFFSET`, never string-built. Any value at all produces a `200`, never a `400` or an unbounded query (F03-AC5) | **S1**, S4 |
| `size` query parameter | Must be a member of the fixed allow-list `{10, 20, 50}` or it falls back to `20`; bound as an integer into `LIMIT`, never string-built | **S1**, S4 |
| Internal predicate text (`where`, from `buildPredicate()`) | Assembled only from a fixed vocabulary of clause fragments chosen in code — today the single constant `'deleted_at IS NULL'`. No request value is ever concatenated into the WHERE clause text itself; only bound parameters carry values (F04/F05 extend this same discipline when they add their own clause) | **S4** |
| Tag name (rendered on each card) | Read from `bookmark_tag`/`tag`, rendered through Angular interpolation only, inside a plain, non-interactive `<span>` — never `[innerHTML]` (C-F03-01) | **S3** |
| Title / URL (rendered again on each card) | Same controls as F01: plain-text storage, Angular interpolation only; the card's `href` is only ever the value already validated and stored at save time | **S3** |

**Not applicable in F03:** search text and tag-filter values (S6) — F05 and F04 own them; F03 writes no `LIKE` pattern and adds no tag-equality predicate.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (bookmark-list + store)
  participant R as api routes/bookmarks
  participant S as bookmark-service.list
  participant Q as list-query (buildPredicate)
  participant D as data/bookmark-repository

  U->>W: Load the screen, or change page / page size
  W->>W: listLoading.set(true); bump request token (LD-04)
  W->>R: GET /api/bookmarks?page=&size=
  R->>S: list({ page, size })
  S->>Q: buildPredicate()
  Q-->>S: { where: "deleted_at IS NULL", params: [] }
  S->>S: clampSize(size) -> one of 10/20/50 (F03-AC5)
  S->>D: countWhere(where, params)
  D-->>S: total
  S->>S: maxPage = computeMaxPage(total, size); clampPage(page, maxPage) (F03-AC5, AC6, EC24)
  S->>D: listPage({ where, params, limit, offset })
  D-->>S: rows, ORDER BY created_at DESC, id DESC (F03-EC1)
  S->>D: listTagsForBookmarks(rows.map(r => r.id))
  D-->>S: tag rows grouped by bookmark_id
  S-->>R: { items: rows+tags, total, page, size }
  R-->>W: 200
  alt response token still current
    W-->>U: count text, cards (or the empty state if total = 0, AC2), pagination
  else superseded by a newer request (LD-04)
    W-->>W: response discarded
  end
  opt the request fails
    W-->>U: "Something went wrong loading your bookmarks." + Retry (AC11)
  end
```

## 11. Test Hooks

- **`clampSize`, `clampPage`, `computeMaxPage`** exported as pure functions from `lib/pagination.js` — exhaustive table tests including every boundary (`size=10/20/50/7/500/abc`, `page=0/-1/abc/1/99`), so F03-AC5 and F03-AC6 are asserted without an HTTP layer.
- **`buildPredicate()`** exported as a pure function from `services/list-query.js`, so a test can assert its exact `{ where, params }` shape — the contract F04 and F05 are told to extend (AS-F03-01).
- **`bookmark-service.list({ page, size })`** accepts the same raw, possibly-invalid values the route passes through, so its tests call it exactly as the route does, without needing a running server.
- **`createDb({ file: ':memory:' })`** (already exists from F01) seeded with rows sharing an identical `created_at` instant, so the `id DESC` tie-break is asserted deterministically across two consecutive page requests (F03-EC1) rather than left to chance.
- **The request-token guard in `BookmarksStore.loadList()`** is asserted by resolving two fake `ApiService.listBookmarks()` promises out of order in a store test, confirming the earlier one never overwrites the later one's result (LD-04).
- **`ApiService` provided through Angular DI** with `provideHttpClientTesting` (the existing F01 pattern) — the list's loading/empty/error/success branches and the pagination control's disabled states are testable without a server.
- **Deliberately not automated here, carried to `/test-phase F03-list-bookmarks`** per `spec.md` §6: the NFR-01 1,000-record timed measurement, and the full F03-AC7 restart comparison across two real process restarts. The ordering and tie-break *mechanism* (F03-EC1) is unit-tested above; the restart itself crosses a process boundary and stays a documented manual procedure, the same pattern F01 used for its own AC15.

## 12. Architecture Impact

**None.** `hld.md` v2, `data-model.md` v3, and `component-map.json` v1 are all unchanged. No entity, field, index, or invariant is added. The `bookmark_tag` composite primary key already covers the `bookmark_id`-leading lookup F03 needs (§5); no new index is proposed.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; no F03 code exists yet |
| P2 Human approval gates | pass | LD-01…LD-04 each put to dev-1 as an option table; all four answered "Accept Recommendation" 2026-10-01 |
| P3 Honesty over polish | pass | Nothing in this document is claimed as verified; `/test-phase F03-list-bookmarks` is where NFR-01 and F03-AC7 are actually measured |
| P4 Simplicity first | pass | No caching layer, no client-side pagination, no persisted page-size setting (C-F03-02), no new index. LD-01 option B and LD-03 option B were rejected on exactly this ground |
| P5 Incremental delivery | pass | Every task in `tasks.md` leaves the app buildable and runnable |
| P6 Single source of truth | pass | `buildPredicate()` is written once and is the function F04/F05 extend (AS-F03-01); nothing here restates an architecture fact independently |
| P7 Measurable requirements | pass | §4/§7/§8 give every AC an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM property |
| Q1 Every AC testable | pass | §11 names the seam for each; the restart check (AC7) and the NFR-01 measurement are documented manual/measured procedures, which Q1 and Q6 permit |
| Q2 Tests executed | n/a | No test has run yet; nothing here records a result |
| Q3 Zero lint/build errors | pass (planned) | Each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (unchanged scope from F01) |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | pass | NFR-01 is explicitly **not** claimed here — it is measured in `/test-phase F03-list-bookmarks` against a 1,000-record seed, never estimated |
| S1 Validation at the boundary | pass | `clampSize`/`clampPage` run in the service, not the client; a direct `curl` against the API gets the same clamp |
| S4 Parameterized queries | pass | §5: every value a bound parameter; `where` text assembled only from a fixed vocabulary, never from request input; `ORDER BY` a fixed constant |
| S3 Output escaping | pass | Tag/title/url rendered through Angular interpolation only, no `[innerHTML]` |
| U1 Keyboard-operable, visible focus | pass | §6: native `<button>`/`<select>`/`<a>` throughout; existing `:focus-visible` outline (`styles.css`) applies unchanged |
| U2 Labelled controls, errors as text | pass | The page-size `<select>` has a `<label for>`; the count and error regions are `aria-live` text |
| U3 Empty/loading/error states | pass | F03-AC2 (empty), F03-AC10 (loading), F03-AC11 (error) all implemented. No-results/empty-tag-filter states remain F05's/F04's |
| U4 Destructive actions | n/a | F03 renders Edit/Delete with no handler; behavior is F06's/F07's |
| U5 Actionable errors | pass | F03-AC11's message states what happened and offers the next step; no stack trace or SQL fragment reaches the client |
| U6 Approved UX reference | **addition, declared** | Two additions recorded in §6, both already declared in `hld.md` §7: the pagination control, and the list-fetch-error state |
| A1 Local, no paid service | pass | Same single Express process; no new outbound call |
| A2/A5 Persistence | pass | Read-only feature; reuses the existing SQLite file and indexes, no schema change |
| A4 Component map | pass | Every file in §3 and `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1 |
| D1 Synthetic data | pass | The F03-EC1 tie-break test and the NFR-01 seed script both use `example.com` data only |
| D2/D3 Licensing | pass | No new dependency added |
| E1 Evidence format | pass | Material interactions from this session are logged per the `evidence-logging` skill |
| E3 No artifact disagrees | pass | Nothing here contradicts `hld.md` v2 or `data-model.md` v3; §12 confirms no architecture change |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, draft. LD-01 (shared `buildPredicate()` feeding both `countWhere` and `listPage`), LD-02 (client-side `relativeTime()`, services never format markup), LD-03 (fixed-size pagination control: page-size select + Previous/Next + "Page X of Y"), LD-04 (request-token guard against stale/out-of-order responses) — all four answered "Accept Recommendation" by dev-1 | `/design-feature F03-list-bookmarks`, CREATE mode | design |
