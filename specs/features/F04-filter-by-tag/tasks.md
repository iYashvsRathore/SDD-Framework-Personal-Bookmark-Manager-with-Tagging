# F04: Filter by Tag (Tasks)

**LLD version:** 1 (2026-10-01)
**Owner:** dev-1

> One task at a time. Each task ends with the build-verify loop (format → lint → build → start → smoke → tests). Max **3** fix attempts, then stop and ask the human.

## Tasks

| Task ID | Description | Component id | Files | Covers AC | Done when | Status |
|---|---|---|---|---|---|---|
| F04-T01 | Extend `list-query.js`: `buildPredicate({ tag } = {})` adds the `EXISTS` subquery against `bookmark_tag`/`tag` when `tag` is present; add `normalizeTagFilterValue(raw)` (trim, lowercase, never throws, `null` for anything not a non-empty string). Unit tests for both shapes and the normalizer's table of inputs | `api` | `src/services/list-query.js`, `test/list-query.test.js` (new or extended) | F04-AC3, AC7, AC8, F04-EC1, F04-EC3 | `npx vitest run` passes; `buildPredicate({})` still returns F03's exact unchanged shape | done |
| F04-T02 | Extend `bookmark-service.js`: `list({ page, size, tag })` normalizes `tag` and threads it into `buildPredicate()`; add `countLive()` reusing `buildPredicate()` (no tag) + `countWhere()`. Unit tests against a real `:memory:` schema seeded with tagged bookmarks | `api` | `src/services/bookmark-service.js`, `test/bookmark-service.test.js` (extended) | F04-AC3, AC6, AC8, AC10 | `npx vitest run` passes; a tagged-bookmark fixture returns only matching rows with their full `tags[]` | done |
| F04-T03 | Extend `routes/bookmarks.js`: read `req.query.tag`, pass through unvalidated; add `GET /bookmarks/count` → `{ total: service.countLive() }`, registered ahead of any future `:id`-shaped route. HTTP-level tests on a real server (random port) | `api` | `src/routes/bookmarks.js`, `test/bookmarks-route.test.js` (extended), `test/count-route.test.js` (new) | F04-AC3, AC7, AC8 | `npx vitest run` passes; `curl`-equivalent test hits `?tag=Research`/`?tag= research `/`?tag=doesnotexist` and `/bookmarks/count` and gets the documented shapes, never a 400/500 | done |
| F04-T04 | `web` models and API client: add `TagWithCount`, `CountBookmarksResponse` to `models.ts`; add `listTags()`, `countBookmarks()` to `api.service.ts`; extend `listBookmarks(page, size, tag?)` to append `tag` only when non-null | `web` | `src/app/core/models.ts`, `src/app/core/api.service.ts` | F04-AC1, AC3, AC12 | `npx ng build` clean; existing `api.service` tests still pass, new methods covered | done |
| F04-T05 | Extract `tagHue(name): number` into `src/app/core/tag-hue.ts` (pure, ported from `BookmarkList`'s existing inline hash); update `BookmarkList` to import it instead of its private copy; unit test the extracted function | `web` | `src/app/core/tag-hue.ts` (new), `src/app/core/tag-hue.spec.ts` (new), `src/app/features/bookmark-list/bookmark-list.ts` (changed) | (supports F04-AC1, AC2 — no AC of its own) | `npx ng test` passes; `BookmarkList`'s rendered chip colours are unchanged from before the extraction | done |
| F04-T06 | Extend `bookmarks.store.ts`: add `tagFilter`/`tagRail`/`allCount` signals; add `selectTag`/`toggleTagFilter`/`clearTagFilter`/`refreshTagRail()` (its own request-token guard, the EC17 fallback); `loadList()` now calls `refreshTagRail()` on success and passes `tagFilter()` to `listBookmarks()`; update `countText` computed for "N of M bookmarks" | `web` | `src/app/state/bookmarks.store.ts` | F04-AC2, AC4, AC5, AC6, AC10, AC12, F04-EC2, F04-EC4 | `npx ng test` passes; store-level tests assert EC17's fallback and the stale-response guard directly | done |
| F04-T07 | New `TagRail` component: `nav#tags` rail with the "All bookmarks" button plus one button per `store.tagRail()` entry, `aria-pressed`, using `tagHue()` for each dot. Add the `tag` icon path to `icons.ts` | `web` | `src/app/features/tag-rail/tag-rail.ts` (new), `src/app/features/tag-rail/tag-rail.html` (new), `src/app/core/icons.ts` (changed) | F04-AC1, AC10, AC11, F04-EC2 | `npx ng test` passes; rendered with a stubbed store, every button has the correct `aria-pressed` and label | done |
| F04-T08 | Change `BookmarkList`: card tag chips become `<button>`s calling `store.selectTag(tag)`; render the active-filter chip beside `#count`; add the tag-empty state branch (checked before F03's existing empty state) | `web` | `src/app/features/bookmark-list/bookmark-list.ts`, `src/app/features/bookmark-list/bookmark-list.html` | F04-AC2, AC4, AC5, AC9, AC12 | `npx ng test` passes; the tag-empty state renders only when `tagFilter()` is set and `items()` is empty, F03's own empty state is otherwise unchanged | done |
| F04-T09 | Mount `<app-tag-rail />` in `app.html` as a sibling of `<main>` inside `.wrap`; wire `app.ts` imports | `web` | `src/app/app.html`, `src/app/app.ts` | F04-AC1 | `npx ng build` clean; the rail renders on load, matching `docs/mockup.html`'s `.wrap` structure | done |
| F04-T10 | Port `.tags`, `.tg`, `.tg[aria-pressed=true]`, `.tg .n`, `.dot`, the `>=1024px` sticky-column rule, and `#af .chip` from `docs/mockup.html` into `styles.css` | `web` | `src/styles.css` | F04-AC1, AC2, AC11 (visual contract only) | `npx ng build` clean; rail and active-filter chip visually match the reference at both mobile and `>=1024px` widths | done |
| F04-T11 | Extend `bookmarks.store.spec.ts`: tests for `selectTag`, `toggleTagFilter` (including the "All bookmarks" null case), `clearTagFilter`, `refreshTagRail`'s EC17 fallback, the `tagRailRequestToken` stale-response guard (F04-EC4), and the updated `countText` | `web` | `src/app/state/bookmarks.store.spec.ts` | F04-AC2, AC4, AC5, AC10, AC12, F04-EC4 | `npx ng test` passes with the new assertions | done |
| F04-T12 | Manual keyboard walkthrough: `Tab` order through `All bookmarks` → every rail tag button → the active-filter chip's `Clear tag filter` (when present); `Enter`/`Space` toggles each rail button exactly as a click; visible focus throughout. Record pass/fail | `web` | (no files — manual verification, recorded in `status.md`) | F04-AC11 | Walkthrough performed once after F04-T09/T10 land; result recorded in `status.md`'s Build gate notes | done |

Status values: `todo`, `in-progress`, `done`, `blocked`.

## Build-Verify Log (actual results only)

| Task | Attempt | Step (format/lint/build/start/smoke/test) | Command | Result (observed) | Action |
|---|---|---|---|---|---|
| F04-T01 | 1 | format | `npx prettier --write .` | exit 0, `test/list-query.test.js` formatted, all other files unchanged | none |
| F04-T01 | 1 | lint | `npx eslint . --fix` | exit 0, no errors | none |
| F04-T01 | 1 | test | `npx vitest run` (in `app/api`) | 21 files passed, 378 tests passed (incl. new list-query.test.js) | none |
| F04-T02 | 1 | format | `npx prettier --write .` | exit 0, `test/bookmark-service.test.js` formatted, all other files unchanged | none |
| F04-T02 | 1 | lint | `npx eslint . --fix` | exit 0, no errors | none |
| F04-T02 | 1 | test | `npx vitest run` | 21 files passed, 384 tests passed (6 new F04 tests) | none |
| F04-T03 | 1 | format | `npx prettier --write .` | exit 0, no files changed | none |
| F04-T03 | 1 | lint | `npx eslint . --fix` | exit 0, no errors | none |
| F04-T03 | 1 | test | `npx vitest run` | 21 files passed, 389 tests passed (new GET ?tag= and /count route tests, added to `bookmarks-route.test.js` rather than a separate `count-route.test.js` — see Plan vs. Actual) | none |
| F04-T03 | 1 | start | `node src/server.js` | Listened on :3000 | none |
| F04-T03 | 1 | smoke | `curl /api/health`, `/api/bookmarks`, `/api/tags`, `/api/bookmarks/count` | First attempt: `/api/bookmarks/count` returned 404. Diagnosed: a stale node process from an earlier session was already bound to :3000 (confirmed via `netstat`), so the smoke curl hit the OLD process, not the one just started | Killed the stale PID, restarted `node src/server.js` |
| F04-T03 | 2 | smoke | same four `curl` checks, re-run after restart | `health=200`, `bookmarks=200`, `tags=200`, `count=200` body `{"total":3}` | none — clean |
| F04-T04 | 1 | format | `npx prettier --write .` (in `app/web`) | exit 0, no files changed | none |
| F04-T04 | 1 | lint | `npx eslint . --fix` | exit 0, no errors | none |
| F04-T04 | 1 | build | `npx ng build` | Clean build, 179.42 kB initial total, no errors | none |
| F04-T04 | 1 | test | `npx ng test --watch=false` | 8 files passed, 121 tests passed | none |
| F04-T05 | 1 | format | `npx prettier --write .` | exit 0, only the two new `tag-hue.{ts,spec.ts}` files formatted, rest unchanged | none |
| F04-T05 | 1 | lint | `npx eslint . --fix` | exit 0, no errors | none |
| F04-T05 | 1 | build | `npx ng build` | Clean build, 179.43 kB initial total, no errors | none |
| F04-T05 | 1 | test | `npx ng test --watch=false` | 9 files passed, 125 tests passed (4 new `tag-hue.spec.ts` tests) | none |
| F04-T05 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T05 | 1 | smoke | `curl http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T06 | 1 | format | `npx prettier --write src/app/state/bookmarks.store.ts` (file-scoped) | exit 0, unchanged | none |
| F04-T06 | 1 | lint | `npx eslint src/app/state/bookmarks.store.ts --fix` (file-scoped) | exit 0, no errors | none |
| F04-T06 | 1 | build | `npx ng build` | Clean build, 180.19 kB initial total, no errors | none |
| F04-T06 | 1 | test | `npx ng test --watch=false` | 9 files passed, 125 tests passed (unchanged count — no new spec coverage yet, planned for T11) | none |
| F04-T06 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T06 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T07 | 1 | format | `npx prettier --write` (file-scoped: tag-rail.ts, tag-rail.html, tag-rail.spec.ts, icons.ts) | exit 0, 3 new files formatted, icons.ts unchanged | none |
| F04-T07 | 1 | lint | `npx eslint` (file-scoped: tag-rail.ts, tag-rail.spec.ts, icons.ts) `--fix` | exit 0, no errors | none |
| F04-T07 | 1 | build | `npx ng build` | Clean build, 180.27 kB initial total, no errors | none |
| F04-T07 | 1 | test | `npx ng test --watch=false` | 10 files passed, 133 tests passed (8 new `tag-rail.spec.ts` tests) | none |
| F04-T07 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T07 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T08 | 1 | format | `npx prettier --write` (file-scoped: bookmark-list.html, bookmark-list.spec.ts) | exit 0, html unchanged, spec.ts formatted | none |
| F04-T08 | 1 | lint | `npx eslint src/app/features/bookmark-list/bookmark-list.spec.ts --fix` | exit 0, no errors | none |
| F04-T08 | 1 | build | `npx ng build` | Clean build, 181.40 kB initial total, no errors | none |
| F04-T08 | 1 | test | `npx ng test --watch=false` | 10 files passed, 137 tests passed (4 new/updated F04 assertions in `bookmark-list.spec.ts`) | none |
| F04-T08 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T08 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T09 | 1 | format | `npx prettier --write` (file-scoped: app.html, app.ts) | exit 0, both unchanged | none |
| F04-T09 | 1 | lint | `npx eslint src/app/app.ts --fix` | exit 0, no errors | none |
| F04-T09 | 1 | build | `npx ng build` | Clean build, 182.64 kB initial total, no errors | none |
| F04-T09 | 1 | test | `npx ng test --watch=false` | 1 FAILED: `app.spec.ts` — "hides decorative icons from assistive technology" expected every `.ic` element to carry `aria-hidden="true"`; `TagRail`'s new "All bookmarks" icon was a bare `<svg class="ic">` with no `aria-hidden` wrapper, unlike every other icon in the app (`app.html`'s `.ic` spans) | Wrapped the icon in `<span class="ic" aria-hidden="true">`, matching the established pattern exactly |
| F04-T09 | 2 | test | `npx ng test --watch=false` (re-run after the fix) | 10 files passed, 137 tests passed | none — clean |
| F04-T09 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T09 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T10 | 1 | format | `npx prettier --write src/styles.css` (file-scoped) | exit 0, unchanged | none |
| F04-T10 | 1 | lint | `npx eslint src/styles.css --fix` | exit 0 (1 warning: "File ignored because no matching configuration was supplied" — ESLint has no CSS parser configured in this project, expected/pre-existing, not a new finding) | none |
| F04-T10 | 1 | build | `npx ng build` | Clean build, 183.37 kB initial total, no errors | none |
| F04-T10 | 1 | test | `npx ng test --watch=false` | 10 files passed, 137 tests passed | none |
| F04-T10 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T10 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| F04-T11 | 1 | format | `npx prettier --write src/app/state/bookmarks.store.spec.ts` (file-scoped) | exit 0, formatted | none |
| F04-T11 | 1 | lint | `npx eslint src/app/state/bookmarks.store.spec.ts --fix` | exit 0, no errors | none |
| F04-T11 | 1 | build | `npx ng build` | Clean build, 183.37 kB initial total, no errors | none |
| F04-T11 | 1 | test | `npx ng test --watch=false` | 10 files passed, 149 tests passed (12 new F04 tag-filter store tests) | none |
| F04-T11 | 1 | start | `npx ng serve` | Listened on :4200, Vite ready | none |
| F04-T11 | 1 | smoke | `Invoke-WebRequest http://localhost:4200/` | `root=200` | none — clean, server stopped |
| final | 1 | test (api) | `npx vitest run` (in `app/api`) | 21 files passed, 389 tests passed | none |
| final | 1 | start | `node src/server.js` + `npx ng serve` | API on :3000, web on :4200 | none |
| F04-T12 | 1 | manual | Human keyboard walkthrough at http://localhost:4200/: `Tab` through `All bookmarks` → rail tag buttons → active-filter chip's `Clear tag filter`; `Enter`/`Space` on rail buttons | Human-reported: pass — Tab order, visible focus, and Enter/Space activation all correct | none |

## Plan vs. Actual

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| F04-T01 | New `test/list-query.test.js` | Matches plan exactly | — |
| F04-T02 | Extend `test/bookmark-service.test.js` | Matches plan exactly | — |
| F04-T03 | `test/bookmarks-route.test.js` (extended), `test/count-route.test.js` (new) | Both the `?tag=` and `/count` route tests were added as new `describe` blocks inside `test/bookmarks-route.test.js`; no separate `count-route.test.js` file was created | `bookmarks-route.test.js` already owns every `/api/bookmarks*` route-level test in this codebase (list-route.test.js owns plain `GET /api/bookmarks` pagination); splitting `/count` into its own file would duplicate the existing `start()`/`post()` harness for two tests with no other benefit (P4 simplicity) |
| F04-T04 | Matches plan exactly | Matches plan exactly | — |
| F04-T05 | Matches plan exactly | Matches plan exactly | — |
| F04-T06 | Matches plan exactly | Matches plan exactly | — |
| F04-T07 | Files in LLD §3 (`tag-rail.ts`, `tag-rail.html`, `icons.ts`) | Also added `tag-rail.spec.ts` (new) | Not listed in the LLD's §3 file table or `tasks.md`'s Files column, but required to actually satisfy this task's own "done when" clause ("rendered with a stubbed store, every button has the correct `aria-pressed` and label") and matches every other feature component's established pattern (`bookmark-list.spec.ts`, `tag-input.spec.ts`) — P6 single pattern, no new convention introduced |
| F04-T08 | `bookmark-list.ts`, `bookmark-list.html` | `bookmark-list.html` changed as planned; `bookmark-list.ts` needed no change (both `icons.tag` and `tagHue` were already exposed by F04-T05/T07); `bookmark-list.spec.ts` was also updated (not listed in the Files column) to replace F03's now-incorrect "tags render as plain, non-interactive spans" assertion with F04's button/click/aria-label behavior, and to add coverage for the new active-filter chip and tag-empty state | The existing spec asserted the exact F03 behavior this task intentionally changes (AC2); leaving it unupdated would leave a known-failing or known-stale test, which P3/Q2 do not permit |
| F04-T09 | Matches plan exactly | Matches plan exactly, after one fix attempt (TagRail's icon wrapper needed `.ic`/`aria-hidden="true"` to match every other icon in the app) | caught by the existing `app.spec.ts` accessibility assertion, not a new requirement |
| F04-T10 | Matches plan exactly | Matches plan exactly | — |
| F04-T11 | Test `refreshTagRail`/EC17/EC4 by exercising them through `loadList()` | Tested `refreshTagRail()` by calling it directly and awaiting its own returned promise | `loadList()` only invokes `refreshTagRail()` as a fire-and-forget call (`void this.refreshTagRail()`), so a test awaiting only `loadList()`'s own promise cannot deterministically observe `refreshTagRail()`'s internal `Promise.all` continuation settling; calling `refreshTagRail()` directly and awaiting its own promise is both simpler and deterministic, and still exercises the exact same method the LLD names |
