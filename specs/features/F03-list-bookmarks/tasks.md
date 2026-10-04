# F03: List Bookmarks (Tasks)

**LLD version:** 1 (draft, pending design gate)
**Owner:** dev-1

> One task at a time. Each task ends with the build-verify loop (format → lint → build → start → smoke → tests). Max **3** fix attempts, then stop and ask the human.

**Commands, resolved from `specs/architecture/component-map.json` v1:**

| | `api` (`app/api`) | `web` (`app/web`) |
|---|---|---|
| install | `npm ci` | `npm ci` |
| format | `npx prettier --write .` | `npx prettier --write .` |
| lint | `npx eslint . --fix` | `npx eslint . --fix` |
| build | `null` (interpreted JavaScript, no build step) | `npx ng build` |
| start | `node src/server.js` | `npx ng serve` |
| test | `npx vitest run` | `npx ng test` |
| smoke | `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` → 200, at `http://localhost:3000` | `GET /` → 200 at `http://localhost:4200` |

Tasks T01–T03 are `api`; T04–T07 are `web`; T08 spans both.

## Tasks

| Task ID | Description | Component id | Files | Covers AC | Done when | Status |
|---|---|---|---|---|---|---|
| F03-T01 | Pagination clamp helpers: `PAGE_SIZES`, `DEFAULT_SIZE`, `clampSize(raw)`, `clampPage(raw, maxPage)`, `computeMaxPage(total, size)` — pure functions, never throw | `api` | `app/api/src/lib/pagination.js`, `app/api/test/pagination.test.js` | F03-AC5, F03-AC6, F03-EC2 | `npx vitest run` passes with: every listed input in F03-AC5 (`size=500,7,abc`; `page=0,-1,abc`) producing the documented fallback; `computeMaxPage` exact for a total that is and is not a multiple of size (F03-EC2); `clampPage` clamping 99 down to the true last page | done |
| F03-T02 | Shared predicate builder and the real list query: `buildPredicate()` (AD-07, AS-F03-01); repository `countWhere(where, params)`, `listPage({ where, params, limit, offset })`, `listTagsForBookmarks(ids)`; `bookmark-service.list({ page, size })` replacing `listRecent()`/`countLive()`; remove `F01_LIST_LIMIT` | `api` | `app/api/src/services/list-query.js`, `app/api/src/data/bookmark-repository.js` (changed), `app/api/src/services/bookmark-service.js` (changed), `app/api/test/bookmark-service.test.js` (changed) | F03-AC1, F03-AC3, F03-AC6, F03-AC7 (mechanism), F03-EC1, F03-EC2 | `npx vitest run` passes with: newest-`created_at`-first ordering with `id DESC` as the tie-break proven against rows sharing one identical `created_at` instant (F03-EC1); 25 seeded rows at default size returning `size=20, page=1, items.length=20, total=25` (AC3); `page=99&size=10` against 25 rows returning `page=3` and the real 5-row remainder, not an empty array (AC6); a page with 0 matching ids never calling `listTagsForBookmarks`'s statement (an empty page short-circuits) | done |
| F03-T03 | `GET /api/bookmarks` reads `page`/`size` from the query string and passes the raw values through to `service.list()` unchanged — no clamping in the route itself | `api` | `app/api/src/routes/bookmarks.js` (changed), `app/api/test/list-route.test.js` (changed) | F03-AC5, F03-EC2, F03-EC3 | `npx vitest run` passes with: every F03-AC5 input over HTTP returning **200**, never 400; the count text inputs (0/1/2/25 bookmarks) match F03-EC3's singular/plural rule at the data layer (the UI text itself is T06's); the full declared smoke contract (`/api/health`, `/api/bookmarks`, `/api/tags`) still returns 200 | done |
| F03-T04 | Supporting `web` infrastructure: `models.ts` additions (`PAGE_SIZES`, `DEFAULT_PAGE_SIZE`, `BookmarkListItem`, `ListBookmarksResponse`); `ApiService.listBookmarks(page, size)`; `relative-time.ts` (LD-02, ported `ago()`); `url-display.ts` (bold-host helper); `icons.ts` additions (`edit`, `trash`) | `web` | `app/web/src/app/core/models.ts` (changed), `app/web/src/app/core/api.service.ts` (changed), `app/web/src/app/core/relative-time.ts`, `app/web/src/app/core/url-display.ts`, `app/web/src/app/core/icons.ts` (changed), `app/web/src/app/core/relative-time.spec.ts`, `app/web/src/app/core/url-display.spec.ts` | — (infrastructure for T05/T06) | `npx ng test` passes: `relativeTime` matches the mockup's bucket boundaries exactly (`today`/`yesterday`/`N days ago`/`N weeks ago`/`N months ago`) via an injected `now`; `displayUrl` strips a leading `www.` from the host and preserves path/query. `npx ng build` stays clean | done |
| F03-T05 | List state in the store: `items`, `total`, `page`, `size`, `listLoading`, `listError`, `countText` (F03-AC12 singular/plural), `maxPage`; `loadList()` with the LD-04 request-token guard, `changePage()`, `changePageSize()` (resets to page 1, F03-AC4), `retryList()`. `save()` calls `loadList()` on success instead of the removed `saved` signal | `web` | `app/web/src/app/state/bookmarks.store.ts` (changed), `app/web/src/app/state/bookmarks.store.spec.ts` (changed) | F03-AC1, F03-AC4, F03-AC10, F03-AC12 | `npx ng test` passes: `countText()` reads `1 bookmark` for `total=1` and `N bookmarks` otherwise (F03-AC12); `changePageSize()` sets `page` to `1` **before** calling the API (F03-AC4); resolving two fake `listBookmarks()` promises out of order leaves `items` matching only the later call's result (LD-04); `listLoading` is `true` only while a request is in flight | done |
| F03-T06 | The bookmark list and card markup: count region (`aria-live="polite"`), loading state (`aria-busy`, visible text), empty state (F03-AC2 exact copy + `addRequested` output), error state (F03-AC11 exact copy + Retry), and the card row — title link, bold host + path via `displayUrl()`, `Added <relativeTime>`, a tag-chip row only when tags exist (F03-EC5), and *Edit*/*Delete* buttons with `aria-label`s, unwired | `web` | `app/web/src/app/features/bookmark-list/bookmark-list.ts`, `app/web/src/app/features/bookmark-list/bookmark-list.html`, `app/web/src/styles.css` (changed) | F03-AC1, F03-AC2, F03-AC8, F03-AC10, F03-AC11, F03-AC12, F03-EC3, F03-EC4, F03-EC5 | `npx ng test` passes: a stubbed empty response renders the exact F03-AC2 heading/copy and an *Add bookmark* button that emits `addRequested`; a stubbed failure renders the exact F03-AC11 message and a working *Retry*; a bookmark with zero tags renders **no** tag-chip container element (F03-EC5); a bookmark with tags renders each as a plain, non-interactive `<span>` (not a `<button>`) carrying the tag text as its accessible name; both `Edit <title>` and `Delete <title>` `aria-label`s are present with no click handler bound | done |
| F03-T07 | Pagination control: labelled page-size `<select>` (10/20/50), Previous/Next `<button>`s disabled (not hidden) at the first/last page and while `listLoading`, `Page X of Y` as text | `web` | `app/web/src/app/features/bookmark-list/bookmark-list.ts` (changed), `app/web/src/app/features/bookmark-list/bookmark-list.html` (changed), `app/web/src/styles.css` (changed) | F03-AC4, F03-AC6, F03-AC9, F03-AC10 | `npx ng test` passes: changing the page-size `<select>` calls `changePageSize()` (F03-AC4); Previous is disabled on page 1 and Next is disabled on the last page, both still present in the DOM (not `hidden`); the current page is asserted as rendered **text**, not inferred from element position or style; both controls are disabled while `listLoading()` is true | done |
| F03-T08 | Wire the list into the shell: replace the F01 neutral main-region placeholder in `app.html`/`app.ts` with `<app-bookmark-list>`; call `loadList()` once on startup; wire `addRequested` to the existing `openDialog()`. Full keyboard walkthrough and the F03-AC7 restart spot check | `api`, `web` | `app/web/src/app/app.ts` (changed), `app/web/src/app/app.html` (changed) | F03-AC7, F03-AC9 | `npx ng build` and the full smoke contract pass. A recorded keyboard walkthrough shows `Tab` reaching every card's *Edit* then *Delete*, then the pagination control, in visual order, each with a visible focus indicator (F03-AC9). A restart spot check is executed and recorded: save a handful of synthetic bookmarks across two pages at `size=10`, stop the process, start it again, call `GET /api/bookmarks?page=1&size=10` and `?page=2&size=10`, and compare both pages' `items` and `total` against the pre-restart values (F03-AC7) — the full 1,000-record NFR-01 measurement stays in `/test-phase` | done |
| F03-T09 | Apply the one `/review-phase` finding accepted by dev-1 on 2026-10-01 (E-review-003): **F03-RV01** the pagination "Page X of Y" text was not an ARIA live region, so assistive-tech users got no announcement of a page change when `total` stayed the same; added `aria-live="polite"` to the `.page-text` span | `web` | `app/web/src/app/features/bookmark-list/bookmark-list.html` (changed), `app/web/src/app/features/bookmark-list/bookmark-list.spec.ts` (changed — new test) | F03-RV01 | A new `bookmark-list.spec.ts` case asserts `.page-text` carries `aria-live="polite"` even when `total` is unchanged across a page change, and `npx ng test --watch=false` passes with no regressions | done |

Status values: `todo`, `in-progress`, `done`, `blocked`.

### AC coverage check

| AC | Tasks | | AC | Tasks |
|---|---|---|---|---|
| F03-AC1 | T02, T03, T05, T06 | | F03-AC7 | T02, T08 |
| F03-AC2 | T06 | | F03-AC8 | T06 |
| F03-AC3 | T02 | | F03-AC9 | T06, T07, T08 |
| F03-AC4 | T05, T07 | | F03-AC10 | T05, T06, T07 |
| F03-AC5 | T01, T03 | | F03-AC11 | T06 |
| F03-AC6 | T01, T02, T07 | | F03-AC12 | T03, T05, T06 |

All 12 acceptance criteria are covered. Edge cases EC19 (restart mid-write, F01's own obligation) and the "filter/search stays applied" half of EC22 (F04/F05's, not reachable until those features exist) are **not** task-covered by design — `spec.md` §3 explicitly carries both forward. The NFR-01 1,000-record timed measurement is likewise carried to `/test-phase F03-list-bookmarks` per `spec.md` §4, never estimated here.

## Build-Verify Log (actual results only)

| Task | Attempt | Step (format/lint/build/start/smoke/test) | Command | Result (observed) | Action |
|---|---|---|---|---|---|
| F03-T01 | 1 | format | `npx prettier --write src/lib/pagination.js test/pagination.test.js` | 2 files formatted, 0 errors | none |
| F03-T01 | 1 | lint | `npx eslint src/lib/pagination.js test/pagination.test.js --fix` | 0 errors, 0 warnings | none |
| F03-T01 | 1 | build | n/a (api has no build step) | — | none |
| F03-T01 | 1 | test | `npx vitest run test/pagination.test.js` | 1 file, 24 tests passed | none |
| F03-T01 | 1 | test (full suite) | `npx vitest run` | 14 files, 299 tests passed | none |
| F03-T02+T03 | 1 | format | `npx prettier --write src/services/list-query.js src/data/bookmark-repository.js src/services/bookmark-service.js src/routes/bookmarks.js test/list-route.test.js test/bookmark-service.test.js` | 0 errors, files unchanged/formatted | none |
| F03-T02+T03 | 1 | lint | `npx eslint src/services/list-query.js src/data/bookmark-repository.js src/services/bookmark-service.js src/routes/bookmarks.js test/list-route.test.js test/bookmark-service.test.js --fix` | 0 errors, 0 warnings | none |
| F03-T02+T03 | 1 | build | n/a (api has no build step) | — | none |
| F03-T02+T03 | 1 | start | `node src/server.js` | `[api] TagVault API listening on http://localhost:3000` | none |
| F03-T02+T03 | 1 | smoke | `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` | 200, 200, 200 | none |
| F03-T02+T03 | 1 | smoke (clamp sanity) | `GET /api/bookmarks?page=abc&size=500` | `{"items":[],"total":0,"page":1,"size":20}` | none |
| F03-T02+T03 | 1 | test (full suite) | `npx vitest run` | 14 files, 309 tests passed | none |
| F03-T04 | 1 | format | `npx prettier --write src/app/core/models.ts src/app/core/api.service.ts src/app/core/relative-time.ts src/app/core/relative-time.spec.ts src/app/core/url-display.ts src/app/core/url-display.spec.ts src/app/core/icons.ts` | 0 errors, files formatted/unchanged | none |
| F03-T04 | 1 | lint | `npx eslint src/app/core/models.ts src/app/core/api.service.ts src/app/core/relative-time.ts src/app/core/relative-time.spec.ts src/app/core/url-display.ts src/app/core/url-display.spec.ts src/app/core/icons.ts --fix` | 0 errors, 0 warnings | none |
| F03-T04 | 1 | build | `npx ng build` | Application bundle generation complete, 7.18s | none |
| F03-T04 | 1 | test | `npx ng test` | 5 files, 66 tests passed | none |
| F03-T05 | 1 | format | `npx prettier --write src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts` | 2 files formatted | none |
| F03-T05 | 1 | lint | `npx eslint src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts --fix` | 0 errors, 0 warnings | none |
| F03-T05 | 1 | build | `npx ng build` | Application bundle generation complete, 22.07s | none |
| F03-T05 | 1 | test | `npx ng test` | 1 file failed (1/69), async timing gap in a new test | fixed the test to await a microtask tick after flushing the fire-and-forget `loadList()` GET, not application code |
| F03-T05 | 2 | test | `npx ng test` | 5 files, 69 tests passed | none |
| F03-T05 | 3 | correction | n/a (self-review against spec.md before starting T06) | `loadList()`'s catch block set `listError` from `toApiError(error).message`, which would have surfaced F01's offline/fallback wording instead of F03-AC11's fixed message | added `LIST_ERROR_MESSAGE` constant, set unconditionally on any list-fetch failure; added 2 tests (fixed message on any cause, `retryList()` re-issues identical page/size) |
| F03-T05 | 3 | format | `npx prettier --write src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts` | 2 files, unchanged (already correctly formatted) | none |
| F03-T05 | 3 | lint | `npx eslint src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts --fix` | 0 errors, 0 warnings | none |
| F03-T05 | 3 | build | `npx ng build` | Application bundle generation complete, 9.35s | none |
| F03-T05 | 3 | test | `npx ng test` | 5 files, 71 tests passed | none |
| F03-T06 | 1 | format | `npx prettier --write src/app/features/bookmark-list/` | `bookmark-list.html` and `bookmark-list.ts` unchanged, `bookmark-list.spec.ts` reformatted | none |
| F03-T06 | 1 | lint | `npx eslint src/app/features/bookmark-list/ --fix` | 0 errors, 0 warnings | none |
| F03-T06 | 1 | build | `npx ng build` | Application bundle generation complete, styles grew to 5.99 kB | none |
| F03-T06 | 1 | test | `npx ng test --include src/app/features/bookmark-list/bookmark-list.spec.ts --watch=false` | 3 separate invocations (full suite, filtered, filtered + `--watch=false`) each produced zero output after the `DEV v5.0.3` startup banner for 60–90s and were killed | Diagnosed by temporarily replacing the spec with a single minimal smoke test (`TestBed` creates the component, asserts truthy) to isolate whether the component/template itself was at fault |
| F03-T06 | 2 | test (diagnostic) | `npx ng test --include src/app/features/bookmark-list/bookmark-list.spec.ts --watch=false` (minimal smoke spec) | 1 file, 1 test passed in 6.96s | Confirmed the component and template mount and run correctly under test; the earlier hangs were environment slowness (confirmed separately: `npx eslint --fix` and `npx ng build` on the same files also ran far slower than their historical baseline, 460s vs ~25s, while CPU usage on the node process kept climbing, showing it was progressing, not deadlocked). Restored the full original spec content unchanged |
| F03-T06 | 2 | test (full suite) | `npx ng test --watch=false` | 6 files, 78 tests passed in 6.47s | none |
| F03-T07 | 1 | format | `npx prettier --write src/app/features/bookmark-list/ src/styles.css` | 4 files, unchanged (already correctly formatted) | none |
| F03-T07 | 1 | lint | `npx eslint src/app/features/bookmark-list/ --fix` | 0 errors, 0 warnings | none |
| F03-T07 | 1 | build | `npx ng build` | Application bundle generation complete, 3.58s, styles 6.31 kB | none |
| F03-T07 | 1 | test (full suite, before new pagination tests added) | `npx ng test --watch=false` | 6 files, 78 tests passed | Added 4 new tests covering F03-AC4/AC6/AC9/AC10 per the task's own done-when clause, then re-ran format/lint/build/test |
| F03-T07 | 2 | format | `npx prettier --write src/app/features/bookmark-list/bookmark-list.spec.ts` | unchanged (already correctly formatted) | none |
| F03-T07 | 2 | lint | `npx eslint src/app/features/bookmark-list/bookmark-list.spec.ts --fix` | 0 errors, 0 warnings | none |
| F03-T07 | 2 | build | `npx ng build` | Application bundle generation complete, 3.32s | none |
| F03-T07 | 2 | test (full suite) | `npx ng test --watch=false` | 6 files, 82 tests passed | none |
| F03-T08 | 1 | format | `npx prettier --write src/app/app.ts src/app/app.html src/app/app.spec.ts src/app/features/bookmark-list/` | all files unchanged (already correctly formatted) | none |
| F03-T08 | 1 | lint | `npx eslint src/app/app.ts src/app/app.spec.ts src/app/features/bookmark-list/ --fix` | 0 errors, 0 warnings | none |
| F03-T08 | 1 | build | `npx ng build` | Application bundle generation complete, 3.40s | none |
| F03-T08 | 1 | test (full suite) | `npx ng test --watch=false` | 1 file failed (2/84): the two new app.spec.ts tests asserted post-flush DOM state without awaiting the `loadList()` promise microtask | fixed the two tests by adding `await Promise.resolve()` after `http...flush(...)`, matching the established pattern from F03-T05's correction; no application code changed |
| F03-T08 | 2 | format/lint | `npx prettier --write src/app/app.spec.ts` / `npx eslint src/app/app.spec.ts --fix` | unchanged / 0 errors | none |
| F03-T08 | 2 | test (full suite) | `npx ng test --watch=false` | 6 files, 84 tests passed | none |
| F03-T08 | 2 | test (api full suite) | `npx vitest run` (in `app/api`) | 14 files, 309 tests passed | none |
| F03-T08 | 2 | start | `node src/server.js` (fresh database) | `[api] TagVault API listening on http://localhost:3000` | none |
| F03-T08 | 2 | smoke | `GET /`, `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` | 200, 200, 200, 200 | none |
| F03-T08 | 2 | F03-AC7 restart spot check | seeded 15 synthetic bookmarks (`https://example.com/item-1`..`15`), recorded `GET /api/bookmarks?page=1&size=10` (ids 15..6) and `?page=2&size=10` (ids 5..1), `total=15` both pages; stopped the process; restarted against the same database file; re-fetched both pages | identical `items` (same ids, urls, `created_at` values and order) and identical `total=15` on both pages before and after restart | self-caught cleanup mistake: the first `Remove-Item data\*.sqlite*` glob did not match the real file name (`tagvault.db`, not `*.sqlite*`), so the seed data silently survived into a later server start (discovered when a fresh seed of 22 more bookmarks showed `total=37`, not 22); corrected with `Remove-Item data\tagvault.db*` before continuing — the restart check's observed result above is unaffected, since it was recorded from the actual HTTP responses before the cleanup mistake occurred |
| F03-T09 | 1 | format | `npx prettier --write src/app/features/bookmark-list/bookmark-list.html src/app/features/bookmark-list/bookmark-list.spec.ts` | `bookmark-list.html` reformatted, `bookmark-list.spec.ts` unchanged | none |
| F03-T09 | 1 | lint | `npx eslint src/app/features/bookmark-list/ --fix` | 0 errors, 0 warnings (environment ran far slower than usual; confirmed progressing, not hung, by polling `Get-Process node` CPU usage) | none |
| F03-T09 | 1 | build | `npx ng build` | Application bundle generation complete, 17.072s, main 168.59 kB / styles 6.31 kB | none |
| F03-T09 | 1 | test (full suite) | `npx ng test --watch=false` | 6 files, 85 tests passed | none |
| F03-T09 | 1 | start | `node src/server.js` (fresh database) | `[api] TagVault API listening on http://localhost:3000` | none |
| F03-T09 | 1 | smoke | `GET /`, `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` | 200, 200, 200, 200 | none |

## Plan vs. Actual

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| F03-T01 | As planned | As planned, 1 attempt, 0 failures | none |
| F03-T02 | Built and verified independently of T03 | Built and verified together with T03, in one build-verify pass | `tasks.md` assigns removing `listRecent()`/`countLive()`/`F01_LIST_LIMIT` to T02 and repointing the route to T03. Landing T02 alone leaves `GET /api/bookmarks` calling a now-deleted `service.listRecent()`, which breaks the declared smoke check and `list-route.test.js`'s existing imports — a real regression the per-task build-verify loop would have to fail on. Combining T02+T03 into one verified pass avoids ever landing a broken intermediate state, consistent with `lld.md` §13's own P5 claim that "every task... leaves the app buildable and runnable." No scope was added beyond what both tasks already specified. |
| F03-T03 | Built and verified independently of T02 | Built and verified together with T02 (see above) | Same reason as F03-T02 |
| F03-T04 | As planned | As planned, 1 attempt, 0 failures. App `start`/smoke deferred to T08, since `ng serve` is not meaningful until the component is wired into the shell | none |
| F03-T05 | As planned | As planned overall; the first test run failed once on a test-only async-timing gap (the new save-refreshes-the-list test asserted state before the fire-and-forget `loadList()`'s promise microtask resolved), fixed in the test itself with an `await Promise.resolve()`, no application code changed. A second, self-caught correction followed: `loadList()`'s failure path originally reused `toApiError(error).message`, which does not satisfy F03-AC11's requirement for one fixed message regardless of cause — fixed before starting T06, since T06's error-state rendering depends on it | The test needed to await a tick after flushing an HTTP response for a call the code under test does not itself await (`void this.loadList()`). Caught the AC11 mismatch by re-reading `spec.md` §2 against the just-written code before building on top of it |
| F03-T06 | As planned | As planned, production code unchanged from first draft. `npx ng test` appeared to hang indefinitely (no output for 60-150s across 3 invocations); diagnosed with a temporary minimal smoke spec before restoring the full spec unchanged, confirming the root cause was transient environment slowness (the same slowdown independently showed up in that session's `eslint --fix` and `ng build` calls, both 10-20x their historical durations, with climbing CPU usage proving the processes were progressing rather than deadlocked) | No code or test defect; documented so a future slow `ng test` run is not mistaken for a real hang without first checking process CPU usage |
| F03-T07 | As planned | As planned, 2 attempts: the first build-verify pass (code only) was clean, then 4 tests were added for F03-AC4/AC6/AC9/AC10 per the task's own done-when clause (changing page size calls `changePageSize()`; Previous/Next disabled correctly at both ends and present not hidden; current page as rendered text; both controls disabled while `listLoading()`), followed by a second clean format/lint/build/test pass | The initial pass deliberately matched LD-03's chosen shape (select + Previous/Next + "Page X of Y" text) before writing its tests, to confirm the markup compiled; tests were then added to prove each AC, consistent with how T05/T06 were built |
| F03-T08 | As planned | As planned overall; `addRequested` was changed from `output<void>()` to `output<Event>()` (and `bookmark-list.html`'s emit call updated to pass `$event`) so the real click event reaches `openDialog()`, preserving the existing Esc-returns-focus-to-opener behavior exactly as it already works for the header and FAB buttons — this was implied by T06's `addRequested.emit()` call but not spelled out as a signature change in `lld.md`. Two new `app.spec.ts` tests failed once on the same async-timing gap already seen in F03-T05, fixed the same way (`await Promise.resolve()` after `flush()`), no application code changed. The F03-AC7 restart spot check and the full smoke contract were both executed and recorded against a real running server with real HTTP calls, not estimated | The `output<void>()` to `output<Event>()` change keeps `BookmarkList` fully decoupled from `BookmarkForm` while still letting `App` resolve the correct opener element for focus return, exactly matching the existing pattern for `(click)="openDialog($event)"` elsewhere in `app.html` |
| F03-T09 | As planned | As planned, 1 attempt, 0 failures | none |

### Keyboard walkthrough (F03-AC9)

Human-confirmed on 2026-10-01 against the running app (`node src/server.js` + `app/api/public` bundle, 22 synthetic bookmarks seeded at `http://localhost:3000`): tabbing through the page reaches the header *Add bookmark*, then each card's *Edit* then *Delete* in visual order, then the pagination control (page-size select, Previous, Next), with a visible focus indicator at each stop; the page-size select carries an associated label and the current page is conveyed as rendered text. The human reported "Everything is working as expected." No screenshot was supplied.