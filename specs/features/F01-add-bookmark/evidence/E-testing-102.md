### Evidence E-testing-102

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — Fail → Fix → Retest during authoring of the new test-phase files (E-testing-101).

**Context given to AI:** The four new test files from E-testing-101, run for the first time against the existing `api` codebase (no application code was touched in this session).

**Prompt/request:** Run the new tests (`npx vitest run`) as part of executing the test plan.

**AI response summary:** First run reported `Test Files 2 failed | 11 passed (13)`, `Tests 1 failed | 273 passed (274)`, plus one whole suite failing to collect. Failure 1 — `test/nfr05-timing.test.js`: `TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.` — a Vitest 5 API-shape bug in the new test file itself (passed `{ timeout: 8000 }` as an options object where the installed Vitest version requires the bare number `8000`). Failure 2 — `test/restart-integrity.test.js` > the AMD-002 cheap-check test: `AppError: You already saved this address.` — the test's own input list included both `https://example.com` and `https://example.com/`, which `normalizeUrl` (correctly, per INV-02) folds to the same value, so the second `create()` call hit the real `DUPLICATE_URL` path the test was not expecting; a test-data defect, not a product defect (the product behaved exactly as INV-02 specifies).

**Your decision:** Modified

**What you changed and why:** These were code-review-obvious test-authoring mistakes (a wrong Vitest call signature; a test fixture that accidentally exercised the duplicate-detection code it wasn't testing) discovered and fixed by the tester directly in this same session, with no application code changed. Per `testing-standards`, the tester may fix a test defect only when the human agrees it is a test defect and not a product one — recording that agreement is the open item below rather than assumed.

**How you verified it:** Fixed the timeout argument to the bare-number form Vitest 5 expects, and replaced the colliding input with two independently-normalizing URLs. Re-ran `npx vitest run`: `Test Files 13 passed (13)`, `Tests 275 passed (275)`, 0 failed.

**Outcome:** worked

**Iteration:** **Open — needs your explicit agreement at the gate:** please confirm both failures were test-authoring defects (not something the product got wrong), so this entry can be marked resolved rather than carried as an open question.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
