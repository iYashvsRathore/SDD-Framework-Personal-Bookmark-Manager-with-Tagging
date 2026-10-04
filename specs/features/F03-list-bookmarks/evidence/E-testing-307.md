### Evidence E-testing-307

**SDLC activity:** testing

**Task/feature:** F03-list-bookmarks — the two items `spec.md` §4, `lld.md` §11/§13, and `status.md`'s Testing row all name as deliberately not yet executed: the NFR-01 1,000-record timed list measurement, and a dedicated NFR-04/S4 SQL-injection-shaped probe aimed directly at the `page`/`size` query parameters (the fields that feed `LIMIT`/`OFFSET`).

**Context given to AI:** `spec.md` §4 (NFR-01 is F03's primary owner, "measured, not estimated"), `data-model.md` §6's seeding recipe (`https://example.com/article/{n}`, ~20 tags with 0–8 each, spread `created_at`), `lld.md` §9's security table (page/size bound as integers, never string-built), and the existing `pagination.test.js`/`list-route.test.js` suites (to avoid duplicating the already-covered clamp-table and the one existing unrelated-param probe).

**Prompt/request:** `/test-phase F03-list-bookmarks` — after presenting a test plan and receiving `GO`, write and run the NFR-01 timing test and the injection-shaped probe.

**AI response summary:** Proposed and wrote `test/nfr01-timing.test.js` (a real HTTP server over a real in-memory SQLite connection, seeded with exactly 1,000 synthetic rows per the data-model.md recipe, timing 20 real requests each at page 1 and the last page) and a new `describe` block in `test/list-route.test.js` covering five page-field and three size-field SQL-injection-shaped payloads (e.g. `1' OR '1'='1`, `1;DROP TABLE bookmark;--`), asserting each still returns 200 with the documented clamp fallback and that the `bookmark` table survives intact.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after the human review; both files were accepted as written.

**How you verified it:** Ran `npx vitest run test/nfr01-timing.test.js --reporter=verbose` in isolation to capture the real observed numbers: page=1&size=20 — median=15ms, max=51ms (n=20); page=50&size=20 (last page) — median=12ms, max=21ms (n=20); both well under the 1,000ms target. Ran the full suite `npx vitest run`: **15 test files, 319 tests passed, 0 failed**. Ran `npx vitest run --coverage`: 96.14% stmts / 87.2% branch / 93.22% funcs / 98.49% lines over `src/services` + `src/lib` (Q4 target 80%). Ran `npx eslint . --fix` (0 errors after fix) and `npx prettier --write`/`--check .` (one formatting pass needed on the two new files, then "All matched files use Prettier code style!"), followed by a final `npx vitest run` re-confirming **319/319** passed after the formatting pass.

**Outcome:** worked

**Iteration:** None — no failure occurred in this session's first run of either new file.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
