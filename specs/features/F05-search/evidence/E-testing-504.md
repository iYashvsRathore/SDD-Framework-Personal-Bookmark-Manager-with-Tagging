### Evidence E-testing-504

**SDLC activity:** test

**Task/feature:** F05-search — `/test-phase F05-search`

**Context given to AI:** `spec.md` (13 AC, 9 edge cases, NFR-01/03/04), `lld.md`, `tasks.md`'s Build-Verify Log (existing test files already written during build), `component-map.json` (`api`/`web` test commands)

**Prompt/request:** Run the full `api` and `web` suites, isolate and capture the NFR-01 search-timing measurement, build the Test Matrix mapping every AC/EC to an observed result, and flag — without fixing — any discrepancy found.

**AI response summary:** Ran `npx vitest run` (api, 30 files/511 tests) and `npx ng test --watch=false` (web, 15 files/207 tests), both fully passing. Ran `nfr01-timing.test.js` in isolation with `--reporter=verbose` to capture the console.log timing line: search query (`q=bookmark&size=20`) median=14ms, max=25ms over 20 real requests. Built a 17-row Test Matrix covering all 13 AC and 6 new + 3 inherited edge cases. Flagged a threshold mismatch: `spec.md` implies F05 co-owns a <500ms NFR-01 target with F04, but the test file's own assertion is <1000ms (matching F03's list-page budget, not F04's tag-filter test's <500ms). The observed numbers pass either threshold.

**Your decision:** Accepted

**What you changed and why:** Recorded all results in `status.md`'s Test Matrix and Known Limitations; did not modify `nfr01-timing.test.js`'s assertion — a threshold change is a builder/reviewer decision, not the tester's to make unilaterally.

**How you verified it:** Observed directly from command output: `npx vitest run` (511/511 passed), `npx vitest run test/nfr01-timing.test.js --reporter=verbose` (4/4 passed, console.log showed median=14ms max=25ms), `npx ng test --watch=false` (207/207 passed).

**Outcome:** worked — all 511 api + 207 web tests passed; 17/17 planned test matrix cases observed Pass; 0 Fail; one non-blocking finding recorded for the reviewer.

**Iteration:** none needed — no failures to fix/retest this phase.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
