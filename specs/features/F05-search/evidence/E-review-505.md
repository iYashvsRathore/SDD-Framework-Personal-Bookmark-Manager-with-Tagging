### Evidence E-review-505

**SDLC activity:** review

**Task/feature:** F05-search — `/review-phase F05-search`

**Context given to AI:** `spec.md` (13 AC, 9 edge cases, NFR-01/03/04), `lld.md` (LD-01..LD-06, security table), `status.md`'s Test Matrix and Known Limitations (carried-forward NFR-01 threshold finding), `component-map.json`, all F05-touched source files (`list-query.js`, `bookmark-service.js`, `routes/bookmarks.js`, `like-escape.js`, `search-box.ts`/`.html`/`.spec.ts`, `bookmark-list.html`, `bookmarks.store.ts`, `icons.ts`, `styles.css`)

**Prompt/request:** Review F05-search for correctness, security, validation, maintainability, accessibility, and defects; produce findings with severity and a suggested fix each; apply accepted fixes via the builder, then verify.

**AI response summary:** Reviewed all files in scope; found two issues. (1) F05-RV01: `SearchBox`'s local `hasText` signal and native input value never resynced when `store.search()` is cleared from OUTSIDE the component (the no-results state's own "Clear search" button in `bookmark-list.html` calls `store.clearSearch()` directly, bypassing `SearchBox.onClear()`) — confirmed via code inspection (no `effect()` existed) and via `search-box.spec.ts` (no test covered the external-clear path). (2) F05-RV02: the NFR-01 threshold mismatch carried forward from testing (search-query assertion `<1000ms` vs. spec.md's implied `<500ms` F04-parity target). Both findings presented with location, severity, rationale, and suggested fix; both Accepted by dev-1. Fixes applied: added an `effect()` in `search-box.ts` syncing the native input value/`hasText` to `store.search()`; tightened `nfr01-timing.test.js`'s F05 search-query assertion to `<500ms` and updated its describe-block comments. Build-verify loop run for both: format clean, lint clean, `npx ng build` succeeded, api suite 516/516 passed (observed median=14ms/max=25ms, well under the new 500ms threshold), web suite 207/207 passed (0 regressions) after the human reverted an unrelated, pre-existing F08 theme-toggle change that had been present in the working tree and was initially mistaken for part of this fix — confirmed via `git status`/`git diff --stat` that only the two F05 files remained modified, and via an isolated stash/revert comparison that the F08 failure was unrelated to the F05 changes.

**Your decision:** Accepted

**What you changed and why:** Accepted both findings as presented, with the suggested fixes applied as-is (no modifications to the proposed approach).

**How you verified it:** Observed directly from command output after the fixes, on a working tree containing only the two F05 files: `npx vitest run` (api) — 516/516 passed; `npx ng test --watch=false` (web) — 207/207 passed, 15/15 test files; `npx ng build` — bundle generated successfully; `npx prettier --write` and `npx eslint . --fix` — no formatting/lint violations on either changed file.

**Outcome:** worked — both findings fixed and verified with zero regressions.

**Iteration:** one retry of the web suite was needed after an unrelated worker SIGTERM flake (infrastructure, not a test failure); the human then reverted unrelated uncommitted F08 changes that had been co-present in the working tree, after which the suite passed cleanly on the first run.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
