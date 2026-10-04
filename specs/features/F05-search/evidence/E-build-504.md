### Evidence E-build-504

**SDLC activity:** build

**Task/feature:** F05-T04 — add a third timed run to `nfr01-timing.test.js` for `GET /api/bookmarks?q=` against the existing 1,000-record seed (supports NFR-01; no AC of its own)

**Context given to AI:** `lld.md` §11; `tasks.md` F05-T04's row (explicitly: the actual run and recorded median/max numbers are deferred to `/test-phase F05-search`, this task only needs the test itself to exist and pass its in-build threshold assertion); the existing `nfr01-timing.test.js` (its `seedOneThousand()` seed and the two existing timed `page=1`/`page=50` tests' structure)

**Prompt/request:** Implement F05-T04 per the task brief: add a third timed test for `?q=` following the existing median/max-over-REPS pattern

**AI response summary:** Added a third `it(...)` inside the existing `describe` block: `GET /api/bookmarks?q=bookmark&size=20` repeated `REPS` (20) times, asserting `total === SEED_COUNT` and 20 items per page, collecting timings, then asserting median and max are each `< 1000ms` (same threshold/shape as the two existing tests)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors), then `npx vitest run test/nfr01-timing.test.js` (3/3 passed, 1 new), then the full suite `npx vitest run` (25 files, 452/452 passed — no regression). The actual median/max numbers from this run are **not** recorded here per the task's explicit deferral to `/test-phase F05-search`

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
