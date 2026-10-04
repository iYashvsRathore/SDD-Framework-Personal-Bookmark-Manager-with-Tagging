### Evidence E-review-601

**SDLC activity:** review

**Task/feature:** F06-edit-bookmark — `/review-phase F06-edit-bookmark`

**Context given to AI:** `spec.md` (13 AC, 6 edge cases), `lld.md` (14 sections incl. LD-01…LD-04, the AMD-003 amendment, the full error-handling and security-considerations tables), `status.md`, `docs/04-testing.md` Test Matrix (F06-TC01…TC15), `specs/architecture/component-map.json`, `specs/constitution.md`, the `secure-input-handling` and `accessibility-review` skills, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/bookmark-repository.js`, `app/api/src/services/bookmark-service.js`, `app/api/src/routes/bookmarks.js`, `app/web/src/app/features/bookmark-form`, `app/web/src/app/state/bookmarks.store.ts`, and `app/web/src/app/app.ts` source. Live test output from the session was used as corroborating evidence (api: 511/511 tests; web: 207/207 tests, both at the Testing gate).

**Prompt/request:** Review F06-edit-bookmark per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); dev-1 then replied "acppet all suggetd fix for both finding, approve the chanegs."

**AI response summary:** Raised two findings, both Low severity. **F06-RV01** — `bookmark-service.update()` re-implemented `create()`'s url/title/tag validation and the fetch-or-hostname-fallback title decision nearly verbatim instead of sharing a helper, so a future change to either block's order or error-wrapping had two places to update in sync (P6). **F06-RV02** — `App.onEditExisting()` hardcoded `title_source: 'user'` on the synthetic row it builds for the duplicate banner's "Edit existing" trigger, since the 409 `details` object didn't carry the real `title_source`; this made the title pre-fill always show the full title text for this entry point, unlike the row-button edit path, which correctly blanks the title when it was `fetched`/`hostname`-derived. No Critical, High, or Medium finding was raised; the `:id` route-parameter handling, the `updatedAt` conflict-token comparison (server-side only), and the two new banners' accessibility wiring were all confirmed correct with no new finding.

**Your decision:** Accepted (both)

**What you changed and why:** dev-1's instruction: "acppet all suggetd fix for both finding, approve the chanegs" — both findings accepted using each finding's suggested fix, with no modification. F06-RV01: extracted `validatePayload(payload)` and `decideTitle(url, userTitle)` as private helpers inside `createBookmarkService()`, shared by `create()` and `update()`, with no change to either orchestration's rule order, error codes, or messages. F06-RV02: `duplicateUrlError(existing, tags)` extended to fold `existing.title_source` into `details` alongside the already-additive `tags`/`updatedAt` keys (same convention LD-03 established); `bookmark-service.update()`'s duplicate branch threads the real row's `title_source` through unchanged; `ApiErrorBody['details']` (web) gained the matching optional `title_source?` key; `App.onEditExisting()` now reads `details.title_source ?? 'user'` instead of the hardcoded literal.

**How you verified it:** Both fixes applied in one attempt each, with no new test added — F06-RV01 is a pure refactor already covered by the existing 511-test api suite (same assertions, same call paths, now through shared helpers); F06-RV02's `title_source` round-trip through the enriched 409 body is already exercised indirectly by `edit-bookmark.test.js`'s existing `DUPLICATE_URL`/`details` assertions. Full build-verify loop re-run after both changes:
- `npx prettier --write .` / `npx eslint . --fix` (api) → clean, 0 errors.
- `npx vitest run --coverage` (api) → **30 files passed (30), 511 tests passed (511)**, exit 0 — no regression; coverage 97.13%/90.53%/96.34%/99.05% (Q4 target 80%; a marginal increase from the Testing gate's 97.05%/90.27%/96.25%/98.87%, since the extracted helpers are now exercised identically from both `create()`'s and `update()`'s call sites).
- `npx prettier --write .` / `npx eslint . --fix` (web) → clean, 0 errors.
- `npx ng build` (web) → clean, exit 0, 194.77 kB initial total (53.38 kB transfer).
- `npx ng test --watch=false` (web) → **15 files passed (15), 207 tests passed (207)**, exit 0 — no regression.

**Outcome:** Worked — both findings verified fixed on the first attempt, with no regressions in either component's test suite and a small, favorable coverage shift from removing the duplicated orchestration.

**Iteration:** Closed. `specs/features/F06-edit-bookmark/status.md` to be updated with the Review gate approval and this evidence ID. No Critical/High finding remains open for F06.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
