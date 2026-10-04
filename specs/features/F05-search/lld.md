# F05: Search (Low-Level Design)

**Feature ID:** F05-search
**Status:** approved — LD-01…LD-06 accepted by dev-1 ("Go with all recommendations") 2026-10-01; design gate approved 2026-10-01
**Spec version:** 1, approved 2026-10-01
**HLD version:** 2
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F05 code exists yet. Every "the code will…" statement is an instruction to `/build-feature`; every expected outcome is checked for the first time in `/test-phase F05-search`.

## 1. Design Overview

F05 is the second and final feature to extend `list-query.js`'s `buildPredicate()` (AS-F03-01, already extended once by F04's tag predicate), and the first to exercise `like-escape.js`'s `escapeLikePattern()` outside F02's tag-prefix query — both modules already carry header comments reserving themselves for exactly this feature. `buildPredicate()` is refactored from its current two-branch shape (no tag / tag) into a small clause array, so it can compose zero, one, or both of a tag equality predicate and a search `LIKE` predicate without `countWhere`/`listPage` ever changing (LD-01). The search predicate matches title **or** URL, escaped and bound per S6 (LD-02), and a new `normalizeSearchValue()` mirrors F04's `normalizeTagFilterValue()` precedent exactly: trim, cap at 200 characters, `null` for anything that isn't a usable string — never a 400 (LD-03).

On `web`, a new `SearchBox` component renders the header's `#q`/`#qx` search field (`docs/mockup.html`'s `.search` markup), debouncing the request the same way `TagInput` already debounces its own suggestion fetches (LD-04). The existing `listRequestToken` guard in `BookmarksStore.loadList()` is reused as-is for the stale-response race (LD-05, directly resolving F05-RK1 — one guard, not two that could drift, exactly as F04-RK1 was resolved for the tag filter). `BookmarkList`'s empty-state branching is reordered to match `docs/mockup.html`'s own `!n ? 'none' : q ? 'search' : 'tag'` precedence function exactly, using `store.allCount()` (already shipped by F04) as `n` — this also closes a latent gap in F04's shipped branch order, where a tag filter active against a zero-bookmark store would have shown the tag-empty state instead of F03's all-empty state. The no-results state itself offers both `Clear search` and, when a tag filter is also active, `Clear tag filter` (LD-06), matching the reference verbatim.

**Out of scope, unchanged from `spec.md` §5:** search by tag name (F04's job), full-text search of page contents, persisting the typed search text (AS-F05-02), combining search with more than one simultaneously active tag, the tag rail and its own interactivity (F04), tag creation/validation (F02), the page/size clamp mechanics themselves (F03), loading and list-fetch-error states (F03), Edit/Delete behavior on a result row (F06/F07).

## 2. Alternatives Considered

All six decisions were presented to dev-1 with option tables on 2026-10-01 and answered "Go with all recommendations."

### LD-01 How `buildPredicate()` composes a second, independent optional predicate

| Option | Pros | Cons |
|---|---|---|
| **A: refactor to a clause array** — `const clauses = ['deleted_at IS NULL']; if (tag) clauses.push(...); if (q) clauses.push(...); return { where: clauses.join(' AND '), params }` | Scales to tag-only, search-only, both, or neither through one code path; produces the **exact same** `where` strings F04's existing `list-query.test.js` assertions already check (verified against the shipped file before this LLD was written), so F04's tests need no change | One small refactor of already-shipped, already-tested code |
| B: enumerate the four tag×q combinations as explicit if/else branches, each returning its own literal `where` string | No change to the existing two-branch shape | Four near-identical `where` string literals instead of one assembled text — exactly the drift risk AD-07/AS-F03-01 was written to prevent, now with a second predicate to keep in sync by hand |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** a refactor touches already-shipped code, in exchange for F05 never needing a third branch if a future feature adds a third predicate.
**Challenge applied:** *at 1,000 records?* No change to the query shape `countWhere`/`listPage` already run — this only changes how `where`'s text is assembled in JavaScript, not what SQL executes; the `LIKE` scan cost is AD-06's already-accepted, already-documented cost, measured in `/test-phase F05-search`, not here. *On restart?* Read-only path, unaffected. *Keyboard-only?* Unaffected — a data-access decision.

### LD-02 Where the `%`/`_`/`\` LIKE-escaping for search text happens

| Option | Pros | Cons |
|---|---|---|
| **A: inside `buildPredicate()`**, calling the already-shipped `escapeLikePattern()` (F02) and binding `%<escaped>%` as the parameter for both the `title` and `url` sides of the `OR` | One place owns both predicate-text assembly and the S6 escaping it depends on, matching `like-escape.js`'s own header comment ("reserved for F05's future search"); `bookmark-service.js` stays a pure orchestrator, unchanged in this respect from F03/F04 | — |
| B: escape in `bookmark-service.js` before calling `buildPredicate()`, passing the already-escaped pattern through | — | Splits "assemble the SQL clause text" and "escape the value going into it" across two files for no benefit — `tag`'s equality predicate doesn't need this split either, and `buildPredicate()` would then silently depend on a caller discipline it cannot itself verify |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** none of substance — A is strictly the closer match to `like-escape.js`'s own stated purpose.
**Challenge applied:** *at 1,000 records?* `escapeLikePattern()` is a single `String.replace()` over a ≤200-character string (LD-03), called once per request — not a per-row cost. *On restart?* N/A, read-only. *Keyboard-only?* N/A — a data-access decision.

### LD-03 Where the 200-character cap and trim for `q` live

| Option | Pros | Cons |
|---|---|---|
| **A: a new `normalizeSearchValue(raw)` in `list-query.js`**, colocated with `normalizeTagFilterValue` — trim, cap at 200 characters, `null` for anything that is not a non-empty string after trimming (F05-AC11, F05-EC2) | Exact mirror of F04 LD-02's precedent (a separate, lenient, never-throwing normalizer next to the function that consumes it); never rejects, matching the established "boundary values clamp, they never 400" convention from `lib/pagination.js` | A second small normalizer function living in the same file as the tag one |
| B: inline the trim/cap logic inside `bookmark-service.js`'s `list()` | — | Splits normalization across two files for no reason, breaking the pairing LD-03 Option A and F04's own LD-02 both establish; harder to unit-test without the service's other dependencies |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** none of substance — A is strictly the established pattern, now used a second time.
**Challenge applied:** *at 1,000 records?* N/A, a string operation on one query parameter. *On restart?* N/A. *Keyboard-only?* N/A — server-side only.

### LD-04 Debounce ownership for the search box (F05-AC12's 250 ms)

| Option | Pros | Cons |
|---|---|---|
| **A: component-owned `setTimeout`**, identical in shape to `TagInput`'s already-shipped `debounceSuggestions()`/`SUGGESTION_DEBOUNCE_MS` pattern — the component tracks a `hasText` signal updated on every keystroke (for the `#qx` button's immediate show/hide) and calls `store.setSearchText(value)` only after the debounce settles | Matches the one precedent this codebase already has for debouncing input (F02-AC12); keeps `BookmarksStore`'s existing convention that every one of its own methods issues its request immediately — no new "this store method waits before doing anything" case to reason about | The `#qx` button's visibility is driven by a small amount of component-local state rather than purely the store, because the store's own `search` signal only updates once the debounce settles |
| B: a store-owned debounce (the store holds the timer, `setSearchText()` itself delays before calling `loadList()`) | Centralizes all timing in one place | Introduces a second timing convention into the store (every other store method is immediate) for a capability only one caller needs; `#qx`'s immediate visibility would then need to read raw input state anyway, since the store's own `search` signal would still only update after the delay — the same split LD-04A has, with an added store-level timer besides |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** the `#qx` button's visibility is local component state, not store state, in exchange for not introducing a second debounce-ownership convention when `TagInput` already established and shipped one.
**Challenge applied:** *at 1,000 records?* N/A, client-side timing, independent of table size. *On restart?* N/A, in-memory per page load. *Keyboard-only?* The debounce delays the **request**, never the **visible keystroke** — the native `<input>` renders every character the instant it is typed, since no Angular re-render gates the browser's own text-field rendering.

### LD-05 The stale/out-of-order response guard for the search race (F05-EC1, F05-RK1)

| Option | Pros | Cons |
|---|---|---|
| **A: reuse the existing `listRequestToken`** already in `BookmarksStore.loadList()` — a debounced search simply calls `loadList()` exactly like a page change, a page-size change, a tag selection, or a filter clear already do | Directly resolves F05-RK1's stated risk ("if each feature's LLD writes its own copy, the two guards can drift"): there is exactly **one** guard, used by every list-changing action, tag or search alike; zero new code, zero new field | The superseded request still completes server-side — already an accepted, harmless cost since F03's LD-04 first made this trade-off (`GET /api/bookmarks` has no side effect) |
| B: add a second, parallel `searchRequestToken`, separate from `listRequestToken` | Would isolate a hypothetical "only search responses can go stale" case | No such case exists — `loadList()` has exactly one call site per trigger already, and every trigger (page, size, tag, search) races against every other one identically; a second token would duplicate A's exact behavior while reintroducing the very drift risk F05-RK1 names |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** none of substance — A is the direct, documented resolution to F05-RK1, and the "separate guard" alternative is the risk, not a trade-off against it.
**Challenge applied:** *at 1,000 records?* Unaffected — the race is about response ordering, independent of table size. *On restart?* N/A, in-memory per page load. *Keyboard-only?* This is precisely the guard that keeps a fast typist's screen showing only the most recent keystroke's results (F05-AC13).

### LD-06 The no-results state's actions when a tag filter is also active (F05-EC3)

`docs/mockup.html`'s `empty()` function builds the `'search'` case's action list as `[['Clear search','pri',clearQ],...(S.tag?[['Clear tag filter','',clearT]]:[])]` — `Clear tag filter` is conditionally appended, never shown alone, never hidden outright.

| Option | Pros | Cons |
|---|---|---|
| **A: render both `Clear search` (primary) and, only when `store.tagFilter()` is set, a secondary `Clear tag filter`** — ported verbatim from the reference's conditional array | Exact U6 conformance with no declared deviation needed; gives the user a direct path back when both predicates are jointly producing zero rows (F05-EC3), rather than requiring two separate clears in sequence | One more conditional control to keyboard-test |
| B: show only `Clear search`, the minimal reading of F05-AC7's own wording (which does not mention a tag filter) | Simpler markup | Silently deviates from the reference's own `empty()` function for the composed case (search + tag both active, both zeroing the results) with no stated reason — would need a declared U6 deviation this design does not otherwise require |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off accepted:** none of substance — A is strictly the closer match to the reference's own conditional logic.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web` (both `workspaceRoot: "."`).

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/services/list-query.js` (changed) | `buildPredicate({ tag, q } = {})` refactored to a clause array (LD-01): the `deleted_at IS NULL` constant, an optional tag `EXISTS` subquery (F04, unchanged text), and a new optional `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` clause built from `escapeLikePattern(q)` (LD-02), each independently present or absent and AND-joined. New `normalizeSearchValue(raw)` (LD-03): trim, cap at 200 characters, `null` for anything not a non-empty string after trimming — never throws |
| `api` | `app/api` | `src/services/bookmark-service.js` (changed) | `list({ page, size, tag, q })` normalizes `q` via `normalizeSearchValue()` alongside the existing `tag` normalization, and threads both into `buildPredicate()` |
| `api` | `app/api` | `src/routes/bookmarks.js` (changed) | `GET /bookmarks` now also reads `req.query.q`, passed through to `service.list()` completely unvalidated, exactly like `page`/`size`/`tag` (`hld.md` §5 — the route still does no clamping, escaping, or validation itself) |
| `api` | `app/api` | `test/list-query.test.js` (changed) | New assertions for the `q`-only shape, the combined `tag`+`q` shape, and `normalizeSearchValue`'s input table (including the 210-character cap case, F05-EC2) |
| `api` | `app/api` | `test/bookmark-service.test.js` (changed) | New fixture assertions: title-only match, URL-only match (F05-EC4), case-insensitivity (F05-AC3), `%`/`_` literal matching (F05-AC4, AC5), a quote/`<script>` payload matched and returned literally (F05-AC6), search AND tag together (F05-AC9, EC3), page reset to 1 on a search change (F05-AC10) |
| `api` | `app/api` | `test/bookmarks-route.test.js` (changed) | HTTP-level `GET /api/bookmarks?q=` tests, extending the same server-on-a-random-port harness `list-route.test.js`/F04's tag tests already use: the metacharacter/quote/`<script>` probes end to end, the 200-character cap via a direct 210-character query value, and the composed `?tag=&q=` case |
| `api` | `app/api` | `test/nfr01-timing.test.js` (changed) | A second timed run added alongside the existing list-page measurement: `GET /api/bookmarks?q=` against the existing 1,000-record seed, median and max recorded. **Not executed here** — `/test-phase F05-search` is where this actually runs and the observed numbers are recorded (Q6, RK05) |
| `web` | `app/web` | `src/app/core/icons.ts` (changed) | Adds `search` and `x` icon paths. `search` is ported as a **single** multi-subpath `d` string (`M18 11a7 7 0 1 1-14 0 7 7 0 1 1 14 0M20 20l-3.5-3.5` — a two-arc circle plus a separate line subpath, numerically identical to the reference's `<circle>`+`<path>` pair), following the same "two subpaths in one `d`" precedent the existing `x`-icon path already uses, so no new icon-rendering convention is introduced for a compound glyph |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | `listBookmarks(page, size, tag?, q?)` — `q` appended to the query params only when non-null, mirroring `tag`'s existing convention exactly (no empty `q=` param ever sent) |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (changed) | New `search` signal (`string`, default `''`) — holds the value of the **last issued** request, not every keystroke. New `setSearchText(value)` (the debounced path — sets `search`, resets `page` to 1, calls `loadList()`) and `clearSearch()` (immediate, same effect, the `#qx` button's handler). `loadList()` now also passes `this.search()` (as `null` when empty) to `api.listBookmarks()`. `countText` computed now reads `this.search() !== ''` in addition to `this.tagFilter() !== null` for the "N of M bookmarks" wording (F05-AC10, matching the reference's `filtered=q||S.tag`) |
| `web` | `app/web` | `src/app/features/search-box/search-box.{ts,html}` (new) | The `#q`/`#qx` search field (LD-04): a local `hasText` signal drives `#qx`'s immediate show/hide; a 250 ms debounce (mirroring `TagInput`'s shipped pattern) calls `store.setSearchText()`; `#qx`'s click clears the native input, cancels any pending debounce, and calls `store.clearSearch()` immediately, then returns focus to `#q` |
| `web` | `app/web` | `src/app/features/search-box/search-box.spec.ts` (new) | Component-level tests with a stubbed `BookmarksStore`, using fake timers to assert the 250 ms debounce and `#qx`'s immediate visibility (F05-AC12, AC13) |
| `web` | `app/web` | `src/app/features/bookmark-list/bookmark-list.html` (changed) | Empty-state branch order corrected to match `docs/mockup.html`'s own `!n ? 'none' : q ? 'search' : 'tag'` precedence exactly, using `store.allCount()` as `n`: the all-empty state is now checked **before** the search no-results and tag-empty branches, which also closes a latent gap in F04's shipped order (a tag filter active against a zero-bookmark store previously showed the tag-empty state instead of F03's all-empty state). New no-results branch (F05-AC7, EC11): heading `No bookmarks match "<q>"`, the fixed explanatory text, a primary `Clear search` button, and — only when `store.tagFilter()` is set — a secondary `Clear tag filter` button (LD-06) |
| `web` | `app/web` | `src/app/features/bookmark-list/bookmark-list.spec.ts` (changed) | New tests for the corrected precedence order (all-empty beats both tag-empty and search-no-results) and the no-results state's conditional second action |
| `web` | `app/web` | `src/app/app.html`, `src/app/app.ts` (changed) | Mount `<app-search-box />` inside `.bar`, between the logo and the *Add bookmark* button, matching `docs/mockup.html`'s `<div class="bar"><a class="logo">…</a><div class="search">…</div><button id="add">…</button></div>` DOM order |
| `web` | `app/web` | `src/styles.css` (changed) | Ports `.search`, `.search input`, `.si`, `.cl`, and the `>=720px` `.search` reorder/width rule from `docs/mockup.html` — the file's own header comment already names search as one of the rule groups deferred until "the feature that renders them lands" |
| `web` | `app/web` | `src/app/state/bookmarks.store.spec.ts` (changed) | New tests for `setSearchText`, `clearSearch`, the updated `countText` composition, and the `listRequestToken` guard exercised through a search call exactly as F03's own test exercises it through a page call (LD-05) |

No file outside these paths is touched. No entity, field, index, or invariant is added to `data-model.md`; the search predicate's exact shape is already named in `data-model.md` §3 ("optionally `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` for R05").

## 4. API / Interface Contract

Error bodies use the shape fixed in `hld.md` §8 (unchanged by F05 — this feature introduces no new error code).

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `GET` | `/api/bookmarks` | `page`, `size`, `tag` (F03/F04, unchanged), plus new `q` — optional, any string, any length, never validated as 400 | `200 { items: BookmarkListItem[], total, page, size }` — `items` matched against title **or** full URL (F05-AC1, AC2), case-insensitively (F05-AC3), composed with `tag` via AND when both are present (F05-AC9); `total`/`page`/`size` reflect the filtered result set | `500 STORAGE_ERROR` only (unchanged from F03/F04) |
| function | `buildPredicate({ tag, q }?)` → `{ where: string, params: unknown[] }` | `tag`: a normalized string or `null`/absent. `q`: a normalized string or `null`/absent | Clauses are AND-joined in order: `deleted_at IS NULL` always; the tag `EXISTS` clause when `tag` is present (F04, unchanged text); `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` when `q` is present, with `params` carrying `%<escaped q>%` twice | never throws |
| function | `normalizeSearchValue(raw)` → `string \| null` | `req.query.q`, any shape | a trimmed, non-empty string capped at 200 characters; `null` for anything else (absent, empty, whitespace-only, non-string, e.g. an array from a repeated query parameter) | never throws |
| function | `bookmark-service.list({ page, size, tag, q })` → `{ items, total, page, size }` | raw, possibly-invalid `page`/`size`/`tag`/`q` straight from the route | as above; `q` normalized before `buildPredicate()` is called | never throws |
| method | `ApiService.listBookmarks(page, size, tag?, q?)` → `Promise<ListBookmarksResponse>` | the store's current `page`/`size`/`tagFilter`/`search` signals | the parsed JSON body | rejects with the mapped `HttpErrorResponse` |

**Every acceptance criterion is reachable from this table or from §6:** AC1/AC2/AC3/AC4/AC5/AC6 via the `GET /api/bookmarks?q=` row, `buildPredicate`, and `normalizeSearchValue`; AC7/AC8 via §6's no-results and all-empty states; AC9 via `q` and `tag` both threading into the same `buildPredicate()` call; AC10 via `q` surviving a page-size change (store-level, §3) and the updated `countText`; AC11 via `normalizeSearchValue`'s 200-character cap; AC12 via §6's `SearchBox` keyboard/label contract; AC13 via the reused `listRequestToken` (LD-05).

## 5. Data Access

**No entity, field, index, or invariant is added, changed, or removed.** Every table and index already exists in `data-model.md` v3, which already names this exact predicate shape in §3.

| Entity | F05 use |
|---|---|
| `bookmark` | Read only — the page query and the count query, both filtered by `deleted_at IS NULL`, now optionally also by the search `LIKE` clause (against `title` and `url`) in addition to F04's optional tag `EXISTS` clause |
| `tag` | Read only, unchanged from F04 — matched only when a tag filter is also active |
| `bookmark_tag` | Read only, unchanged from F04 — the tag `EXISTS` subquery's join target |
| `setting` | Not used |

**Indexes used:** none newly engaged. `ix_bookmark_list (deleted_at, created_at DESC, id DESC)` continues to serve the `ORDER BY`/`LIMIT`/`OFFSET` half unchanged. Per `data-model.md` §3 (AD-06), the leading-wildcard `LIKE '%…%'` **cannot** use an index and is a scan of the live rows — an accepted, already-documented cost at the 1,000-record volume, measured (not estimated) in `/test-phase F05-search` per Q6/RK05.

**Queries** — prepared statements only (S4); no value is ever concatenated into SQL.

| Function | Statement (described) |
|---|---|
| `buildPredicate({ tag, q })` | `where` is now built from a clause array (LD-01): `deleted_at IS NULL` always; `EXISTS (SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.bookmark_id = bookmark.id AND t.name = ?)` when `tag` is present (F04, byte-identical text); `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` when `q` is present — `params` carries `[tag]` and/or `[pattern, pattern]` in that order, where `pattern = '%' + escapeLikePattern(q) + '%'` |
| `countWhere(where, params)` (F03/F04, unchanged) | `SELECT COUNT(*) AS n FROM bookmark WHERE ${where}` — `where` now has up to four possible shapes (neither/tag/search/both) instead of two, all from `buildPredicate()`'s fixed vocabulary; every value in `params` is still bound |
| `listPage({ where, params, limit, offset })` (F03/F04, unchanged) | `SELECT … FROM bookmark WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?` — the search clause is part of `where`'s fixed text, `q`'s escaped pattern travels in `params`, `limit`/`offset` remain bound integers |

**Service orchestration (`bookmark-service.list({ page, size, tag, q })`):** `normalizeTagFilterValue(tag)` and `normalizeSearchValue(q)` → `buildPredicate({ tag: normalizedTag, q: normalizedQ })` → `clampSize(size)` → `countWhere` → `computeMaxPage` → `clampPage(page, maxPage)` → `listPage(...)` → `listTagsForBookmarks(...)` (F03, unchanged). `total`, `page`, `size` are always the clamped values computed **against the filtered predicate**, so F05-AC10's page-1 reset on a search or page-size change is the same existing `computeMaxPage`/`clampPage` consequence F04-AC6 already established, not new code.

## 6. UI Changes and States

Ported from `docs/mockup.html`'s `.search` header markup, `render()`'s `#qx` visibility and `#count`/`#af` composition, and `empty('search')` (U6).

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Search box** (`SearchBox`, new, mounted in the header bar) | n/a — no loading indicator of its own; the list region's existing loading state (F03) covers the in-flight request | n/a | n/a | Typing updates the native `<input>` immediately; after a 250 ms pause the debounced request fires (F05-AC12). `#qx` appears the instant any character is present (not debounced) and disappears when the field is emptied | `#q` has an associated, visually-hidden `<label for="q">Search bookmarks by title or web address</label>` (`.sr`, already shipped); `Tab` reaches `#q` then `#qx` (only when present) in DOM order; `#qx` is a real `<button aria-label="Clear search">`, keyboard-activatable, and returns focus to `#q` on activation (F05-AC12) |
| **Count region** (`#count`, existing, F03/F04) | unchanged | unchanged | unchanged | Text reads `N of M bookmarks` whenever **either** `store.tagFilter()` is set **or** `store.search()` is non-empty (F05-AC10, matching the reference's `filtered=q||S.tag`); unchanged `N bookmark`/`N bookmarks` wording when neither is active | `aria-live="polite"`, unchanged from F03/F04 |
| **All-empty state** (`BookmarkList`, F03, now checked first) | n/a | Checked **before** both the search no-results and tag-empty branches, using `store.allCount() === 0` — matches the reference's `!n` check exactly, and is the single source of truth for "nothing is saved at all" regardless of what `q`/`tag` currently hold (F05-AC8) | n/a | n/a (this branch is itself the outcome) | Unchanged from F03: `No bookmarks yet` heading, the existing explanatory text, primary *Add bookmark* action |
| **Search no-results state** (`BookmarkList`, new, checked second) | n/a | Renders when `store.allCount() > 0`, `store.items().length === 0`, and `store.search() !== ''`: heading `No bookmarks match "<store.search().trim()>"`, text `Check the spelling or try fewer words. Search looks at titles and web addresses.`, a primary `Clear search` button, and — only when `store.tagFilter()` is also set — a secondary `Clear tag filter` button (F05-AC7, EC11, LD-06) | n/a | n/a (this branch is itself the outcome) | Both buttons are real `<button>`s, `Tab`-reachable, keyboard-activatable; the search text is rendered through Angular interpolation, so a `<script>`-shaped query is inert text in the heading, never executed (F05-AC6, S3) |
| **Tag-empty state** (`BookmarkList`, F04, now checked third) | n/a | Unchanged from F04: renders when `store.allCount() > 0`, `store.items().length === 0`, `store.search() === ''`, and `store.tagFilter()` is set | n/a | n/a | Unchanged from F04 |
| **Bookmark card / list / pagination** | unchanged from F03/F04 | n/a | n/a | unchanged from F03/F04 | unchanged from F03/F04 |

**Destructive actions (U4):** none in F05. Clearing a search is a reversible, non-destructive view-state change, not an action on stored data.

### U6 deviations — declared, with reasons

None new. The search field's markup, the `#qx` clear button, the no-results copy (including its conditional second action), and the corrected `!n ? 'none' : q ? 'search' : 'tag'` precedence are all ported verbatim from `docs/mockup.html`. The project's one established, already-declared U6 punctuation deviation continues to apply here: the no-results heading uses an ASCII double quote (`"zzzqqq"`) rather than the reference's typographic curly quotes, matching the exact wording already fixed in `spec.md` F05-AC7 and the ASCII-punctuation precedent already recorded in `bookmarks.store.ts` (`BUSY_FETCHING_TITLE`'s three ASCII dots, `SAVED_TOAST`'s ASCII apostrophe).

## 7. Validation Rules

F05 introduces no user-facing validation message. The `q` query parameter normalizes silently and, if it matches nothing, simply returns zero rows — this silence is itself the rule F05-AC11 asserts.

| Field | Rule | User message |
|---|---|---|
| `q` (query parameter) | Trimmed; capped at 200 characters; any non-string, empty, or whitespace-only value is treated as "no search" | *(none — the response is always `200`; a value past the cap is simply truncated before matching, F05-AC11)* |

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `q` contains `%`, `_`, `\`, a quote, or `<script>` (F05-AC4, AC5, AC6, EC12) | `normalizeSearchValue` (trim/cap only) → `buildPredicate`'s `escapeLikePattern(q)` call | Matched as literal text; `200` in every case, never an error; nothing executes |
| `q` longer than 200 characters, supplied directly (F05-AC11, F05-EC2) | `normalizeSearchValue` | Capped to 200 characters before matching — never `400` |
| `q` query parameter sent more than once (becomes an array in Express's query parser) | `normalizeSearchValue`'s `typeof raw !== 'string'` check | Treated as "no search" — never a crash, never a 500 |
| `q` combined with an active `tag` (F05-AC9, EC3) | `buildPredicate({ tag, q })` AND-joining both clauses | Only bookmarks satisfying **both** predicates are returned |
| `q` matches no bookmark, and at least one bookmark exists overall (F05-AC7, EC11) | `BookmarkList`'s corrected precedence (§6) | The search no-results state renders, offering `Clear search` (and `Clear tag filter` if applicable) |
| `q` is typed while the store has zero bookmarks in total (F05-AC8, EC5) | `BookmarkList`'s corrected precedence — `store.allCount() === 0` is checked **before** the search branch | F03's `No bookmarks yet` state renders instead, never the no-results state |
| Search cleared while a tag filter is active, or a tag filter cleared while search text is present (F05-EC6) | `clearSearch()` only touches `search`; `clearTagFilter()` only touches `tagFilter` — neither method reads or resets the other's signal | The predicate that was not cleared stays applied on the very next request |
| Two keystrokes in rapid succession put two requests in flight at once (F05-AC13, EC1) | `BookmarksStore`'s existing `listRequestToken` (F03/F04, reused unchanged — LD-05) | Only the most recently issued request's result is ever applied; an earlier, slower response is discarded on arrival |
| Database failure on the now-four-shaped `countWhere`/`listPage` calls | repository → the existing `app.js` error middleware (unchanged from F01/F03/F04) | `500 STORAGE_ERROR`, the existing safe message; full detail to the server console only (U5) |

## 9. Security Considerations

One row per untrusted input F05 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `q` (search text) query parameter | Normalized (trim, cap at 200 characters) by `normalizeSearchValue()` **before** it is ever used; escaped by `escapeLikePattern()` (prefixing `\`, `%`, `_` with `\`) before being wrapped in `%…%` and bound as two parameters into the `LIKE … ESCAPE '\'` clauses — never string-built into the `WHERE` clause text itself, never interpreted as a pattern the caller intended (S6). Any value at all — including `%`, `_`, quotes, or `<script>` — produces a `200`, never a `400` or an unbounded scan beyond the existing, accepted `LIKE` cost (F05-AC4, AC5, AC6, AC11) | **S1**, S4, **S6**, NFR-04 |
| Internal predicate text (`where`, from `buildPredicate()`) | Still assembled only from a fixed vocabulary of clause fragments chosen in code — now up to three independent fragments instead of two. No request value is ever concatenated into the clause text; only bound parameters carry values. This is F03/F04's established discipline, now exercised by a second predicate shape composing with the first, exactly as AS-F03-01 anticipated | **S4** |
| Search text echoed in the no-results heading (`No bookmarks match "<q>"`) | Rendered through Angular interpolation only — never `[innerHTML]` — so a `<script>`-shaped `q` is inert text on screen, not executed markup (F05-AC6) | **S3** |

**Not applicable in F05:** no new output surface beyond the no-results heading, which S3 already covers above; F05 adds no new input type beyond `q` itself.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant SB as web (SearchBox)
  participant W as web (BookmarksStore + BookmarkList)
  participant R as api routes/bookmarks
  participant S as bookmark-service
  participant Q as list-query (buildPredicate)
  participant D as data/bookmark-repository

  U->>SB: Type in the search field
  SB->>SB: hasText.set(value.length > 0) -- #qx shows/hides immediately
  SB->>SB: reset 250ms debounce timer (LD-04)
  Note over SB: debounce settles
  SB->>W: store.setSearchText(value)
  W->>W: search.set(value); page.set(1); bump listRequestToken (LD-05)
  W->>R: GET /api/bookmarks?q=&tag=&page=1&size=
  R->>S: list({ page, size, tag, q })
  S->>S: normalizeTagFilterValue(tag); normalizeSearchValue(q)
  S->>Q: buildPredicate({ tag: normalizedTag, q: normalizedQ })
  Q-->>S: { where: "... [EXISTS ...] [LIKE ... ESCAPE '\\']", params } (F05-AC1-AC6, AC9, AC11)
  S->>D: countWhere(where, params); listPage(...); listTagsForBookmarks(...)
  D-->>S: total, rows + full tags[] per row
  S-->>R: { items, total, page, size }
  R-->>W: 200
  alt list response token still current
    W-->>U: countText (N of M, AC10), cards, or (per corrected precedence)<br/>all-empty / search no-results (AC7, LD-06) / tag-empty
  else superseded (F05-AC13, EC1)
    W-->>W: response discarded
  end

  opt User activates #qx
    U->>SB: Click/activate Clear search
    SB->>SB: cancel pending debounce timer; clear native input; hasText.set(false)
    SB->>W: store.clearSearch()
    W->>W: search.set(''); page.set(1); bump listRequestToken
    W->>R: GET /api/bookmarks?tag=&page=1&size=  (no q)
    R-->>W: 200
    W-->>U: list/empty state recomputed with no search predicate
  end
```

## 11. Test Hooks

- **`buildPredicate({ tag, q })`** exported as a pure function from `list-query.js` — table tests assert all four shapes (neither / tag only / `q` only / both), confirming F04's existing `{ tag: 'research' }` assertion is byte-identical after the LD-01 refactor, and that the `q`-only and combined shapes produce the exact `{ where, params }` F05-AC1/AC2/AC9 depend on, with no database involved.
- **`normalizeSearchValue(raw)`** exported and pure — a table test covers a plain string, mixed case, leading/trailing whitespace, a 210-character string (asserting the 200-character cap, F05-EC2), `''`, `'   '`, `undefined`, `null`, a non-string, and an array (the repeated-query-parameter shape), asserting every non-matching input normalizes to `null` rather than throwing.
- **`bookmark-service.list({ page, size, tag, q })`** is tested directly against a real `:memory:` schema seeded with bookmarks carrying known titles, URLs, and tags (reusing F01's `createDb({ file: ':memory:' })` pattern): title-only match, URL-only match (F05-EC4), case-insensitivity (F05-AC3), a title containing `%`/`_` matched literally against a near-miss sibling (F05-AC4, AC5), a quote/`<script>` payload matched and returned literally with the table intact (F05-AC6, mirroring the existing `injection-probe.test.js`/`tag-security-probe.test.js` pattern), search AND tag together returning only the intersection (F05-AC9, EC3), and page resetting to 1 on a search change (F05-AC10) — all without an HTTP layer.
- **An HTTP-level test, extending `bookmarks-route.test.js`'s established pattern** drives `GET /api/bookmarks?q=` end to end against a real server on a random port, including the metacharacter/quote/`<script>` probes (F05-AC4, AC5, AC6), the 210-character direct-call cap (F05-AC11, F05-EC2), and the composed `?tag=&q=` case (F05-AC9).
- **`BookmarksStore.setSearchText`/`clearSearch`** are tested with a stubbed `ApiService` (the existing F01/F03/F04 DI pattern): one fixture asserts `setSearchText()` resets `page` to 1 and calls `listBookmarks()` with the given `q`; a second resolves two stubbed responses out of order to confirm the reused `listRequestToken` discards the stale one (F05-AC13, EC1), mirroring F03's own test for the identical guard; a third asserts `countText`'s new composition (search alone, tag alone, both, neither).
- **`SearchBox`** is tested with a stubbed `BookmarksStore` and fake timers (`vi.useFakeTimers()`, the same tool already available to this codebase's Vitest/Jasmine setup): typing advances less than 250 ms without calling `setSearchText`, advancing past 250 ms calls it exactly once with the latest value, and `#qx`'s visibility toggles immediately on input without waiting for the debounce.
- **`BookmarkList`'s corrected empty-state precedence** is tested with `BookmarksStore` provided through Angular DI: `allCount() === 0` renders the all-empty state regardless of `search()`/`tagFilter()`; `search() !== ''` with `allCount() > 0` and `items().length === 0` renders the no-results state, with and without an active tag filter (asserting the conditional second button, LD-06); the existing tag-empty assertions are updated only to confirm they still render correctly now that they sit third in the branch order.
- **Deliberately not automated here, carried to `/test-phase F05-search`** per `spec.md` §4: the NFR-01 timed search measurement at the existing 1,000-record seed (median and max, recorded alongside F03's and F04's own measurements), and F05-AC12's manual keyboard walkthrough of the search field and its clear control.

## 12. Architecture Impact

**None.** `hld.md` v2, `data-model.md` v3, and `component-map.json` v1 already describe everything this feature needs: `data-model.md` §3 already names the search predicate's exact shape (`(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')`), `like-escape.js` already exists with escaping reserved for this feature, and both component paths are unchanged. No entity, field, index, invariant, or component path is added, changed, or removed outside what §3 already lists.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; this LLD precedes every line of F05 code |
| P2 Human approval gates | pass | LD-01…LD-06 were each put to dev-1 as an option table and answered "Go with all recommendations" on 2026-10-01 |
| P3 Honesty over polish | pass | Nothing here is claimed as verified; every outcome is stated as what `/test-phase F05-search` must observe |
| P4 Simplicity first | pass | No new table, no new index, no client-side caching beyond the reused `listRequestToken`, AND-only composition with the tag filter (AS-F05-01), no persistence of the search text (AS-F05-02). LD-01 option B and LD-05 option B were rejected on exactly the drift-risk grounds F04-RK1/F05-RK1 named |
| P5 Incremental delivery | pass | `tasks.md` orders `api` before `web`; every task leaves the app buildable and runnable |
| P6 Single source of truth | pass | `buildPredicate()` is extended a second time rather than duplicated; the stale-response guard is reused, not copied (LD-05, directly resolving F05-RK1); `escapeLikePattern()` is reused, not reimplemented |
| P7 Measurable requirements | pass | §4/§6/§8 give every AC an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute |
| Q1 Every AC testable | pass | §11 names the seam for each; the NFR-01 measurement and the AC12 keyboard walkthrough are documented manual/measured procedures, which Q1/Q6 permit |
| Q2 Tests executed | n/a | No test has run yet; nothing here records a result |
| Q3 Zero lint/build errors | pass (planned) | Each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (unchanged scope); `list-query.js`'s extension sits inside it |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | pass | NFR-01's search half is explicitly **not** claimed here — measured in `/test-phase F05-search` against the existing 1,000-record seed, never estimated |
| S1 Validation at the boundary | pass | `normalizeSearchValue` runs in the service, not the client; a direct `curl` against the API gets the same normalization and the same "never an error" behavior |
| S4 Parameterized queries | pass | §5: `q`'s escaped pattern is always a bound parameter; `where` text assembled only from a fixed vocabulary, never from request input |
| S6 Search text as data | pass | F05 is this clause's primary implementer: §9 asserts `q` is escaped by `escapeLikePattern()` and bound with an explicit `ESCAPE` clause, never interpreted as a pattern or as markup |
| U1 Keyboard-operable, visible focus | pass | §6: native `<input>`/`<button>` throughout the search box and the no-results actions; the existing `:focus-visible` outline applies unchanged |
| U2 Labelled controls, errors as text | pass | `#q` carries an associated visually-hidden `<label for="q">`; `#count` remains `aria-live` text |
| U3 Empty/loading/error states | pass | F05-AC7 (no-results) is new; F05-AC8 explicitly reuses F03's all-empty state rather than duplicating it; F03's loading/error states are unchanged and not duplicated |
| U4 Destructive actions | n/a | F05 performs no destructive action |
| U5 Actionable errors | n/a | F05 introduces no new user-facing error message (§7) |
| U6 Approved UX reference | pass | §6: the search field, `#qx`, the no-results copy and its conditional second action, and the corrected `!n ? 'none' : q ? 'search' : 'tag'` precedence are all ported verbatim from `docs/mockup.html`. The one already-established ASCII-punctuation deviation continues unchanged; no new deviation is declared |
| A1 Local, no paid service | pass | Same single Express process; no new outbound call |
| A2/A5 Persistence | pass | Read-only feature; reuses the existing SQLite file and indexes, no schema change |
| A4 Component map | pass | Every file in §3 and `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1 |
| D1 Synthetic data | pass | Every search term and title named in this document is a generic word or an `example.com`-family address, matching `spec.md` |
| D2/D3 Licensing | pass | No new dependency added |
| E1 Evidence | pass | This session's material interactions are logged per the `evidence-logging` skill |
| E3 No artifact disagrees | pass | Nothing here contradicts `hld.md` v2 or `data-model.md` v3; §12 confirms no architecture change |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, `tasks.md` written alongside | `/design-feature F05-search` CREATE mode; LD-01…LD-06 (clause-array `buildPredicate()` refactor, `escapeLikePattern()`-based LIKE assembly inside `buildPredicate()`, a separate `normalizeSearchValue()`, component-owned debounce mirroring `TagInput`, reuse of the existing `listRequestToken` guard, and the reference's own conditional no-results actions) all answered "Go with all recommendations" by dev-1 in one round. The LLD also records a corrected empty-state branch order in `BookmarkList` (`store.allCount() === 0` checked first), closing a latent precedence gap left open since F04 | design |
