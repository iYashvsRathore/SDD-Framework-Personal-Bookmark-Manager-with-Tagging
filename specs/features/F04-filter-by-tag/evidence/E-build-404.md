### Evidence E-build-404

**SDLC activity:** build

**Task/feature:** F04-T11 — extending `bookmarks.store.spec.ts` with tests for `selectTag`, `toggleTagFilter`, `clearTagFilter`, `refreshTagRail`'s EC17 fallback, and the `tagRailRequestToken` stale-response guard (F04-EC4); and F04-T12 — the manual keyboard walkthrough of the tag rail and active-filter chip.

**Context given to AI:** `tasks.md`'s F04-T11/T12 rows; `bookmarks.store.ts`'s actual implementation of `loadList()` (which calls `void this.refreshTagRail()` as a fire-and-forget call, not awaited) and `refreshTagRail()` (its own `Promise.all([listTags(), countBookmarks()])` and `tagRailRequestToken` guard); the existing test file's established `HttpTestingController` conventions (no global `http.verify()` in this file).

**Prompt/request:** Build F04-T11 (extend the store spec), then F04-T12 (manual walkthrough), continuing `/build-feature F04-filter-by-tag`.

**AI response summary:** Drafted an initial version of the new test block that flushed `/api/tags`/`/api/bookmarks/count` via `loadList()`'s indirect, fire-and-forget call to `refreshTagRail()`. Before running it, a code-level review (tracing the actual microtask ordering of `void this.refreshTagRail()` inside `loadList()`) found two predictable bugs: (1) several tests called `http.expectOne('/api/tags')` before those requests were actually issued (they only become outstanding once `loadList()`'s own promise is awaited, letting its continuation run); (2) the EC4 stale-response test raced two `loadList()` calls, which doesn't actually exercise the independent `tagRailRequestToken` guard, because `loadList()`'s own `listRequestToken` check would prevent the earlier call's `refreshTagRail()` from ever being invoked if superseded. Rewrote the block to call `store.refreshTagRail()` directly (capturing and awaiting its own returned promise) for every rail-specific assertion, and used `http.match()` instead of `http.expectOne()` for the EC4 test since two concurrent calls produce two outstanding requests to the identical URL. Also simplified the `countText` tests to set `store.total`/`store.allCount`/`store.tagFilter` signals directly rather than routing through HTTP, avoiding the same timing class of bug entirely.

**Your decision:** Accepted

**What you changed and why:** Chose to catch and fix the async-ordering bug through manual code review before running any test, rather than spending one of the build-verify loop's 3 allowed fix attempts on a bug that was fully diagnosable from the code; this matches the build-verify-loop skill's intent that fix attempts are for genuine, unpredicted failures.

**How you verified it:** `npx ng test --watch=false` on the corrected test block: 149 tests passed (10 files, 12 new F04 tests, 0 failed) on the first run after the rewrite. `npx ng build` clean (183.37 kB). For F04-T12, started both the `api` (`node src/server.js`) and `web` (`npx ng serve`) servers and asked the human to perform the keyboard walkthrough directly against the running app at `http://localhost:4200/`; the human reported Tab order, visible focus, and Enter/Space activation all correct across "All bookmarks", every rail tag button, and the active-filter chip's "Clear tag filter" button.

**Outcome:** worked

**Iteration:** The T11 test-ordering bug was caught and corrected before the first test run, so no failed build-verify attempt was recorded for it. T12 passed on the human's first walkthrough.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
