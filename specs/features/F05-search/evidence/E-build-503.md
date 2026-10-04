### Evidence E-build-503

**SDLC activity:** build

**Task/feature:** F05-T03 — extend `routes/bookmarks.js`'s `GET /bookmarks` handler to read `req.query.q` and pass it through unvalidated alongside `page`/`size`/`tag`, with new HTTP-level tests in `bookmarks-route.test.js` (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC11)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T03's row; the already-threaded `bookmark-service.js` `list({ q })` (F05-T02); the existing `routes/bookmarks.js` GET handler and `bookmarks-route.test.js`'s F04 `?tag=` describe block (`createTagged()` helper, a real listening server per test)

**Prompt/request:** Implement F05-T03 per the task brief: thread `req.query.q` through to `service.list()`, and add HTTP-level tests for a title match, a quote payload, a `<script>` payload, a 210-character query, and a combined `?tag=&q=` request

**AI response summary:** Updated the GET handler's doc comment and call to include `q: req.query.q`. Added a new `describe('GET /api/bookmarks?q= — F05-AC1-AC6, AC9, F05-EC3', ...)` block with 5 tests reusing the existing `createTagged()` helper

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** First attempt failed lint (`no-undef` on `createTagged`, 8 errors) because the helper was scoped inside the F04 `describe` block and not visible to the new F05 block; fixed by hoisting `createTagged` to module scope next to the existing `post()` helper. Second attempt: `npx prettier --write .` and `npx eslint . --fix` (0 errors), `npx vitest run test/bookmarks-route.test.js` (20/20 passed, 5 new), then the full suite `npx vitest run` (25 files, 451/451 passed — no regression)

**Outcome:** worked

**Iteration:** One fix cycle — a scoping (`no-undef`) lint failure on the first attempt, resolved by hoisting the shared `createTagged()` helper to module scope; second attempt passed clean

**Approx. time:** TODO(human)

**Learning:** TODO(human)
