### Evidence E-review-701

**SDLC activity:** review

**Task/feature:** F07-delete-bookmark — `/review-phase F07-delete-bookmark`

**Context given to AI:** `spec.md` (16 AC, edge cases incl. F07-EC1/EC2), `lld.md` (14 sections incl. §8 Error Handling, §9 Security Considerations), `tasks.md` Build-Verify Log and Plan vs. Actual (F07-T01…T06), `status.md` (Testing gate approved, `E-testing-701`), `docs/04-testing.md` Test Matrix (F07-TC01…TC16, Fail→Fix→Retest, Known Limitations), `specs/architecture/component-map.json`, the `secure-input-handling` and `accessibility-review` skills, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/bookmark-repository.js`, `app/api/src/services/bookmark-service.js`, `app/api/src/routes/bookmarks.js`, `app/web/src/app/state/bookmarks.store.ts`, `app/web/src/app/features/delete-confirm`, `app/web/src/app/features/toast`, and `app/web/src/app/features/bookmark-list` source. Live test output from the session was used as corroborating evidence (api: 516/516 tests; web: 207/207 tests, both at the Testing gate).

**Prompt/request:** Review F07-delete-bookmark per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); dev-1 then accepted both findings and asked for the fixes to be applied and verified.

**AI response summary:** Raised two findings. **F07-RV01** (Medium) — `BookmarksStore.deleteBookmark()`'s catch block swallowed every error identically (`catch (error) { void error; }`), not just the documented 404 — so an unexpected failure (e.g. a 500) was indistinguishable from a quiet success, against U5's actionable-errors clause; `restoreBookmark()`'s sibling method, by contrast, already surfaces failures via `showToast()`. **F07-RV02** (Low) — `tasks.md`'s F07-T05/T06 rows claimed F07-AC14/AC15 restart-check coverage that was actually only added later at `/test-phase`, and F07-AC11/AC12/AC13 were never assigned to any build task row at all — a documentation-accuracy gap. No Critical or High finding was raised; the soft-delete/restore race handling, parameterized SQL, the error taxonomy, and the delete-confirm dialog/toast's accessibility wiring were all confirmed correct with no new finding.

**Your decision:** Accepted (both)

**What you changed and why:** Both findings accepted using each finding's suggested fix, with no modification. F07-RV01: narrowed `deleteBookmark()`'s catch to only suppress `apiError.code === 'NOT_FOUND'`; any other failure now calls `this.showToast(apiError.message)`, mirroring `restoreBookmark()`'s existing pattern; added a regression test asserting a 500 response surfaces `FALLBACK_MESSAGE`. F07-RV02: corrected `tasks.md`'s F07-T05/T06 `Done when` text to state the restart checks were added at `/test-phase`, not at build; added a note acknowledging F07-AC11/AC12/AC13 were only covered at `/test-phase`.

**How you verified it:** Both fixes applied; one mid-session interruption occurred when an out-of-band `git commit` (for an unrelated feature) coincided with the loss of the not-yet-committed F07-RV01 edit, which required re-auditing the working tree (`git status`, `git log`, targeted `grep_search`/`read_file`) before reapplying it. After reapplication: `npx prettier --write` / `npx eslint --fix` (web, both changed files) → clean, 0 errors. `npx ng build` (web) → clean. `npx ng test --watch=false` (web) → **208 passed (208)**, 15 files, 0 failed (207 pre-existing + 1 new). `npx vitest run` (api) → **516 passed (516)**, 30 files, 0 failed, confirming the web-only fix caused no api regression. F07-RV02 was a documentation-only edit, verified by re-reading the corrected `tasks.md` text against `docs/04-testing.md`'s Fail→Fix→Retest record and `E-testing-701`.

**Outcome:** Worked — both findings verified fixed, with no regressions in either component's test suite, after recovering from one out-of-band git interruption unrelated to the fix itself.

**Iteration:** The F07-RV01 code/test edit was lost once to an external git operation and had to be reapplied; it applied cleanly and passed verification both times. Closed. `specs/features/F07-delete-bookmark/status.md` updated with the Review gate approval and this evidence ID. No Critical/High finding remains open for F07.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
