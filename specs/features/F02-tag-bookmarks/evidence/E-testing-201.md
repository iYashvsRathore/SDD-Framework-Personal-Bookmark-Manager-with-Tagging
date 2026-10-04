### Evidence E-testing-201

**SDLC activity:** testing

**Task/feature:** F02-tag-bookmarks — write and run the test plan: re-run all 13 AC + 8 EC cases already automated by the builder, plus two new AI-proposed security probes closing gaps `testing-standards`/`secure-input-handling` flag as not yet covered (attack-shaped tag payloads over real HTTP, and a literal-`_`-in-prefix proof against a real database).

**Context given to AI:** `spec.md` (13 AC, 8 EC), `lld.md` §7 (validation rules), §9 (security table), §11 (test hooks), `tasks.md`'s Build-Verify Log (364 prior passing tests across both components), `product-spec.md` NFR-03/NFR-04, `component-map.json` test/coverage commands, and the full existing F02 test files (`tag-service.test.js`, `tags-route.test.js`, `tag-repository.test.js`, the F02 additions in `bookmark-service.test.js`, `tag-chip.spec.ts`, `bookmarks.store.spec.ts`, `tag-input.spec.ts`, `bookmark-form.spec.ts`) read first to avoid duplicating any case.

**Prompt/request:** `/test-phase F02-tag-bookmarks` — after presenting a test plan preview and receiving `GO`, write and run the two new probe cases and re-run the full regression.

**AI response summary:** Added `test/tag-security-probe.test.js` (a SQL-metacharacter tag payload and an XSS-shaped tag payload, both asserted `400 INVALID_TAG` with zero rows written and both `bookmark`/`tag` tables intact afterward, plus one positive-path twin proving a valid tag round-trips literally) and one new `describe` block in `test/tags-route.test.js` (a tag named `a_bc` vs. `a1bc`, proving a prefix containing a literal `_` matches only the literal tag, never as a SQL `LIKE` wildcard — S6).

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; both additions were accepted as written.

**How you verified it:** Ran `npx vitest run` in `app/api`: **20 test files, 364 tests passed, 0 failed**. Ran `npx vitest run --coverage`: **96.93% stmts / 88.84% branch / 96.92% funcs / 99.17% lines** over `src/services` + `src/lib` (Q4 target 80%). Ran `npx prettier --check .` (one file needed `--write`, then re-checked clean) and `npx eslint . --fix` (0 errors). Ran `npx ng test --watch=false` in `app/web` (no web test files changed this phase): **8 test files, 116 tests passed, 0 failed** — unchanged from the Build gate baseline. Started `node src/server.js` and confirmed the full smoke contract: `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` → 200/200/200.

**Outcome:** worked

**Iteration:** One formatting pass needed on the new probe file (`prettier --write`); re-ran the full suite afterward to confirm still 364/364. No test failure occurred.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
