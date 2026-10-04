### Evidence E-build-402

**SDLC activity:** build

**Task/feature:** F04-T01…T03 — the backend tag-filter layer: `buildPredicate({ tag })`'s `EXISTS` subquery and `normalizeTagFilterValue()` in `list-query.js`; `bookmark-service.list({ page, size, tag })` and the new `countLive()`; and the `routes/bookmarks.js` `?tag=` query param plus the new `GET /api/bookmarks/count` route.

**Context given to AI:** `specs/features/F04-filter-by-tag/lld.md` (LD-01 object-param `buildPredicate` signature, LD-02 a separate `normalizeTagFilterValue()`, LD-04 the new count route) and `tasks.md`'s F04-T01…T03 rows (files, covered AC, done-when criteria); the existing `list-query.js`/`bookmark-service.js`/`routes/bookmarks.js` read directly to extend them without breaking F03's unfiltered-list contract.

**Prompt/request:** Build F04-T01, then F04-T02, then F04-T03, one task at a time, each followed by the build-verify loop, per `/build-feature F04-filter-by-tag`.

**AI response summary:** Added `buildPredicate({ tag } = {})`'s `EXISTS` subquery against `bookmark_tag`/`tag`, and `normalizeTagFilterValue(raw)` (trim, lowercase, returns `null` for anything not a non-empty string) in T01, with unit tests covering the normalizer's full input table. Extended `bookmark-service.list()` to normalize and thread `tag` through, and added `countLive()` reusing `buildPredicate()` with no tag, in T02. Wired `req.query.tag` into the route and registered `GET /api/bookmarks/count` ahead of any future `:id`-shaped route, in T03 — tests were added to the existing `bookmarks-route.test.js` rather than a new `count-route.test.js`, a declared deviation from the file list in `tasks.md` since the new assertions fit naturally alongside the existing route-level test setup.

**Your decision:** Accepted

**What you changed and why:** T03's test file placement was consolidated into the existing `bookmarks-route.test.js` instead of a new `count-route.test.js`, because the two routes share the same running-server test fixture and splitting them would have duplicated setup for no benefit (constitution P3/P6 — simplicity, no unnecessary files).

**How you verified it:** `npx vitest run` after each task: T01 → 378 tests passed (21 files); T02 → 384 tests passed (6 new); T03 → 389 tests passed. T03's smoke check (`curl`-equivalent against `/api/health`, `/api/bookmarks`, `/api/tags`, `/api/bookmarks/count`) failed once with a 404 on the count route — diagnosed as a stale `node` process left bound to port 3000 from an earlier session (confirmed via `netstat`), not a code defect; killed the stale PID and re-ran, getting `200`/`200`/`200`/`200` with `/api/bookmarks/count` returning `{"total":3}`.

**Outcome:** worked

**Iteration:** One iteration per task; the T03 smoke failure was an environmental stale-process issue, resolved without a code change.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
