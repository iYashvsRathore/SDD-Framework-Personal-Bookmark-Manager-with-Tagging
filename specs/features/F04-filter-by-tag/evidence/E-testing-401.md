### Evidence E-testing-401

**SDLC activity:** testing

**Task/feature:** F04-filter-by-tag — close the two test-phase gaps named in `spec.md` §4 and `lld.md` §11: the NFR-01 tag-filter timing measurement (not yet measured at 1,000 seeded bookmarks), and a dedicated security probe on the tag **filter/read** path (`GET /api/bookmarks?tag=`), distinct from the existing write-path probe (`tag-security-probe.test.js`) which only covers F02's `POST` tag validation.

**Context given to AI:** `spec.md` (12 AC, 7 edge cases), `lld.md` §9/§11 (security table, test hooks), `tasks.md`'s Build-Verify Log (every F04 task's existing test coverage), `product-spec.md` NFR-01, `component-map.json` test commands, and the full existing F04 test files (`list-query.test.js`, `bookmark-service.test.js`, `bookmarks-route.test.js`, `bookmarks.store.spec.ts`, `tag-rail.spec.ts`, `bookmark-list.spec.ts`) read first to confirm AC1-10, AC12 and all 7 edge cases already had an existing, passing automated test, so nothing would be duplicated.

**Prompt/request:** `/test-phase F04` — after presenting a test plan preview and receiving `GO`, write and run the NFR-01 tag-filter timing test and the tag-filter read-path security probe, then re-run the full regression.

**AI response summary:** Added one new `describe` block to the existing `nfr01-timing.test.js` (reusing its established 1,000-row/20-tags seed) timing 20 real `GET /api/bookmarks?tag=tag-5&size=20` requests against the real HTTP server. Added one new `describe` block to the existing `tag-security-probe.test.js` sending a SQL-metacharacter string and an XSS-shaped string as the `?tag=` value directly, asserting `200 {items:[],total:0,page:1,size:20}` (never 400/500) and that the `bookmark`/`tag` tables survive intact.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx vitest run test/nfr01-timing.test.js --reporter=verbose` in isolation to capture the real observed numbers: `tag=tag-5&size=20` — median=15ms, max=23ms (n=20), well under the 500ms NFR-01 target. Ran the full `api` suite: `npx vitest run` → **30 test files, 506 tests passed, 0 failed**. Ran the full `web` suite: `npx ng test --watch=false` → **15 test files, 207 tests passed, 0 failed**. F04-AC11's keyboard walkthrough was not re-run this phase; its result is cited verbatim from the Build gate (F04-T12, dev-1 confirmed pass 2026-10-01), since no UI code changed since.

**Outcome:** worked

**Iteration:** None — both new test blocks passed on the first run; no failure occurred this phase.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
