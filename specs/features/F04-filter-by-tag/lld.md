# F04: Filter by Tag (Low-Level Design)

**Feature ID:** F04-filter-by-tag
**Status:** approved — LD-01…LD-06 accepted by dev-1 ("Accept Recommendation") 2026-10-01; design gate approved 2026-10-01
**Spec version:** 1, approved 2026-10-01
**HLD version:** 2
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F04 code exists yet. Every "the code will…" statement is an instruction to `/build-feature`; every expected outcome is checked for the first time in `/test-phase F04-filter-by-tag`.

## 1. Design Overview

F04 is the first feature to extend `list-query.js`'s `buildPredicate()` beyond its F03-only `deleted_at IS NULL` constant — exactly the extension point AS-F03-01 and `data-model.md` §3 reserved. A tag filter adds one `EXISTS` subquery against the already-approved `ix_bookmark_tag_lookup(tag_id, bookmark_id)` index; `countWhere` and `listPage` need no change at all, because both already consume whatever `buildPredicate()` returns.

On `web`, a new `TagRail` component renders the `nav#tags` sidebar (`docs/mockup.html`'s `renderTags()`), reusing `GET /api/tags` — already shipped by F01/F02/F03 — for its names and counts. A new `GET /api/bookmarks/count` route gives the "N of M" count (F04-AC12) and the rail's "All bookmarks" button an unfiltered total that stays correct independently of whatever tag filter is currently applied. `BookmarkList`'s existing per-card tag chips (rendered, unwired, since F03) become the second way to select a tag (F04-AC2); the rail and the count both refresh after every list reload, which is what resolves F04-RK1 and lets EC17's rail-drops-the-tag / filter-falls-back-to-All-bookmarks behavior actually happen.

**Out of scope, unchanged from `spec.md` §5:** multi-tag selection (AS-F04-01), combining the tag filter with search (F05), creating/renaming/deleting tags (F02), the delete action itself (F07), persisting the filter across a reload (AS-F04-02).

## 2. Alternatives Considered

All six decisions were presented to dev-1 with option tables on 2026-10-01 and answered "Accept Recommendation."

### LD-01 `buildPredicate()`'s extended signature

| Option | Pros | Cons |
|---|---|---|
| **A: `buildPredicate({ tag } = {})`** — an object parameter; `tag` is already normalized by the caller, `null`/absent means no filter | Matches `list-query.js`'s own comment reserving this function for F04's and F05's predicates; self-documenting; F05 adds its `q` parameter the same way without a second signature change | One more line of destructuring for a single value today |
| B: `buildPredicate(tagOrNull)` — positional | Slightly less code today | F05 then has to choose between a second, order-dependent positional parameter or a breaking signature change once two predicates exist together |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** a small amount of structure ahead of its second use, in exchange for F05 never needing to touch this signature again.
**Challenge applied:** *at 1,000 records?* No change — the `EXISTS` subquery still runs through `ix_bookmark_tag_lookup`, an indexed join, not a scan; this is the predicate NFR-01 measures. *On restart?* Read-only path, unaffected. *Keyboard-only?* Unaffected — a data-access decision.

### LD-02 Where the tag-filter value is normalized

| Option | Pros | Cons |
|---|---|---|
| **A: a new, separate `normalizeTagFilterValue(raw)` in `list-query.js`** — trim + lowercase only, never rejects; any input, even nonsense, simply matches nothing (F04-AC8) | `tag-service.js` (F02, already tested, 96.93%+ covered) stays completely untouched; co-located with the one function that consumes it | A second, one-line "trim+lowercase" exists alongside `tag-service.js`'s own normalization step |
| B: extract a shared `normalizeTagName()` out of `tag-service.js`, reused by both storage validation and the filter | One normalization implementation (P6) | Edits F02's already-tested file for a one-line gain; storage normalization (strict, rejects on length/charset) and filter normalization (lenient, never rejects) are different concerns that would share one name, risking a reader assuming the filter also enforces charset/length when it must not (F04-AC7's whole point is that it never errors) |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** a second, trivial normalization implementation, in exchange for never touching F02's tested validation file and never conflating two genuinely different rules under one name.
**Challenge applied:** *at 1,000 records?* N/A, a string operation on one query parameter. *On restart?* N/A. *Keyboard-only?* N/A — server-side only.

### LD-03 Tag-rail and unfiltered-count reload cadence (F04-RK1, EC17)

| Option | Pros | Cons |
|---|---|---|
| **A: reload the tag rail (`GET /api/tags`) and the unfiltered total (`GET /api/bookmarks/count`) every time `loadList()` succeeds** | The rail, the active filter, and the filtered list are always read from the same moment, directly resolving F04-RK1's "two independent sources of truth" risk; EC17's fallback (a tag's count reaches zero → drop it from the rail → clear an active filter on it) is checked on every reload rather than only at startup | One extra pair of cheap, indexed queries per list reload (every page click, every tag toggle, every page-size change) |
| B: load the rail once at startup only | Fewer queries | Counts go stale after the very first save or (once F07 ships) delete; EC17's fallback would never actually be exercised in this app's lifetime, since nothing ever re-checks it |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** two more indexed, sub-millisecond queries per list reload, in exchange for the rail and the active filter never silently disagreeing with what the list actually shows.
**Challenge applied:** *at 1,000 records?* `GET /api/tags` and the new count route both run through existing indexes (`ux_tag_name`'s `GROUP BY`/`HAVING` query is unchanged from F01/F02/F03; `countLive()` reuses `countWhere` on `ix_bookmark_list`) — no new cost class at volume. *On restart?* N/A, client-driven reload. *Keyboard-only?* Unaffected — a data-freshness decision, not an interaction one.

### LD-04 Source of the unfiltered total ("N of M bookmarks", the rail's "All bookmarks" count)

| Option | Pros | Cons |
|---|---|---|
| **A: a new `GET /api/bookmarks/count` route** → `{ total }`, backed by a one-line `bookmark-service.countLive()` that reuses `buildPredicate()` (no `tag`) + the existing `countWhere()` | Always accurate, independent of whatever tag filter is currently applied; zero new business logic — it is F03's own count path with no predicate argument; no architecture change | One more route (not part of `component-map.json`'s declared smoke checks — optional, not required by A4) |
| B: cache the client's last *unfiltered* `loadList()` total, add no new route | No new endpoint | Goes stale the instant a bookmark is added or removed while a tag filter stays active — precisely the staleness class F04-RK1 names as the risk to close, not reproduce |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** one additional, very small route, in exchange for an unfiltered count that can never drift from the database's actual live-row total.
**Challenge applied:** *at 1,000 records?* `countLive()` is `COUNT(*) WHERE deleted_at IS NULL` against `ix_bookmark_list` — the same index-satisfied count F03 already measures under NFR-01. *On restart?* N/A, read-only. *Keyboard-only?* N/A — no new UI control, only new data behind the existing count region.

### LD-05 Component structure for the tag rail

| Option | Pros | Cons |
|---|---|---|
| **A: a new `features/tag-rail/` component**, injecting `BookmarksStore` directly — the same pattern `BookmarkForm` and `BookmarkList` already use | Consistent with the codebase's one established state-access pattern; isolated and independently testable | One more folder |
| B: inline the rail's markup directly into `app.html`/`app.ts` | Fewer files | Would be the only feature region whose markup lives in the shell instead of its own component — a second structural pattern the codebase does not otherwise have, for no requirement that asks for it (P4) |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** one more component folder, in exchange for matching every other feature region's structure exactly.

### LD-06 Where the active-filter chip (`Tag: research` + `Clear tag filter`) renders

`docs/mockup.html` nests its `#af` active-filter chip inside `main`'s `.meta` div, directly beside `#count` — not inside `nav#tags`.

| Option | Pros | Cons |
|---|---|---|
| **A: render it inside `BookmarkList`**, next to the count region, matching the mockup's DOM grouping exactly | Exact U6 conformance with no declared deviation needed; `BookmarkList` already injects `BookmarksStore` and already owns `#count` | — |
| B: render it inside `TagRail` instead | One fewer cross-component concern to coordinate | Deviates from the mockup's own DOM structure (`#af` is a sibling of `#count`, inside `main`, not inside `nav#tags`) for no stated reason — would need a declared U6 deviation this design does not otherwise require |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation").
**Trade-off accepted:** none of substance — A is strictly the closer match to the reference.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web` (both `workspaceRoot: "."`).

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/services/list-query.js` (changed) | `buildPredicate({ tag } = {})` (LD-01) adds one `EXISTS` subquery against `bookmark_tag`/`tag` when `tag` is a non-null string; unchanged (F03's constant) when absent. New `normalizeTagFilterValue(raw)` (LD-02): trim + lowercase, `null` for anything that is not a non-empty string after trimming — never throws, never rejects |
| `api` | `app/api` | `src/services/bookmark-service.js` (changed) | `list({ page, size, tag })` normalizes `tag` via `normalizeTagFilterValue()` and threads it into `buildPredicate()`. New `countLive()` — `buildPredicate()` with no `tag`, through the existing `countWhere()` (LD-04) |
| `api` | `app/api` | `src/routes/bookmarks.js` (changed) | `GET /bookmarks` now also reads `req.query.tag`, passed through to `service.list()` unvalidated, exactly like `page`/`size` (`hld.md` §5 — the route still does no clamping or validation itself). New `router.get('/bookmarks/count', …)` → `res.json({ total: service.countLive() })` |
| `api` | `app/api` | `test/*.test.js` (new/changed) | Vitest specs — see §11 |
| `web` | `app/web` | `src/app/core/models.ts` (changed) | `TagWithCount { id, name, bookmark_count }` (the existing, unchanged `GET /api/tags` shape, now named); `CountBookmarksResponse { total }` |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | `listTags(): Promise<TagWithCount[]>` → `GET /api/tags` (no `prefix`); `countBookmarks(): Promise<CountBookmarksResponse>` → `GET /api/bookmarks/count`; `listBookmarks(page, size, tag?)` — `tag` appended to the query params only when non-null |
| `web` | `app/web` | `src/app/core/tag-hue.ts` (new) | `tagHue(name): number` — the stable per-tag hash `BookmarkList` already has inline, extracted so `TagRail`'s dots and `BookmarkList`'s chips derive the same colour for the same tag name (shared, not duplicated) |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (changed) | New signals `tagFilter` (`string \| null`), `tagRail` (`readonly TagWithCount[]`), `allCount` (`number`). New methods `selectTag(name)` (always sets, used by card chips — F04-AC2), `toggleTagFilter(nameOrNull)` (rail buttons — toggles off on a repeat activation, F04-AC4/AC5), `clearTagFilter()` (the active-filter chip's and the tag-empty state's `Clear tag filter` control — F04-AC4/AC9), `refreshTagRail()` (LD-03, its own request-token guard, the EC17 fallback). `loadList()` now also calls `refreshTagRail()` on success and passes `tagFilter()` into `api.listBookmarks()`. `countText` computed updated for the "N of M bookmarks" wording (F04-AC12) |
| `web` | `app/web` | `src/app/features/tag-rail/tag-rail.{ts,html}` (new) | `nav#tags` rail (LD-05): the "All bookmarks" button plus one button per live tag, `aria-pressed`, keyboard-operable (F04-AC1, AC11) |
| `web` | `app/web` | `src/app/features/bookmark-list/bookmark-list.{ts,html}` (changed) | Card tag chips become `<button>`s calling `store.selectTag(tag)` (`aria-label="Filter by tag <t>"`, F04-AC2), using the extracted `tagHue()`. The active-filter chip renders beside `#count` (LD-06, F04-AC2/AC4/AC5). A new tag-empty branch (F04-AC9) renders ahead of F03's existing "no bookmarks yet" empty state when `store.tagFilter()` is set and `store.items().length === 0` |
| `web` | `app/web` | `src/app/app.html`, `src/app/app.ts` (changed) | Mount `<app-tag-rail />` as a sibling of `<main>` inside `.wrap`, matching `docs/mockup.html`'s `<div class="wrap"><nav id="tags">…</nav><main>…</main></div>` structure |
| `web` | `app/web` | `src/app/core/icons.ts` (changed) | Adds the `tag` icon path (the "All bookmarks" button's icon when no tag colour dot applies), ported from `docs/mockup.html`'s `P.tag` |
| `web` | `app/web` | `src/styles.css` (changed) | Ports `.tags`, `.tg`, `.tg[aria-pressed=true]`, `.tg .n`, `.dot`, and the `>=1024px` `.wrap`/`.tags` sticky-column rule from `docs/mockup.html`; ports the `#af .chip` active-filter chip rule |
| `web` | `app/web` | `src/app/state/bookmarks.store.spec.ts` (changed) | New tests for `selectTag`/`toggleTagFilter`/`clearTagFilter`/`refreshTagRail` (including the EC17 fallback and the F04-EC4 stale-response guard) and the updated `countText` |

No file outside these paths is touched. No entity, field, index, or invariant is added to `data-model.md`; `ix_bookmark_tag_lookup(tag_id, bookmark_id)` already exists for exactly this predicate.

**A routing note for later features:** `GET /bookmarks/count` is a literal path registered before any `:id`-shaped route exists. Express matches routes in registration order, not by specificity, so F06/F07 (which will add `GET`/`PUT`/`DELETE /bookmarks/:id`) must keep `/bookmarks/count` registered ahead of any `/bookmarks/:id` route, or `count` would be parsed as an `:id` value. Recorded here as a build-order constraint for those features' own LLDs, not a defect in this one.

## 4. API / Interface Contract

Error bodies use the shape fixed in `hld.md` §8 (unchanged by F04 — this feature introduces no new error code).

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `GET` | `/api/bookmarks` | `page`, `size` (F03, unchanged), plus new `tag` — optional, any string, never validated as 400 | `200 { items: BookmarkListItem[], total, page, size }` — `items` carries each matched row's **full** `tags` array, not only the matched tag (F04-AC3); `total`/`page`/`size` reflect the filtered result set | `500 STORAGE_ERROR` only (unchanged from F03) |
| `GET` | `/api/bookmarks/count` (new) | none | `200 { total: number }` — the live (unfiltered) bookmark count, via `buildPredicate()` with no `tag` | `500 STORAGE_ERROR` |
| `GET` | `/api/tags` | none (unchanged F01/F02/F03 shape, no `prefix`) | `200 [{ id, name, bookmark_count }]` — alphabetical, only tags with ≥1 live bookmark (F04-AC1, AC10) | `500 STORAGE_ERROR` |
| function | `buildPredicate({ tag }?)` → `{ where: string, params: unknown[] }` | `tag`: a normalized string, or absent/`null` | absent/`null` → `{ where: 'deleted_at IS NULL', params: [] }` (F03, unchanged). A string → `{ where: 'deleted_at IS NULL AND EXISTS (…)', params: [tag] }` | never throws |
| function | `normalizeTagFilterValue(raw)` → `string \| null` | `req.query.tag`, any shape | a non-empty, trimmed, lowercased string; `null` for anything else (absent, empty, whitespace-only, non-string, e.g. an array from a repeated query parameter) | never throws |
| function | `bookmark-service.list({ page, size, tag })` → `{ items, total, page, size }` | raw, possibly-invalid `page`/`size`/`tag` straight from the route | as above; `tag` normalized before `buildPredicate()` is called | never throws |
| function | `bookmark-service.countLive()` → `number` | none | the live bookmark count | never throws |
| method | `ApiService.listBookmarks(page, size, tag?)` → `Promise<ListBookmarksResponse>` | the store's current `page`/`size`/`tagFilter` signals | the parsed JSON body | rejects with the mapped `HttpErrorResponse` |
| method | `ApiService.listTags()` → `Promise<TagWithCount[]>` | none | the parsed JSON array | rejects with the mapped `HttpErrorResponse` |
| method | `ApiService.countBookmarks()` → `Promise<CountBookmarksResponse>` | none | the parsed JSON body | rejects with the mapped `HttpErrorResponse` |

**Every acceptance criterion is reachable from this table or from §6:** AC1 via `GET /api/tags` + `GET /api/bookmarks/count` + §6's rail; AC2/AC4/AC5 via §6's rail and card-chip controls plus `selectTag`/`toggleTagFilter`; AC3/AC7/AC8 via the `GET /api/bookmarks?tag=` row and `normalizeTagFilterValue`; AC6 via `tag` surviving a page-size change (store-level, §3); AC9 via §6's tag-empty state; AC10 via `GET /api/tags`'s existing `HAVING COUNT(b.id) > 0` plus `refreshTagRail()`'s EC17 fallback; AC11 via §6's keyboard contract; AC12 via the updated `countText`.

## 5. Data Access

**No entity, field, index, or invariant is added, changed, or removed.** Every table and index already exists in `data-model.md` v3.

| Entity | F04 use |
|---|---|
| `bookmark` | Read only — the page query and the count query, both filtered by `deleted_at IS NULL`, now optionally also by the tag `EXISTS` subquery |
| `tag` | Read only — matched by exact, normalized name inside the `EXISTS` subquery; also read, unchanged, by `GET /api/tags`'s `listWithLiveBookmarks()` |
| `bookmark_tag` | Read only — the `EXISTS` subquery's join target |
| `setting` | Not used |

**Indexes used:** `ix_bookmark_tag_lookup (tag_id, bookmark_id)` — `data-model.md` §3 already names this index for exactly this query shape ("which bookmarks have this tag"), reserved since F03/AD-02 and unused until now. `ix_bookmark_list (deleted_at, created_at DESC, id DESC)` continues to serve the `ORDER BY`/`LIMIT`/`OFFSET` half unchanged. `ux_tag_name` continues to serve `GET /api/tags`'s `GROUP BY`/`HAVING` unchanged.

**Queries** — prepared statements only (S4); no value is ever concatenated into SQL.

| Function | Statement (described) |
|---|---|
| `buildPredicate({ tag })` | When `tag` is present: `where = 'deleted_at IS NULL AND EXISTS (SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id WHERE bt.bookmark_id = bookmark.id AND t.name = ?)'`, `params = [tag]` — `data-model.md` §3 names this exact shape. `tag` is the already-normalized (trimmed, lowercased) value; the comparison is a plain equality against `tag.name`, which is itself always stored lowercase (INV-07), so the match is correct without any `LIKE`/`COLLATE` trick |
| `countWhere(where, params)` (F03, unchanged) | `SELECT COUNT(*) AS n FROM bookmark WHERE ${where}` — `where` now has two possible shapes instead of one, both from `buildPredicate()`'s fixed vocabulary; every value in `params` is still bound |
| `listPage({ where, params, limit, offset })` (F03, unchanged) | `SELECT … FROM bookmark WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?` — the `EXISTS` clause is part of `where`'s fixed text, `tag` travels in `params`, `limit`/`offset` remain bound integers |
| `bookmark-service.countLive()` | `buildPredicate()` with no `tag` → `countWhere(where, params)` — the exact same call F03's `list()` already makes for its own `total`, just not threaded through `clampPage`/`listPage` |

**Service orchestration (`bookmark-service.list({ page, size, tag })`):** `normalizeTagFilterValue(tag)` → `buildPredicate({ tag: normalized })` → `clampSize(size)` → `countWhere` → `computeMaxPage` → `clampPage(page, maxPage)` → `listPage(...)` → `listTagsForBookmarks(...)` (F03, unchanged — every returned row still carries its **full** tag list, F04-AC3). `total`, `page`, `size` are always the clamped values computed **against the filtered predicate**, so F04-AC6's page-1 reset on a tag/page-size change is a direct consequence of F03's existing `computeMaxPage`/`clampPage` logic, not new code.

## 6. UI Changes and States

Ported from `docs/mockup.html`'s `renderTags()`, the card's `.tl` chip buttons, and `empty('tag')` (U6).

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Tag rail** (`TagRail`, new, mounted as a sibling of `<main>`) | n/a — the rail renders from whatever `store.tagRail()`/`store.allCount()` last held; no spinner, matching the mockup | With no bookmarks saved at all, the rail shows only `All bookmarks` with a count of `0` (F04-EC2) — not an error, not an empty rail artifact | A failed `GET /api/tags` or `GET /api/bookmarks/count` degrades silently: the rail keeps its last known good state rather than showing a visible error (§8) — the rail is a navigation aid, not a requirement with its own error contract | `All bookmarks` button first (`store.allCount()`), then one button per live tag, alphabetical, each showing `t.bookmark_count` (F04-AC1) | `nav#tags`, `aria-label="Filter by tag"`; every button is a real `<button>`; `aria-pressed` on every button (`"true"` for the active selection, including `All bookmarks` when no filter is active); `Tab` reaches `All bookmarks` then every tag button in rail order; `Enter`/`Space` toggles exactly as a click would (F04-AC11) |
| **Card tag chip** (`BookmarkList`, changed from a static `<span>` to a `<button>`) | n/a | n/a (chips render only when `item.tags.length > 0`, unchanged from F03) | n/a | Activating a chip calls `store.selectTag(tag)` — always sets the filter to that tag, never toggles it off (matches the mockup's card-chip `onclick`, which is unconditional) (F04-AC2) | `aria-label="Filter by tag <t>"` (already declared in F03's LLD §6 for this exact control, now wired); keyboard-reachable like any other button |
| **Active-filter chip** (`BookmarkList`, new, beside `#count` — LD-06) | n/a | Absent entirely when `store.tagFilter()` is `null` | n/a | Renders `Tag: <name>` plus a `Clear tag filter` button when a filter is active (F04-AC2); activating `Clear tag filter` calls `store.clearTagFilter()` (F04-AC4) | The chip's text and its clear button are both real DOM text/button, not colour-only; `Clear tag filter` is `Tab`-reachable and keyboard-activatable (F04-AC11) |
| **Tag-empty state** (`BookmarkList`, new, checked before F03's existing empty state) | n/a | Renders when `store.tagFilter()` is set and `store.items().length === 0`: heading `No bookmarks tagged "<tag>"`, text `Remove the filter to see everything you have saved.`, and a primary `Clear tag filter` button (F04-AC9, EC13) | n/a | n/a (this branch is itself the "empty" outcome for a filtered, zero-result list) | The primary action carries the exact same clear behavior as the active-filter chip's — one function, two call sites (`store.clearTagFilter()`) |
| **Count region** (`#count`, existing, F03) | unchanged (F03's loading text) | unchanged | unchanged | Text changes to `N of M bookmarks` whenever `store.tagFilter()` is set, reading `store.total()` (the filtered count) and `store.allCount()` (the unfiltered count); unchanged `N bookmark`/`N bookmarks` wording when no filter is active (F04-AC12) | `aria-live="polite"`, unchanged from F03 |

**Destructive actions (U4):** none in F04. Clearing a filter is a reversible, non-destructive view-state change, not an action on stored data.

### U6 deviations — declared, with reasons

None. The rail, its `aria-pressed` toggle semantics, the per-card clickable tag chip, the active-filter chip's placement beside `#count`, the `"N of M bookmarks"` wording, and the tag-empty state's copy are all ported verbatim from `docs/mockup.html`'s `renderTags()`, `card()`, the `render()` function's `#af`/`#count` logic, and `empty('tag')`.

## 7. Validation Rules

F04 introduces no user-facing validation message. The `tag` query parameter normalizes silently and, if it matches nothing, simply returns zero rows — this silence is itself the rule F04-AC7 and F04-AC8 assert.

| Field | Rule | User message |
|---|---|---|
| `tag` (query parameter) | Trimmed and lowercased; any non-string, empty, or whitespace-only value is treated as "no filter" | *(none — the response is always `200`; an unrecognized value simply matches zero rows, F04-AC8)* |

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `tag` value with different case or surrounding whitespace (F04-AC7, F04-EC1) | `normalizeTagFilterValue` | Matched identically to the stored lowercase, trimmed name — not an error, not a different result set |
| `tag` value matching no stored tag at all, or a tag no longer in live use (F04-AC8) | `buildPredicate`'s `EXISTS` subquery simply matches zero rows | `200 { items: [], total: 0, page: 1, size: <default> }` — never `400`/`500` |
| `tag` query parameter sent more than once (becomes an array in Express's query parser) | `normalizeTagFilterValue`'s `typeof raw !== 'string'` check | Treated as "no filter" — never a crash, never a 500 |
| A tag's live-bookmark count reaches zero while it is the active filter (F04-AC10, EC17) | `BookmarksStore.refreshTagRail()`, after every successful `loadList()` | The tag is simply absent from the next `GET /api/tags` response (unchanged query); if it was the active filter, `refreshTagRail()` detects its absence and calls `clearTagFilter()`, which re-issues `loadList()` with no `tag` — the view falls back to `All bookmarks` rather than continuing to request a tag with zero results forever |
| Two tag selections (or any two list-changing actions) in rapid succession (F04-EC4) | `BookmarksStore`'s existing `listRequestToken` (F03, unchanged) guards `items`/`total`/`page`/`size`; a new `tagRailRequestToken` guards `tagRail`/`allCount` the same way | Only the most recently issued request's result is ever applied; an earlier, slower response is discarded on arrival |
| `GET /api/tags` or `GET /api/bookmarks/count` fails (network error or non-2xx) | `refreshTagRail()`'s catch branch | Degrades silently: `tagRail`/`allCount` keep their last known good values. No visible error — the rail is a navigation convenience, and `#count`/the list region already carry F03's own error state for the primary list fetch |
| Database failure on the new `countLive()` path, or on the extended `countWhere`/`listPage` calls | repository → the existing `app.js` error middleware (unchanged from F01/F03) | `500 STORAGE_ERROR`, the existing safe message; full detail to the server console only (U5) |

## 9. Security Considerations

One row per untrusted input F04 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `tag` query parameter | Normalized (trim, lowercase) by `normalizeTagFilterValue()` **before** it is ever used; bound as a single parameter into the `EXISTS` subquery's equality comparison — never a `LIKE` pattern, never string-built into the `WHERE` clause text itself. Any value at all produces a `200`, never a `400` or an unbounded query (F04-AC7, AC8) | **S1**, S4, NFR-04 |
| Internal predicate text (`where`, from `buildPredicate()`) | Still assembled only from a fixed vocabulary of clause fragments chosen in code — now two shapes (with/without the `EXISTS` clause) instead of one. No request value is ever concatenated into the clause text; only bound parameters carry values. This is F03's established discipline, now exercised for the first time by a second predicate shape, exactly as AS-F03-01 anticipated | **S4** |
| Tag name (rendered in the rail, the card chip's `aria-label`, and the active-filter chip) | Read from `tag`/`bookmark_tag`, rendered through Angular interpolation only — never `[innerHTML]` | **S3** |

**Not applicable in F04:** search text (S6) — F05 owns it; F04 writes no `LIKE` pattern anywhere, so there is nothing for `escapeLikePattern()` to do here. The tag-filter predicate is an **equality** match, not a pattern match, so S6's escaping convention does not apply to it (NFR-04).

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (TagRail + BookmarkList + BookmarksStore)
  participant R as api routes/bookmarks, routes/tags
  participant S as bookmark-service
  participant Q as list-query (buildPredicate)
  participant D as data/bookmark-repository, tag-repository

  U->>W: Activate a rail button, or a card's tag chip
  W->>W: selectTag(tag) or toggleTagFilter(tag) -> tagFilter.set(...); page.set(1)
  W->>W: bump listRequestToken (F03, unchanged)
  W->>R: GET /api/bookmarks?tag=&page=1&size=
  R->>S: list({ page, size, tag })
  S->>S: normalizeTagFilterValue(tag)
  S->>Q: buildPredicate({ tag: normalized })
  Q-->>S: { where: "... EXISTS (...)", params: [tag] } (F04-AC3, AC7, AC8)
  S->>D: countWhere(where, params); listPage(...); listTagsForBookmarks(...)
  D-->>S: total, rows + full tags[] per row
  S-->>R: { items, total, page, size }
  R-->>W: 200
  alt list response token still current
    W-->>U: countText (N of M, AC12), cards, or the tag-empty state (AC9) if items is empty
  else superseded (F04-EC4)
    W-->>W: response discarded
  end

  W->>W: bump tagRailRequestToken; refreshTagRail() (LD-03)
  par
    W->>R: GET /api/tags
    R->>D: listWithLiveBookmarks() (unchanged query)
    D-->>R: [{ id, name, bookmark_count }]
    R-->>W: 200
  and
    W->>R: GET /api/bookmarks/count
    R->>S: countLive()
    S->>Q: buildPredicate() (no tag)
    S->>D: countWhere(where, params)
    D-->>S: total
    S-->>R: { total }
    R-->>W: 200
  end
  alt tagRail response token still current
    W->>W: tagRail.set(tags); allCount.set(total)
    alt active tag filter is absent from the new tagRail (EC17, F04-AC10)
      W->>W: clearTagFilter() -> re-issues loadList() with no tag
    end
  else superseded (F04-EC4)
    W->>W: response discarded
  end
```

## 11. Test Hooks

- **`buildPredicate({ tag })`** exported as a pure function from `list-query.js` — a test asserts both shapes (`{ tag: undefined }` and `{ tag: 'research' }`) produce the exact `{ where, params }` F04-AC3/AC7/AC8 depend on, with no database involved.
- **`normalizeTagFilterValue(raw)`** exported and pure — a table test covers `'Research'`, `'  research  '`, `''`, `undefined`, `null`, a non-string, and an array (the repeated-query-parameter shape), asserting every non-matching input normalizes to `null` rather than throwing.
- **`bookmark-service.list({ page, size, tag })`** and **`countLive()`** are tested directly against a real `:memory:` schema seeded with bookmarks carrying known tags (reusing F01's `createDb({ file: ':memory:' })` pattern), so F04-AC3/AC6/AC8/AC10's exact row-set and count assertions run without an HTTP layer.
- **An HTTP-level test (`tags-filter-route.test.js`, extending `list-route.test.js`'s established pattern)** drives `GET /api/bookmarks?tag=` and `GET /api/bookmarks/count` end to end against a real server on a random port, including the case/whitespace variants (F04-AC7) and the no-match case (F04-AC8).
- **`BookmarksStore.selectTag`/`toggleTagFilter`/`clearTagFilter`/`refreshTagRail`** are tested with a stubbed `ApiService` (the existing F01/F03 DI pattern): a fixture asserts the EC17 fallback (a tag absent from a `listTags()` stub response while it is the active filter triggers `clearTagFilter()` and a second `loadList()` call), and a second fixture resolves two stubbed responses out of order to assert `tagRailRequestToken` discards the stale one (F04-EC4), mirroring F03's own `listRequestToken` test.
- **`tagHue(name)`** is pure and unit-tested without rendering either component, the same way `relative-time.ts` and `url-display.ts` were tested in F03.
- **`TagRail` and `BookmarkList`'s new controls** are tested with `BookmarksStore` provided through Angular DI — the rail's `aria-pressed` state, the card chip's `aria-label`, and the active-filter/tag-empty states' `Clear tag filter` wiring are all assertable without a running server.
- **Deliberately not automated here, carried to `/test-phase F04-filter-by-tag`** per `spec.md` §4: the NFR-01 timed tag-filter measurement at the existing 1,000-record seed, and F04-AC11's manual keyboard walkthrough of the rail and the active-filter chip.

## 12. Architecture Impact

**None.** `hld.md` v2, `data-model.md` v3, and `component-map.json` v1 already describe everything this feature needs: the `tag`/`bookmark_tag` tables, `ix_bookmark_tag_lookup`, and both component paths. No entity, field, index, invariant, or component path is added, changed, or removed outside what §3 already lists. The one new route (`GET /api/bookmarks/count`) is a function of the existing `api` component, not a new component or a schema change.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; this LLD precedes every line of F04 code |
| P2 Human approval gates | pass | LD-01…LD-06 were each put to dev-1 as an option table and answered "Accept Recommendation" on 2026-10-01 |
| P3 Honesty over polish | pass | Nothing here is claimed as verified; every outcome is stated as what `/test-phase F04-filter-by-tag` must observe |
| P4 Simplicity first | pass | No new table, no new index, no client-side caching of the rail beyond its own signals, single-select only (AS-F04-01), no persistence of the filter (AS-F04-02). LD-03 option B and LD-06 option B were rejected on simplicity/correctness grounds, not added complexity |
| P5 Incremental delivery | pass | `tasks.md` orders `api` before `web`; every task leaves the app buildable and runnable |
| P6 Single source of truth | pass | `buildPredicate()` is extended, not duplicated — exactly the function AS-F03-01 reserved for this; `tagHue()` is extracted once rather than kept as two inline copies |
| P7 Measurable requirements | pass | §4/§6/§8 give every AC an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute |
| Q1 Every AC testable | pass | §11 names the seam for each; the NFR-01 measurement and the AC11 keyboard walkthrough are documented manual/measured procedures, which Q1/Q6 permit |
| Q2 Tests executed | n/a | No test has run yet; nothing here records a result |
| Q3 Zero lint/build errors | pass (planned) | Each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (unchanged scope); `list-query.js`'s extension and `bookmark-service.js`'s `countLive()` both sit inside it |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | pass | NFR-01's tag-filter half is explicitly **not** claimed here — measured in `/test-phase F04-filter-by-tag` against the existing 1,000-record seed, never estimated |
| S1 Validation at the boundary | pass | `normalizeTagFilterValue` runs in the service, not the client; a direct `curl` against the API gets the same normalization and the same "never an error" behavior |
| S4 Parameterized queries | pass | §5: `tag` is always a bound parameter; `where` text assembled only from a fixed vocabulary, never from request input |
| S6 Search text as data | n/a | F04 writes no `LIKE` pattern; the tag predicate is an equality match (NFR-04), not a pattern match — F05 owns S6 for the search feature |
| U1 Keyboard-operable, visible focus | pass | §6: native `<button>`s throughout the rail, the card chips, and the active-filter/tag-empty `Clear tag filter` controls; the existing `:focus-visible` outline applies unchanged |
| U2 Labelled controls, errors as text | pass | `aria-pressed` conveys the rail's and chip's state as more than colour; `#count` remains `aria-live` text |
| U3 Empty/loading/error states | pass | F04-AC9 (tag-empty) is new; F03's loading/error/no-bookmarks-at-all states are unchanged and not duplicated |
| U4 Destructive actions | n/a | F04 performs no destructive action |
| U5 Actionable errors | n/a | F04 introduces no new user-facing error message (§7) |
| U6 Approved UX reference | pass | §6: the rail, the card-chip toggle semantics, the active-filter chip's placement, the count wording, and the tag-empty state's copy are all ported verbatim from `docs/mockup.html`. No deviation is declared |
| A1 Local, no paid service | pass | Same single Express process; no new outbound call |
| A2/A5 Persistence | pass | Read-only feature; reuses the existing SQLite file and indexes, no schema change |
| A4 Component map | pass | Every file in §3 and `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1 |
| D1 Synthetic data | pass | Every tag named in this document is a generic topic word already used in `spec.md` |
| D2/D3 Licensing | pass | No new dependency added |
| E1 Evidence | pass | This session's material interactions are logged per the `evidence-logging` skill |
| E3 No artifact disagrees | pass | Nothing here contradicts `hld.md` v2 or `data-model.md` v3; §12 confirms no architecture change |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, `tasks.md` written alongside | `/design-feature F04-filter-by-tag` CREATE mode; LD-01…LD-06 (extended `buildPredicate()` signature, a separate filter-value normalizer, rail/count reload on every `loadList()`, a new unfiltered-count route, a new `TagRail` component, the active-filter chip's placement beside `#count`) all answered "Accept Recommendation" by dev-1 in one round | design |
