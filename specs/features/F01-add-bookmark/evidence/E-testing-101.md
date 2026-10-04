### Evidence E-testing-101

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — close the declared test-phase gaps named in `spec.md` §3, `lld.md` §11/§12 and `tasks.md`'s Build-Verify Log: the DNS-rebinding half of F01-EC2, EC19 (restart mid-write), the AMD-002 §4 cheap check, a real (non-simulated) NFR-05 measurement, and an S4/NFR-04 SQL-metacharacter probe specific to F01 (no prior F01 test injected one).

**Context given to AI:** `spec.md`, `lld.md`, `tasks.md` (Build-Verify Log), `product-spec.md` NFR-04/NFR-05, `component-map.json` test commands, and the full existing `app/api/test/` suite (266 passing tests) were read first so no case would duplicate existing coverage.

**Prompt/request:** `/test-phase F01` — write and run the tests for the feature's declared-open and fault-injection items, after presenting a test plan preview and receiving `GO`.

**AI response summary:** Proposed four new test files — `nfr05-timing.test.js` (real wall-clock budget check against a genuinely unresponsive loopback server), `ssrf-rebinding.test.js` (a lookup double whose second answer for the same host is private, proving the fetcher never re-resolves between check and connect), `restart-integrity.test.js` (an aborted-transaction proxy for EC19, plus the AMD-002 §4 trailing-slash check against real SQLite rows), and `injection-probe.test.js` (a `'; DROP TABLE bookmark; --` payload in title, user title and URL query string).

**Your decision:** Accepted

**What you changed and why:** Nothing changed.

**How you verified it:** Ran `npx vitest run` in `app/api`: **275 passed (275)**, 13 test files, 0 failed. Ran `npx vitest run --coverage`: 95.49% stmts / 86.61% branch / 98.02% lines over `src/services` + `src/lib` (Q4 target 80%, unchanged from the build gate's 95.21%/86.61%). Ran `npx eslint . --fix` (exit 0) and `npx prettier --check .` (`All matched files use Prettier code style!`) after the new files were added. Separately ran only `test/nfr05-timing.test.js` with a temporary `console.log` to capture the real observed elapsed time — `elapsedMs=5016` — then removed the debug line and re-ran the full suite to confirm it was still green.

**Outcome:** worked

**Iteration:** Two test-authoring defects were found and fixed during this same session before the final green run — see E-testing-102 for the Fail → Fix → Retest record.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
