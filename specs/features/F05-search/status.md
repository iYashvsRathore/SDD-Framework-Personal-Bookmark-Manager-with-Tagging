# F05: Search (Status)

**Owner:** dev-1
**Current status:** done

| Phase | Command | Status | Gate approved on | Evidence IDs | Notes |
|---|---|---|---|---|---|
| Planning | /plan-phase F05-search | approved | 2026-10-01 | E-planning-501 | `spec.md` approved by dev-1. 4 stories, 13 AC, 9 edge cases (2 inherited, 1 inherited-partial, 6 new AI). Two assumptions recorded (AS-F05-01 AND combination with tag filter, AS-F05-02 no persistence), both accepted as recommended defaults, no blocking questions raised |
| Design (LLD) | /design-feature F05-search | approved | 2026-10-01 | E-design-501 | `lld.md` (14 sections) and `tasks.md` (14 tasks) written, CREATE mode. LD-01...LD-06 (clause-array `buildPredicate()` refactor, `escapeLikePattern()`-based LIKE assembly, a separate `normalizeSearchValue()`, a component-owned `SearchBox` debounce mirroring `TagInput`, reuse of the existing `listRequestToken` guard for F05-RK1, the reference's conditional `Clear tag filter` action) all answered "Go with all recommendations" by dev-1. Also corrects a latent F04 empty-state precedence gap (`store.allCount() === 0` now checked before the search/tag empty branches). Design gate approved 2026-10-01 |
| Build | /build-feature F05-search | approved | 2026-10-02 | E-build-507 .. E-build-513 | 14/14 tasks done (F05-T01..T14). All api (452/452) and web (186/186) tests pass. F05-T14's manual walkthrough surfaced 2 production bugs not caught by any automated test: (1) search had zero filtering effect on the live server — root cause was a stale `npm start` process holding pre-F05 code in memory, not a code defect (fixed by restarting); (2) two browser clear ("x") icons on the search field — the native `type="search"` clear icon duplicated the component's own `.cl` button (fixed with `display: none` on `::-webkit-search-cancel-button`, matching `docs/mockup.html` verbatim). Both bugs fixed, re-verified via `curl` and the human's repeated walkthrough ("Great job, its fixed now"). Screenshot deferred — human will add to `docs/assets/Screenshots/` later |
| Testing | /test-phase F05-search | approved | 2026-10-03 | E-testing-504 | All existing tests re-run, 0 new test files needed (coverage already written during build). `api`: 30 files/511 tests passed (`npx vitest run`). `web`: 15 files/207 tests passed (`npx ng test --watch=false`). NFR-01 search timing measured in isolation: median=14ms, max=25ms over 20 real requests against the 1,000-row seed (`q=bookmark&size=20`) — both well under spec.md's 500ms target. 0 failures this phase, so no Fail→Fix→Retest entries. One finding recorded (not a code defect): `nfr01-timing.test.js`'s search-timing assertion threshold is `<1000ms`, not the `<500ms` spec.md §4 names F05 as co-owning — flagged for the reviewer/builder, not changed here. Testing gate approved 2026-10-03, rolled up into `docs/04-testing.md` and `docs/03-build.md`'s Feature Evidence Matrix |
| Review | /review-phase F05-search | approved | 2026-10-03 | E-review-505 | Two findings raised, both Accepted and fixed. F05-RV01 (Medium): `SearchBox`'s native input value/`hasText` never resynced when `store.search()` is cleared externally (the no-results state's "Clear search" button bypasses `SearchBox.onClear()`) — fixed with an `effect()` syncing both to `store.search()`. F05-RV02 (Low): NFR-01 search-query assertion loosened to `<1000ms` instead of the spec's implied `<500ms` F04-parity target — tightened to `<500ms`. Both fixes verified: api 516/516 passed (median=14ms/max=25ms observed, well under 500ms), web 207/207 passed, `npx ng build` succeeded, format/lint clean. Zero Rejected/Modified, zero false positives/misses. Review gate approved 2026-10-03, rolled up into `docs/05-review.md` and `docs/03-build.md`'s Feature Evidence Matrix |
| Rolled up to docs | (automatic after each gate) | approved | 2026-10-03 | | |

## Test Matrix

| TC ID | Requirement | Scenario | Expected result | Actual result (observed) | Pass/Fail/Not run | AI helped? |
|---|---|---|---|---|---|---|
| F05-TC01 | F05-AC1 | `GET /api/bookmarks?q=tomato` against title/URL fixtures | 200; only the title-matching bookmark, `total=1` | `bookmarks-route.test.js`/`bookmark-service.test.js` cases pass — 511/511 api tests green | Pass | Yes (written at build) |
| F05-TC02 | F05-AC2 | `q=docs` matches only in the URL, not the title | 200; bookmark included | `bookmark-service.test.js` URL-only fixture passes | Pass | Yes |
| F05-TC03 | F05-AC3 | `q=TOMATO` vs `q=tomato` | identical `items`/`total` | `list-query.test.js`/`bookmark-service.test.js` case-insensitive fixtures pass | Pass | Yes |
| F05-TC04 | F05-AC4, EC12 | `q=100%25` (literal `%`) | only `100% done` matches, `%` not a wildcard | `list-query.test.js` escaped-LIKE assertions pass (`ESCAPE '\\'`) | Pass | Yes |
| F05-TC05 | F05-AC5, EC12 | `q=under_score` (literal `_`) | only the literal-underscore bookmark matches | `list-query.test.js`/`bookmark-service.test.js` underscore-escape fixtures pass | Pass | Yes |
| F05-TC06 | F05-AC6, EC12 | `q=<script>alert(1)</script>` and `q=O'Reilly` | 200 in both cases, never an error; literal substring match only | `bookmarks-route.test.js` hostile-input fixtures pass; `injection-probe.test.js` SQLi payload via `q=` also passes (200, no error) | Pass | Yes |
| F05-TC07 | F05-AC7, EC11 | `q=zzzqqq` with no matches | 200, `items:[]`, `total:0`; no-results UI state | `bookmark-service.test.js` zero-match fixture passes; `bookmark-list.spec.ts` renders the no-results heading/text/`Clear search` action | Pass | Yes |
| F05-TC08 | F05-AC8, F05-EC5 | `total=0` overall, user types a query anyway | F03's all-empty state renders, not F05's no-results state | `bookmark-list.spec.ts` precedence-order tests pass (`allCount()===0` checked first) | Pass | Yes |
| F05-TC09 | F05-AC9, F05-EC3 | `tag=research&q=guide` | items = intersection (AND) | `list-query.test.js` AND-join assertion and `bookmark-service.test.js` combined fixture pass | Pass | Yes |
| F05-TC10 | F05-AC10, EC22 (search half) | search text or page-size changes while `q` active | `page` resets to 1; `q` still carried on size change | `bookmarks.store.spec.ts` covers `setSearchText`/size-change reset | Pass | Yes |
| F05-TC11 | F05-AC11, F05-EC2 | `q=` 210 chars via direct API call | 200, never 400; capped at 200 chars server-side | `list-query.test.js` `normalizeSearchValue()` input-table test (210→200-char truncation) passes; `bookmarks-route.test.js` 210-char case passes | Pass | Yes |
| F05-TC12 | F05-AC12 | keyboard: `Tab` to `#q`, visible focus, associated label, 250ms debounce, `#qx` conditional and keyboard-activatable | all conditions met | `search-box.spec.ts` fake-timer debounce tests pass (12/12 web test files incl. this one); manual keyboard walkthrough was performed during build (F05-T14, 7 attempts, final: human confirmed pass, "Great job, its fixed now") — not re-walked in this testing pass since no UI code changed since that confirmation | Pass | Partially (automated debounce assertion AI-written; keyboard walkthrough is human-performed per testing-standards) |
| F05-TC13 | F05-AC13, F05-EC1 | two keystrokes in flight, slower one resolves later | only the latest search text's response is shown | `bookmarks.store.spec.ts` out-of-order `listRequestToken` guard test passes | Pass | Yes |
| F05-TC14 | F05-EC4 | match only in URL host/path/query | still returned | covered by F05-TC02 (same fixture) | Pass | Yes |
| F05-TC15 | F05-EC6 | clearing search while tag active, or vice versa | only the cleared predicate is dropped | `bookmarks.store.spec.ts` `clearSearch()`/`countText` composition tests pass | Pass | Yes |
| F05-TC16 | NFR-01 (search half) | 1,000-row seed, `q=bookmark&size=20`, 20 real HTTP requests | target: spec.md §4 states <500ms (F05 co-owns with F04); test file itself asserts <1000ms | Observed: **median=14ms, max=25ms** (`npx vitest run test/nfr01-timing.test.js --reporter=verbose`) — comfortably under both the test's own 1000ms assertion and spec.md's 500ms target | Pass | Partially (test written at build; this run's observation is fresh) |
| F05-TC17 | S4/S6 security probe | SQL-injection-shaped payload via `q=` on a live server | 200, no error, no injection effect | `injection-probe.test.js` passes with the SQLi payload URL-encoded into `q=` | Pass | Yes |

17/17 planned cases observed Pass; 0 Fail; 0 Not run.

## AI-Discovered Edge Cases

No *new* edge cases surfaced in this testing pass — F05-EC1 through F05-EC6 were already raised and tested during planning/build (see `spec.md` §3, tagged `AI`), and all are exercised by the existing suite (F05-TC10, TC13, TC14, TC15). No additional edge case emerged from this run.

## Fail → Fix → Retest

None. All 511 api and 207 web tests passed on the first run in this testing phase; no fixes were needed.

## Review Findings

| ID | Finding | Severity | Decision | Fix | Verification |
|---|---|---|---|---|---|
| F05-RV01 | `SearchBox`'s native input value and local `hasText` signal did not resync when `store.search()` was cleared from outside the component (the no-results state's "Clear search" button in `bookmark-list.html` calls `store.clearSearch()` directly) | Medium | Accepted | Added an `effect()` in `search-box.ts` syncing the native input value and `hasText` to `store.search()` whenever they diverge | web suite 207/207 passed (15/15 files), `npx ng build` succeeded, format/lint clean |
| F05-RV02 | NFR-01 search-query assertion in `nfr01-timing.test.js` was `<1000ms`, looser than the `<500ms` F04-parity target `spec.md` §4 implies for F05 | Low | Accepted | Tightened the assertion to `<500ms`; updated describe-block/header comments for clarity | api suite 516/516 passed; observed median=14ms, max=25ms — well under the new threshold |

Zero Rejected/Modified findings; zero false positives or review misses this pass.

## Known Limitations

- **Manual keyboard walkthrough (F05-AC12) not re-performed in this review pass.** It was performed and confirmed passing by the human during build (F05-T14, final attempt, tasks.md). No UI-affecting code changed beyond the F05-RV01 fix (an `effect()` with no new focus/keyboard behavior), so it is recorded here as a Pass carried over from build rather than freshly re-walked.

## Open TODO(human)

- E-planning-501: approx. time and learning fields
- E-design-501: approx. time and learning fields
- E-build-507 through E-build-513: approx. time and learning fields (and E-build-513's decision/what-changed fields)
- E-testing-504: approx. time and learning fields
- Screenshot for F05 (search) still needs to be added to `docs/assets/Screenshots/`

## Blockers

- None
