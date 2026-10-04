<!-- GUIDE: Created by /constitution INIT. Filled only by the gate rollup after /review-phase approvals (feature and app). Keep the ## headings exactly as they are. Replace each _Pending_ line and its GUIDE comment when the section is filled. -->
# 05 · Review

## Review Scope

### F01 Add Bookmark

Reviewed against `spec.md` (17 AC), `lld.md` (14 sections incl. LD-01…LD-04, the 6 validation rules, the 15-row untrusted-input table), `tasks.md` Build-Verify Log, `status.md`, `docs/04-testing.md` Test Matrix, `specs/architecture/component-map.json`, `specs/technology.md` §5, and the full `app/api/src` and `app/web/src/app` source trees. Lenses applied: correctness against each AC, security (`secure-input-handling`), validation, maintainability (layering, duplication, naming), accessibility/UX (`accessibility-review`), and defects in error paths and edge cases. Live test/lint/audit/coverage/curl output from the session was used as corroborating evidence (api: 275/275 tests; web: 49/49 tests at review start; both audits 0 vulnerabilities).

### F03 List Bookmarks

Reviewed against `spec.md` (12 AC, 10 edge cases), `lld.md` (14 sections incl. LD-01…LD-04 and AD-07/AS-F03-01's shared `buildPredicate()` contract), `tasks.md` Build-Verify Log (F03-T01…T08), `status.md`, `docs/04-testing.md` Test Matrix (F03-TC01…TC17), `specs/architecture/component-map.json`, and the full `app/api/src` and `app/web/src/app` source trees. Lenses applied: correctness against each AC (in particular that `total` can never disagree with the returned page, per AD-07), security (parameterized SQL, no new untrusted-input surface), validation (pagination clamp helpers), maintainability, accessibility/UX (`accessibility-review`), and defects in error paths and edge cases. Live test/lint/audit output from the session was used as corroborating evidence (api: 319/319 tests; web: 84/84 tests at review start; both audits 0 vulnerabilities).

### F02 Tag Bookmarks

Reviewed against `spec.md` (13 AC, 8 edge cases), `lld.md` (14 sections), `tasks.md` Build-Verify Log and Plan vs. Actual (F02-T01…T12), `status.md`, `docs/03-build.md` and `docs/04-testing.md` F02 sections, `specs/architecture/component-map.json`, `specs/constitution.md`, and the full `app/web/src/app/features/tag-input`, `app/web/src/app/features/bookmark-form`, and `app/api/src/routes/tags.js`/`app/api/test/tags-route.test.js` source. Lenses applied: correctness against each AC, security (`secure-input-handling`), validation, maintainability, accessibility/UX (`accessibility-review`), and defects in error paths and edge cases. Live test output from the session was used as corroborating evidence (api: 364/364 tests; web: 116/116 tests at review start).

### F04 Filter by Tag

Reviewed against `spec.md` (12 AC, 7 edge cases), `lld.md` (14 sections incl. §8 Error Handling, §9 Security Considerations), `tasks.md` Build-Verify Log and Plan vs. Actual (F04-T01…T12), `status.md`, `docs/04-testing.md` Test Matrix (F04-TC01…TC17), `specs/architecture/component-map.json`, `specs/constitution.md`, `specs/architecture/hld.md` §5/§8, and the full `app/api/src/services/list-query.js`, `app/api/src/routes/bookmarks.js`, `app/web/src/app/state/bookmarks.store.ts`, `app/web/src/app/features/tag-rail`, and `app/web/src/app/features/bookmark-list` source. Lenses applied: correctness against each AC (in particular AS-F04-01's single-select semantics and the EC17/EC4 stale-response and rail-desync handling), security (`secure-input-handling` — tag filter as a bound-parameter equality match, never a pattern, S1/S4/S6/S3), validation (`normalizeTagFilterValue`'s never-throws contract, `/bookmarks/count` route-registration order), maintainability (layering, the shared `buildPredicate()` extension per AD-07/AS-F03-01), accessibility/UX (`accessibility-review` — `aria-pressed`, keyboard toggle semantics, the active-filter chip and tag-empty state), and defects in error paths and edge cases. Live test output from the session was used as corroborating evidence (api: 506/506 tests; web: 207/207 tests at Testing gate).

### F05 Search

Reviewed against `spec.md` (13 AC, 9 edge cases, NFR-01/03/04), `lld.md` (14 sections incl. LD-01…LD-06, §8 Error Handling, §9 Security Considerations), `status.md`'s Test Matrix and carried-forward Known Limitations (the NFR-01 threshold finding raised but not fixed at `/test-phase`), `specs/architecture/component-map.json`, and the full `app/api/src/services/list-query.js`/`bookmark-service.js`, `app/api/src/routes/bookmarks.js`, `app/api/src/lib/like-escape.js`, `app/web/src/app/features/search-box` (`.ts`/`.html`/`.spec.ts`), `app/web/src/app/features/bookmark-list/bookmark-list.html`, `app/web/src/app/state/bookmarks.store.ts`, `app/web/src/app/core/icons.ts`, and `app/web/src/styles.css` source. Lenses applied: correctness against each AC (in particular the AND-combination with the tag filter, AS-F05-01), security (`secure-input-handling` — LIKE-escaping via `escapeLikePattern()`, S1/S4/S6), validation (`normalizeSearchValue()`'s 200-char cap and never-throws contract), maintainability (the shared `buildPredicate()` clause-array extension, LD-01/LD-02), accessibility/UX (`accessibility-review` — label association, 250ms debounce, keyboard reachability of the clear button), and defects in UI-state synchronization between `SearchBox` and the store. Live test output from the session was used as corroborating evidence (api: 511/511 tests; web: 207/207 tests at Testing gate).

### F07 Delete Bookmark

Reviewed against `spec.md` (16 AC, edge cases incl. F07-EC1/EC2), `lld.md` (14 sections incl. §8 Error Handling, §9 Security Considerations), `tasks.md` Build-Verify Log and Plan vs. Actual (F07-T01…T06), `status.md` (Testing gate approved, `E-testing-701`), `docs/04-testing.md` Test Matrix (F07-TC01…TC16, AI-Discovered Edge Cases, Fail→Fix→Retest, Known Limitations), `specs/architecture/component-map.json`, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/bookmark-repository.js`, `app/api/src/services/bookmark-service.js`, `app/api/src/routes/bookmarks.js`, `app/web/src/app/state/bookmarks.store.ts`, `app/web/src/app/features/delete-confirm`, `app/web/src/app/features/toast`, and `app/web/src/app/features/bookmark-list` source. Lenses applied: correctness against each AC (in particular the soft-delete/restore race conditions, F07-AC9/AC14/AC15 restart-integrity), security (`secure-input-handling` — parameterized SQL, `:id` validation), validation, maintainability, accessibility/UX (`accessibility-review` — the delete-confirm dialog and toast's keyboard/ARIA wiring), and defects in error paths and edge cases. Live test output from the session was used as corroborating evidence (api: 516/516 tests; web: 207/207 tests at Testing gate).

### F08 Dark Mode

Reviewed against `spec.md` (10 AC, 6 edge cases), `lld.md` (14 sections incl. LD-01…LD-04, the AMD-004 amendment, §8 Error Handling, §9 Security Considerations), `status.md` (Testing gate approved 2026-10-03, `E-testing-801`), `docs/04-testing.md` Test Matrix (F08-TC01…TC10, AI-Discovered Edge Cases, Fail→Fix→Retest, Known Limitations), `specs/architecture/component-map.json`, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/setting-repository.js`, `app/api/src/services/setting-service.js`, `app/api/src/routes/settings.js`, `app/api/src/app.js`, `app/web/src/index.html`, `app/web/src/app/state/theme.store.ts`, `app/web/src/app/app.html`/`app.ts`, and all F08 test files (api + web) source. Lenses applied: correctness against each AC (in particular the LD-02 pre-paint mechanism for F08-AC2/AC3's no-flash guarantee and the LD-03 request-token race guard for F08-AC8), security (`secure-input-handling` — the two-value allow-list, parameterized upsert, and the app-wide `Content-Security-Policy` header's interaction with the pre-paint script), validation (the `INVALID_THEME` boundary check), maintainability (P6 single-source error construction, the `THEME_STORAGE_KEY` duplication between `index.html` and `theme.store.ts`), accessibility/UX (`accessibility-review` — `aria-pressed`, the state-aware label C-F08-04 deviation, native `<button>` keyboard operability), and defects in error paths (F08-AC9 fallback, F08-AC10 storage failure). Live test output from the session was used as corroborating evidence (api: 517/517 tests; web: 211/211 tests at Testing gate).

### App (whole application)

Reviewed at the app level after all eight feature-level reviews were approved: cross-cutting code (`app/api/src/app.js`, `server.js`, the CSP header, the body-limit/error-middleware translation, schema-bootstrap-before-listen ordering, `app/web/proxy.conf.json`), the dependency manifests (`app/api/package.json`, `app/web/package.json`) against `specs/technology.md` §5's register, `specs/product-spec.md` (R01–R15, NFR-01…05), `specs/backlog.md`'s App-level Gates, and the full accumulated F01–F08 review history already recorded in this document. No new component-level source review was needed beyond what each feature's own review already covered — this pass specifically targets gaps that only exist *across* features (shared security headers, dependency hygiene, build/test/smoke health as a whole). Live test/audit/smoke output from this session: api 31 files/518 tests passed, coverage 97.34%/90.85%/97.56%/99.29% (Q4 target 80%, unchanged); web 16 files/212 tests passed, unchanged; both `npm audit --omit=dev` 0 vulnerabilities; smoke check `GET /api/health`/`/api/bookmarks`/`/api/tags` → 200/200/200.

## Findings

No new app-level findings were raised. Every Critical/High finding surfaced across the eight feature-level reviews (F01-RV01, F02-RV01, F08-RV01) was already accepted, fixed, and independently re-verified at its own `/review-phase` gate — see the table below for the full per-feature record.

| ID | Finding | Severity | My assessment | Action taken | How verified |
|---|---|---|---|---|---|
| F01-RV01 | `app/web` has no ESLint configuration at all, so the declared `lint` command in `component-map.json` fails outright, contradicting `technology.md` §5's "ESLint… for both components" commitment. No Build-Verify Log row ever ran it | High | Accepted | `npx ng add @angular-eslint/schematics --skip-confirmation` — scaffolded `eslint.config.js`, added `angular-eslint`/`typescript-eslint` devDependencies | `npx eslint .` → exit 0, zero errors |
| F01-RV02 | `npx prettier --check .` in `app/web` fails on 11 non-`src` meta/IDE config files, contradicting the Testing gate's "All matched files use Prettier code style!" claim | Low | Accepted | `npx prettier --write .` | `npx prettier --check .` → `All matched files use Prettier code style!`, exit 0 |
| F01-RV03 | `BookmarksStore.save()`'s catch branch always wrote a non-`DUPLICATE_URL` API error into `urlError` regardless of `apiError.field`, so a server-side `field:'title'` error would render/focus the wrong input | Low-Medium | Accepted | Changed the catch branch to a 3-way check (`DUPLICATE_URL` / `field === 'title'` → `titleError` / else → `urlError`); added a regression case to `bookmarks.store.spec.ts` | `npx ng test --no-watch` → **Test Files 3 passed (3), Tests 50 passed (50)** (49 pre-existing + 1 new), exit 0 |
| F01-RV04 | The local, git-ignored `app/api/data/tagvault.db` held a non-synthetic row (a `claude.ai` chat URL) left over from manual testing, against constitution D1 | Low | Accepted | `Remove-Item -Recurse -Force .\data\` | `Test-Path .\data\` → False; `npx vitest run` (api) re-run → **275 passed (275)**, exit 0, confirming no regression |
| F03-RV01 | The pagination control's "Page X of Y" text had no `aria-live` region, so a screen-reader user who changes pages gets no announcement when `total` (and therefore the count text) stays the same — only the page text changes silently | Low | Accepted | Added `aria-live="polite"` to the `.page-text` span in `bookmark-list.html`; added a regression test asserting the attribute | `npx ng test --watch=false` → **85 passed (85)**, 6 files, 0 failed (84 pre-existing + 1 new); `npx ng build` clean; full smoke contract 200/200/200/200 |
| F02-RV01 | `BookmarkForm.onSubmit()` only read already-committed tag chips (`store.tags()`), silently discarding any text still sitting in the tag input if the user never pressed Enter/comma before saving — an undeclared deviation from `docs/mockup.html`'s submit handler, which explicitly flushes pending text | High | Accepted | Added `TagInput.commitPendingText()` and called it from `BookmarkForm.onSubmit()` before reading `store.tags()` | `npx ng test --watch=false` → **121 passed (121)**, 8 files, 0 failed (116 pre-existing + 5 new), including a new `bookmark-form.spec.ts` case asserting pending text is committed on submit |
| F02-RV02 | `TagInput.onInput()`'s datalist-selection detection used plain value-equality against the suggestion list, which could false-positive when a user types through a shorter existing tag name en route to a longer one | Medium | Accepted | Switched to the native `inputType === 'insertReplacementText'` signal (fired specifically when a `<datalist>` option is chosen), combined with the suggestion-list membership check | New `tag-input.spec.ts` case asserts typing through a shorter existing suggestion does not auto-commit it |
| F02-RV03 | The tag input's error message region had no `id`, and the `<input>` lacked `aria-describedby`/`aria-invalid`, inconsistent with the URL/Title fields in the same form | Medium | Accepted | Added `id="tgerr"` to the error paragraph, `aria-describedby="tgerr"` and conditional `[attr.aria-invalid]` on the `<input>` | New `tag-input.spec.ts` case asserts the aria wiring is present |
| F02-RV04 | `spec.md` F02-AC11's example (`prefix=DA` → `["database","design"]`) is mathematically impossible against the documented plain-prefix-match algorithm — "design" does not start with "da"; first flagged (unfixed) at the Build gate (F02-T05) | Low | Accepted, amended directly | `spec.md` F02-AC11's second example corrected to `prefix=DOC` → `["docs"]`, with a Change Log entry recording the correction and dev-1's same-day approval | `app/api/test/tags-route.test.js`'s EC4 case (already using the `prefix=DOC` form since F02-T05) now matches the corrected spec example; `npx vitest run` → **364 passed (364)**, 20 files, 0 failed |
| F02-RV05 | Native `<datalist>` dropdown styling is poor (human-reported at the Build gate, F02-T12) — browser-controlled rendering that cannot be restyled with CSS | Info/cosmetic | Accepted as-is | None — an already-documented LLD (§6) trade-off of choosing the native element over a custom listbox; no code change made | N/A — no code change; confirmed as a known, accepted limitation |
| F04-RV01 | `BookmarksStore.selectTag(name)` (card chip handler, always sets) and `toggleTagFilter(nameOrNull)` (rail button handler, toggles) are two differently-named public methods with overlapping but distinct semantics, and nothing at the call site documented why a card chip must never use the toggle version — a future maintainer wiring a new tag-click surface could call the wrong one and silently break AS-F04-01's toggle contract | Low | Accepted | Added explicit cross-reference comments on both methods stating the consequence of swapping them | `npx ng test --watch=false` → **207 passed (207)**, 15 files, 0 failed (comment-only change, no new test needed); `npx ng build` clean (194.76 kB initial total) |
| F04-RV02 | `refreshTagRail()`'s EC17 fallback (`clearTagFilter()`) re-enters `loadList()` from inside the `Promise.all` continuation of a `loadList()`-triggered call, causing a second full list request and a possible one-frame flash of the tag-empty state — tested and intentional, but undocumented in `lld.md`/comments as an accepted trade-off | Low | Accepted | Added a code comment documenting the double-fetch/one-frame-flash as an accepted EC17 trade-off, with a warning not to "optimize" it away without re-checking the request-token guards | `npx ng test --watch=false` → **207 passed (207)**, 15 files, 0 failed; `npx ng build` clean |
| F04-RV03 | The `GET /bookmarks/count` route's comment claimed registration-order protection against a `GET /bookmarks/:id` route that does not currently exist in the file (only `PUT`/`DELETE`/`POST .../restore` use `:id`, different methods) — the comment described a non-load-bearing protection as if it were active today | Info | Accepted | Reworded the comment to forward-looking guidance: register any future `GET /bookmarks/:id` route after this line | `npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed (comment-only change); `npx prettier --check .` clean, `npx eslint .` 0 errors |
| F06-RV01 | `bookmark-service.update()` re-implemented `create()`'s url/title/tag validation and the fetch-or-hostname-fallback title decision nearly verbatim instead of sharing a helper — a future change to the order or error-wrapping of either block had two places to update in sync, against P6 (single source of truth) | Low | Accepted | Extracted `validatePayload(payload)` and `decideTitle(url, userTitle)` as private helpers inside `createBookmarkService()`; both `create()` and `update()` now call them, with no change to the error codes, rule order, or messages | `npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed, coverage 97.13%/90.53%/96.34%/99.05% (unchanged pass count, no regression) |
| F06-RV02 | `App.onEditExisting()` hardcoded `title_source: 'user'` on the synthetic row it builds for the duplicate banner's "Edit existing" trigger, because the 409 `details` object didn't carry the real `title_source` — this made the title pre-fill always show the full title text for this entry point, unlike the row-button edit path, which correctly blanks the title when it was `fetched`/`hostname`-derived so the edit can re-trigger the fetch | Low | Accepted | `duplicateUrlError(existing, tags)` now also folds `existing.title_source` into `details` whenever `tags` is supplied (same additive-only convention as `tags`/`updatedAt`); `bookmark-service.update()`'s duplicate branch passes the real row through unchanged; `ApiErrorBody['details']` (web) gained an optional `title_source` key; `App.onEditExisting()` now reads `details.title_source ?? 'user'` instead of the hardcoded literal | `npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed. `npx ng build` (web) → clean, 194.77 kB initial total. `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed |
| F05-RV01 | `SearchBox`'s native input value and local `hasText` signal did not resync when `store.search()` was cleared from outside the component — the no-results state's own "Clear search" button (`bookmark-list.html`) calls `store.clearSearch()` directly, bypassing `SearchBox.onClear()` — so the header would still show stale search text and a stale clear button after the list had actually returned to unfiltered | Medium | Accepted | Added a constructor `effect()` in `search-box.ts` that resets the native input's value and `hasText` whenever `store.search()` no longer matches what the component is displaying | `npx ng test --watch=false` → **207 passed (207)**, 15 files, 0 failed, no regression; `npx ng build` clean |
| F05-RV02 | The NFR-01 search-query assertion in `nfr01-timing.test.js` (F05-T04) was `<1000ms`, looser than the `<500ms` target `spec.md` §4 implies by naming F05 as NFR-01's co-owner alongside F04 (whose own tag-filter test does assert `<500ms`); flagged (not fixed) at `/test-phase` | Low | Accepted | Tightened the F05 search-query assertion to `<500ms`, matching F04's tag-filter test and the spec's implied target; updated the surrounding describe-block/header comments for clarity | `npx vitest run` → **516 passed (516)**, 30 files, 0 failed; observed median=14ms, max=25ms (n=20) — comfortably under the new threshold |
| F07-RV01 | `BookmarksStore.deleteBookmark()`'s catch block swallowed every error identically (`catch (error) { void error; }`), not just the documented 404 — so an unexpected failure (e.g. a 500) was indistinguishable from a quiet success, against U5's actionable-errors clause. `restoreBookmark()`'s sibling method, by contrast, already surfaces failures via `showToast()` | Medium | Accepted | Narrowed the catch to only suppress `apiError.code === 'NOT_FOUND'`; any other failure now calls `this.showToast(apiError.message)`, mirroring `restoreBookmark()`'s existing pattern; added a regression test asserting a 500 response surfaces `FALLBACK_MESSAGE` via the toast | `npx ng build` clean; `npx ng test --watch=false` → **208 passed (208)**, 15 files, 0 failed (207 pre-existing + 1 new); `npx prettier --check` / `npx eslint` 0 errors |
| F07-RV02 | `tasks.md`'s F07-T05/T06 rows claimed F07-AC14/AC15 restart-check coverage that was actually only added later at `/test-phase`, and F07-AC11/AC12/AC13 were never assigned to any build task row at all — a documentation-accuracy gap | Low | Accepted | Corrected F07-T05/T06's `Done when` text to state the restart checks were added at `/test-phase`, not at build; added a note acknowledging F07-AC11/AC12/AC13 were covered only at `/test-phase`, not assigned to a build task | Reviewed corrected `tasks.md` text directly; cross-checked against `docs/04-testing.md`'s Fail→Fix→Retest record and `E-testing-701`, which confirm the actual timeline |
| F08-RV01 | The app's CSP header (`script-src 'self'`, no `'unsafe-inline'`/nonce/hash) is set on every response, including the static `index.html`. LD-02's inline pre-paint `<script>` in `index.html` had no `nonce`/hash, so in the actual served app the browser blocks it outright under this CSP — the entire "paint the right theme before Angular bootstraps" mechanism silently never ran, and AC2/AC3's explicit "not flash the other one first" guarantee was not met in production. Not caught by the existing tests: route tests check the CSP header value in isolation, and the Angular specs run in jsdom, which does not enforce CSP from an HTTP header | High | Accepted | Moved the pre-paint logic from `index.html`'s inline `<script>` into a new external, same-origin `app/web/public/theme-preboot.js`, referenced via `<script src="theme-preboot.js">` (still blocking, no `defer`/`async`/`module`) — satisfies the existing `script-src 'self'` policy with no inline exception and no CSP weakening | `npx ng build` output inspected directly: `app/api/public/index.html` has no inline `<script>` content, `app/api/public/theme-preboot.js` is served externally; `npx ng test --watch=false` (web) → **212 passed (212)**, 16 files, 0 failed (up from 211); `npx vitest run` (api) → **517 passed (517)**, 30 files, 0 failed, confirming no regression |
| F08-RV02 | `THEME_STORAGE_KEY` (`'tagvault-theme'`) was duplicated as a hand-typed string literal in `index.html`'s inline script and as a named constant in `theme.store.ts`, with a comment acknowledging the two "must be kept in sync by hand" — a future rename of one without the other would silently break AC2/AC3 with no test catching it | Low | Accepted | Added `app/web/src/app/theme-preboot.spec.ts`, which reads `public/theme-preboot.js`'s source via `node:fs` and asserts it contains the same key literal as `ThemeStore.THEME_STORAGE_KEY`; added `@types/node` as a devDependency and `"node"` to `tsconfig.spec.json`'s `types` | `npx ng test --watch=false` (web) → the new test passes as part of the same 212/212 run above; confirmed it fails if the key literal is changed in only one file (verified by inspection of the assertion, not a deliberately-broken run) |

## Accepted Feedback

### F01 Add Bookmark

dev-1 accepted the suggested fix for all four findings, verbatim ("Accept Suggested fix for all findings"). All four were applied as F01-T13 and independently re-verified:

- **F01-RV01** — ESLint scaffolded for `web` via `ng add @angular-eslint/schematics`; `npx eslint .` now exits 0.
- **F01-RV02** — the 11 non-`src` files reformatted; `npx prettier --check .` now reports clean.
- **F01-RV03** — `save()`'s catch branch now consults `apiError.field`; a new test pins the `field:'title'` case.
- **F01-RV04** — the local `app/api/data/` directory (git-ignored, never tracked) deleted; the api test suite (275/275) is unaffected since it runs against `:memory:`.

`npx ng build` was re-run clean after all four fixes (exit 0, output unchanged).

### F03 List Bookmarks

dev-1 accepted the suggested fix for the one finding raised. Applied as F03-T09 and independently re-verified:

- **F03-RV01** — `aria-live="polite"` added to the pagination control's `.page-text` span; a new regression test (`bookmark-list.spec.ts`) asserts the attribute is present even when `total` is unchanged across a page change. `npx ng test --watch=false` → **85 passed (85)**, 0 failed; `npx ng build` re-run clean; full smoke contract (`GET /`, `/api/health`, `/api/bookmarks`, `/api/tags`) re-run at 200/200/200/200.

### F02 Tag Bookmarks

dev-1 accepted all five findings ("Accept all but for RV04 amend the spec and make sure it is approved"), applied as F02-T13 and independently re-verified:

- **F02-RV01** — `TagInput.commitPendingText()` added and called from `BookmarkForm.onSubmit()` before building the payload, so uncommitted tag-input text is no longer silently dropped on save.
- **F02-RV02** — the datalist-pick detection in `onInput()` switched from value-equality to the native `inputType === 'insertReplacementText'` signal, removing the false-positive on partial-typed matches.
- **F02-RV03** — `id="tgerr"`, `aria-describedby="tgerr"` and conditional `aria-invalid` added to the tag input, matching the URL/Title fields.
- **F02-RV04** — dev-1 directed a direct spec fix rather than a deferred flag: `spec.md` F02-AC11's `prefix=DA` example corrected to `prefix=DOC` → `["docs"]`, with a Change Log entry recording the correction and approval the same day.
- **F02-RV05** — accepted as a known, unfixable-via-CSS, LLD-documented trade-off; no code change made.

`npx vitest run` (api) → **364 passed (364)**, 20 files, 0 failed. `npx ng test --watch=false` (web) → **121 passed (121)**, 8 files, 0 failed (116 pre-existing + 5 new regression tests for RV01–RV03). `npx ng build` re-run clean. `npx prettier --write .` / `npx eslint . --fix` clean in both `app/api` and `app/web`.

### F04 Filter by Tag

dev-1 accepted the suggested fix for all three findings raised ("Accepted all suggested fix for all 3 findings, approve the changes"), applied directly (comment/documentation-only, no behavior change) and independently re-verified:

- **F04-RV01** — `selectTag`/`toggleTagFilter` JSDoc comments extended with an explicit cross-reference and the consequence of swapping them.
- **F04-RV02** — `refreshTagRail()`'s EC17 fallback comment extended to document the accepted double-fetch/one-frame-flash trade-off and warn against silently "optimizing" it away.
- **F04-RV03** — the `/bookmarks/count` route's comment reworded from describing a current protection to forward-looking guidance for any future `GET /bookmarks/:id` route.

`npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed. `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed. `npx ng build` clean (194.76 kB initial total). `npx prettier --check .` clean and `npx eslint .` 0 errors in both `app/api` and `app/web`. No new test was added since all three fixes are comments/documentation only, with no behavior change to verify beyond the existing regression suite staying green.

### F06 Edit Bookmark

dev-1 accepted the suggested fix for both findings raised ("acppet all suggetd fix for both finding, approve the chanegs"), applied directly and independently re-verified:

- **F06-RV01** — `validatePayload(payload)` and `decideTitle(url, userTitle)` extracted as private helpers inside `createBookmarkService()`, shared by both `create()` and `update()`; no behavior change to either orchestration's rule order, error codes, or messages.
- **F06-RV02** — `duplicateUrlError()` extended to fold `title_source` into `details` alongside `tags`/`updatedAt`; `bookmark-service.update()`'s duplicate branch threads the real row's `title_source` through; `ApiErrorBody['details']` (web) gained the matching optional key; `App.onEditExisting()` reads `details.title_source ?? 'user'` instead of the hardcoded literal.

`npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed, coverage 97.13%/90.53%/96.34%/99.05% (Q4 target 80%, up slightly from the Testing gate's 97.05%/90.27%/96.25%/98.87% since the extracted helpers are now exercised identically from both call sites). `npx ng build` (web) → clean, 194.77 kB initial total. `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed. `npx prettier --write .` / `npx eslint . --fix` clean in both `app/api` and `app/web`. No new test was added for either fix: F06-RV01 is a pure refactor already covered by the existing 511-test suite; F06-RV02's `title_source` round-trip through the enriched 409 body is already exercised indirectly by `edit-bookmark.test.js`'s existing `DUPLICATE_URL`/`details` assertions, which continue to pass unchanged.

### F05 Search

dev-1 accepted the suggested fix for both findings raised, applied directly and independently re-verified:

- **F05-RV01** — a constructor `effect()` added to `search-box.ts` that keeps the native input's value and `hasText` signal in sync with `store.search()`, so the header no longer shows stale search text after an external clear (e.g. the no-results state's own "Clear search" button).
- **F05-RV02** — `nfr01-timing.test.js`'s F05 search-query assertion tightened from `<1000ms` to `<500ms`, matching F04's tag-filter test and the spec's implied co-ownership target.

`npx vitest run` (api) → **516 passed (516)**, 30 files, 0 failed; observed median=14ms, max=25ms (n=20), comfortably under the new 500ms threshold. `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed, no regression. `npx ng build` clean. `npx prettier --write` / `npx eslint . --fix` clean on both changed files. No new test was added for either fix: F05-RV01's behavior is a UI-state-sync correction with no new user-facing AC to pin beyond the existing `search-box.spec.ts`/`bookmark-list.spec.ts` suites staying green; F05-RV02 is a test-threshold change verified by the same timing measurement it already made.

### F07 Delete Bookmark

dev-1 accepted the suggested fix for both findings raised, applied directly and independently re-verified:

- **F07-RV01** — `BookmarksStore.deleteBookmark()`'s catch branch narrowed to only silently suppress the documented `NOT_FOUND` case; any other failure now surfaces through `showToast(apiError.message)`, the same path `restoreBookmark()` already uses. A new `bookmarks.store.spec.ts` case asserts a 500 response surfaces `FALLBACK_MESSAGE` via the toast.
- **F07-RV02** — `specs/features/F07-delete-bookmark/tasks.md`'s F07-T05/T06 rows corrected to state the F07-AC14/AC15 restart checks were actually added at `/test-phase`, not at build; a note added acknowledging F07-AC11/AC12/AC13 were never assigned to a build task and were only covered at `/test-phase` (`E-testing-701`).

`npx prettier --check` / `npx eslint` (web) → clean, 0 errors. `npx ng build` → clean. `npx ng test --watch=false` (web) → **208 passed (208)**, 15 files, 0 failed (207 pre-existing + 1 new). `npx vitest run` (api) → **516 passed (516)**, 30 files, 0 failed, confirming the web-only fix caused no api regression.

### F08 Dark Mode

dev-1 accepted the suggested fix for both findings raised, applied directly and independently re-verified:

- **F08-RV01** — the LD-02 pre-paint script moved from an inline `<script>` in `index.html` to an external, same-origin `public/theme-preboot.js` referenced via `<script src>`, so it now runs under the existing `script-src 'self'` CSP with no inline exception and no change to the CSP policy itself.
- **F08-RV02** — a new `theme-preboot.spec.ts` asserts `public/theme-preboot.js`'s `localStorage` key literal matches `ThemeStore.THEME_STORAGE_KEY`, catching a future hand-sync drift that no prior test covered.

`npx ng build` (web) → clean; output inspected directly confirms `index.html` carries no inline script and `theme-preboot.js` is served externally. `npx ng test --watch=false` (web) → **212 passed (212)**, 16 files, 0 failed (211 pre-existing + 1 new). `npx vitest run` (api) → **517 passed (517)**, 30 files, 0 failed, confirming no regression. `npx prettier --write` / `npx eslint . --fix` (web) → clean, 0 errors.

## Modified/Rejected Feedback

None. dev-1 accepted every finding's suggested fix as-is, across F01, F02, F03, F04, F05, F06, F07, and F08, with no modification and no rejection (F02-RV04's "amend the spec directly" direction was itself one of the suggested-fix options, not a change to a different fix).

## False Positives / Misses

None. All five findings (four F01, one F03) were confirmed real on investigation and fixed; none was shown to be a false positive. No additional defect was surfaced by the fix-and-verify test runs that either review missed. The one item the F01 review did **not** close — F01-AC16's literal-text-rendering confirmation — was already a known, honestly-recorded gap from `/test-phase`, not a miss introduced or discovered here; it remains open and is **not** claimed as reviewed or fixed. F03 had no equivalent open gap: every F03-specific AC was verified at `/test-phase`, and the two edge cases spec.md §3 already carries forward (EC22's "filter/search stays applied" half, EC23) remain untestable only because they depend on features that don't exist yet (F04/F05/F07), not on anything within F03's own scope. F02's five findings were likewise all confirmed real; none was a false positive, and no additional defect surfaced during the fix-and-verify runs. F04's three findings were also all confirmed real — none was a false positive — and no additional defect was found; notably, no Critical/High/Medium finding was raised against F04 at all, consistent with the Testing gate's thorough AC/EC coverage leaving only maintainability/documentation gaps for review to surface. F05's two findings were both confirmed real on code inspection before being raised (F05-RV01's desync was verified against `search-box.ts`'s actual absence of an `effect()` and `search-box.spec.ts`'s actual test coverage gap, not assumed) and fixed; neither was a false positive, and no additional defect surfaced during the fix-and-verify runs. F06's two findings were both confirmed real (a genuine P6 duplication risk and a genuine, if minor, pre-fill-fidelity inconsistency between the two edit entry points) and fixed; neither was a false positive, and no additional defect surfaced during the fix-and-verify runs. No Critical/High/Medium finding was raised against F06 — the testing phase's new F06-AC7/AC9 automations and the PUT-path security probe had already closed the higher-risk gaps before this review began. F07's two findings were both confirmed real: F07-RV01 was verified against `bookmarks.store.ts`'s actual `catch (error) { void error; }` body (not assumed) and `restoreBookmark()`'s actual, differing failure-handling pattern; F07-RV02 was verified against the actual timeline recorded in `docs/04-testing.md`'s Fail→Fix→Retest section and `E-testing-701`. Neither was a false positive, and no additional defect surfaced during the fix-and-verify runs. No Critical or High finding was raised against F07, consistent with the Testing gate's AC11–AC16 gap-closure already having addressed the feature's higher-risk coverage holes. F08's two findings were both confirmed real before being raised, not assumed: F08-RV01 was verified against the app's actual `CSP_HEADER_VALUE` (`script-src 'self'`, no nonce/hash) and `index.html`'s actual inline `<script>` content, then confirmed to matter by inspecting the real built output in `app/api/public`; F08-RV02 was verified against the actual duplicated string literal in both `index.html` and `theme.store.ts`, and the file's own comment admitting the manual-sync risk. Neither was a false positive, and no additional defect surfaced during the fix-and-verify runs. F08-RV01 (High) is itself a miss by the Testing gate: `docs/04-testing.md`'s F08 Test Matrix and AI-Discovered Edge Cases exercised the pre-paint script's logic directly in jsdom (never under a real CSP-enforcing browser) and the CSP header's value in isolation (never together with the inline script it was meant to also govern) — the two were never tested as a combined system until this review, which is the reason the defect reached review instead of being caught at `/test-phase`.

**App scope.** No new app-level finding was raised, so there is nothing to classify as a false positive or a miss at this level. The whole-app pass (dependency audit, full regression, smoke check, cross-cutting code read of `app.js`/`server.js`/the proxy config) surfaced no defect beyond what the eight feature-level reviews already found and fixed.

## AI Interactions

### Evidence E-review-101

**SDLC activity:** review

**Task/feature:** F01-add-bookmark — `/review-phase F01-add-bookmark`

**Context given to AI:** `spec.md` (17 AC), `lld.md` (14 sections incl. LD-01..04, the 6 validation rules, the 15-row untrusted-input table), `tasks.md` Build-Verify Log, `status.md`, `docs/04-testing.md` Test Matrix, `specs/architecture/component-map.json`, `specs/technology.md` §5, the full `app/api/src` and `app/web/src/app` source trees, and the live test/lint/audit/coverage/curl output captured in this session (api: 275/275 tests, coverage 95.49/86.61/90.38/98.02%; web: 49/49 tests; both audits 0 vulnerabilities; manual curl smoke pass).

**Prompt/request:** Review F01-add-bookmark per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); then dev-1 replied "Accept Suggested fix for all findings."

**AI response summary:** Raised four findings: F01-RV01 (High) — `app/web` has no ESLint configuration at all, so the declared `lint` command fails outright, contradicting `technology.md` §5's "ESLint... for both components" commitment; no Build-Verify Log row ever ran it. F01-RV02 (Low) — `npx prettier --check .` in `app/web` currently fails on 11 non-`src` meta/IDE config files, contradicting the Testing gate's "All matched files use Prettier code style!" claim. F01-RV03 (Low-Medium) — `BookmarksStore.save()`'s catch branch always writes a non-`DUPLICATE_URL` API error into `urlError` regardless of `apiError.field`, so a server-side `field:'title'` error would render/focus the wrong input; currently unreachable because client-side validation mirrors the same rule, and no test covers a `field:'title'` response. F01-RV04 (Low) — the local, git-ignored `app/api/data/tagvault.db` currently holds a non-synthetic row (a `claude.ai` chat URL) left over from manual testing, against constitution D1.

**Your decision:** Accepted

**What you changed and why:** "Accept Suggested fix for all findings" (dev-1's own words) — all four findings accepted exactly as proposed, using each finding's suggested fix with no modification.

**How you verified it:** The builder applied all four fixes (F01-T13) and ran the full build-verify loop in `app/web` and a regression pass in `app/api`, all on the first attempt:
- F01-RV01: `npx ng add @angular-eslint/schematics --skip-confirmation` (exit 0, created `eslint.config.js`); `npx eslint .` → exit 0, zero errors.
- F01-RV02: `npx prettier --write .` then `npx prettier --check .` → `All matched files use Prettier code style!`, exit 0 (the 11 previously-failing files now conform).
- F01-RV03: `bookmarks.store.ts`'s catch branch changed to a 3-way check (`DUPLICATE_URL` / `field === 'title'` / else); a new case in `bookmarks.store.spec.ts` asserts a `field:'title'` 400 sets `titleError` and leaves `urlError` unset. `npx ng test --no-watch` → **Test Files 3 passed (3), Tests 50 passed (50)**, exit 0 (49 pre-existing + 1 new, no regression).
- F01-RV04: `Remove-Item -Recurse -Force .\data\` in `app/api`; `Test-Path .\data\` → False. `npx vitest run` in `app/api` re-run afterward → **275 passed (275)**, exit 0, confirming no regression (the suite runs against `:memory:`, not the deleted file).
- `npx ng build` also re-run clean (exit 0, output to `app/api/public` unchanged).

**Outcome:** Worked — all four findings verified fixed on the first attempt, with no regressions in either component's test suite.

**Iteration:** Closed. `tasks.md` F01-T13 Build-Verify Log and Plan vs. Actual updated with the observed results above. Returning to the reviewer for the Review gate Gate Summary.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-review-309

**SDLC activity:** review

**Task/feature:** F03-list-bookmarks — `/review-phase F03-list-bookmarks`

**Context given to AI:** `spec.md` (12 AC, 10 edge cases), `lld.md` (14 sections incl. LD-01…LD-04, AD-07/AS-F03-01's shared `buildPredicate()`), `tasks.md` Build-Verify Log (F03-T01…T08), `status.md`, `docs/04-testing.md` Test Matrix (F03-TC01…TC17), `specs/architecture/component-map.json`, the `accessibility-review` skill, and the full `app/api/src` and `app/web/src/app` source trees. Live test/lint/audit output from the session was used as corroborating evidence (api: 319/319 tests; web: 84/84 tests at review start; both audits 0 vulnerabilities).

**Prompt/request:** Review F03-list-bookmarks per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); then dev-1 replied with a decision on the one finding raised.

**AI response summary:** Raised one finding — F03-RV01 (Low) — the pagination control's "Page X of Y" text had no `aria-live` region, so a screen-reader user who changes pages gets no announcement when `total` (and therefore the count text) stays the same, only the page text changes silently. All other reviewed areas (the shared-predicate pagination contract AD-07, the LD-04 stale-response token guard, parameterized SQL throughout, the error taxonomy, and the pagination clamp helpers) were confirmed correct with no new finding.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Added `aria-live="polite"` to the `.page-text` span in `bookmark-list.html`, plus a new regression test in `bookmark-list.spec.ts` asserting the attribute is present even when `total` is unchanged across a page change. Full build-verify loop re-run in `web`: `npx prettier --write` (1 file reformatted), `npx eslint --fix` (0 errors, 0 warnings), `npx ng build` (clean, 17.072s), `npx ng test --watch=false` → **85 passed (85)**, 6 files, 0 failed (84 pre-existing + 1 new, no regression). Full smoke contract re-run against a real running server: `GET /`, `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` → 200, 200, 200, 200.

**Outcome:** Worked — the fix verified on the first attempt, with no regressions in the web test suite.

**Iteration:** Closed. `tasks.md` F03-T09 Build-Verify Log and Plan vs. Actual updated with the observed results above. No Critical/High/Medium finding was raised or remains open for F03.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-review-201

**SDLC activity:** review

**Task/feature:** F02-tag-bookmarks — `/review-phase F02-tag-bookmarks`

**Context given to AI:** `spec.md` (13 AC), `lld.md` (14 sections), `tasks.md` Build-Verify Log and Plan vs. Actual, `status.md`, `docs/03-build.md` and `docs/04-testing.md` F02 sections, `specs/architecture/component-map.json`, `specs/constitution.md`, the full `app/web/src/app/features/tag-input`, `app/web/src/app/features/bookmark-form`, `app/api/src/routes/tags.js`/`app/api/test/tags-route.test.js` source, and the live test output captured in this session (api: 364/364 tests; web: 116/116 tests at Testing gate).

**Prompt/request:** Review F02-tag-bookmarks per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); dev-1 then replied "Accept all but for RV04 amend the spec and make sure it is approved."

**AI response summary:** Raised five findings. **F02-RV01** (High) — `BookmarkForm.onSubmit()` only read `store.tags()` (already-committed chips), silently discarding any text typed into the tag input but not yet committed via Enter/comma — a silent data-loss bug and an undeclared deviation from `docs/mockup.html`'s submit handler, which explicitly flushes pending text. **F02-RV02** (Medium) — `TagInput.onInput()`'s datalist-selection detection used plain string equality against the suggestion list, which could false-positive when a user types through a shorter existing tag name en route to a longer one. **F02-RV03** (Medium) — the tag input's error message region had no `id` and the `<input>` lacked `aria-describedby`/`aria-invalid`, inconsistent with the URL/Title fields in the same form. **F02-RV04** (Low) — `spec.md` F02-AC11's example (`prefix=DA` → `["database","design"]`) is mathematically impossible against the documented/implemented plain-prefix-match algorithm ("design" does not start with "da"); flagged but left unfixed at the Build gate (F02-T05). **F02-RV05** (Info/cosmetic) — native `<datalist>` dropdown styling, already a known LLD-documented trade-off from the Build-gate keyboard walkthrough.

**Your decision:** Accepted (all five)

**What you changed and why:** dev-1's instruction: "Accpet all but for RV04 amend the spec and make sure it is approved" — all five findings accepted using each finding's suggested fix, with RV04 specifically handled by directly amending `specs/features/F02-tag-bookmarks/spec.md` (rather than leaving it flagged for a future `/amend-architecture` pass): F02-AC11's second example was corrected from `prefix=DA` → `["database","design"]` to `prefix=DOC` → `["docs"]`, and a Change Log row was added recording the correction and dev-1's same-day approval. RV01: added `TagInput.commitPendingText()` and called it from `BookmarkForm.onSubmit()` before building the payload. RV02: switched the datalist-pick detection to `(event as InputEvent).inputType === 'insertReplacementText'` combined with the suggestion-list membership check. RV03: added `id="tgerr"` to the error paragraph and `aria-describedby="tgerr"` / conditional `[attr.aria-invalid]` to the `<input>`. RV05: no code change — confirmed as an accepted, unfixable-via-CSS trade-off already documented in `lld.md` §6.

**How you verified it:** All fixes applied in one attempt each, with new/modified regression tests added to `tag-input.spec.ts` (RV01, RV02, RV03) and `bookmark-form.spec.ts` (RV01), plus a comment-only update to `app/api/test/tags-route.test.js` reflecting the RV04 correction. Full build-verify loop run after all changes:
- `npx vitest run` (in `app/api`) → **20 files passed (20), 364 tests passed (364)**, exit 0 — no regression (no functional api code changed).
- `npx ng test --watch=false` (in `app/web`) → **8 files passed (8), 121 tests passed (121)**, exit 0 (116 pre-existing + 5 new: 2 for RV01, 1 for RV02, 1 for RV03 in `tag-input.spec.ts`; 1 for RV01 in `bookmark-form.spec.ts`).
- `npx prettier --write .` and `npx eslint . --fix` in both `app/web` and `app/api` → clean, 0 errors.
- `npx ng build` (in `app/web`) → clean, `Application bundle generation complete` (6.128s), main 172.64 kB / styles 6.63 kB.

**Outcome:** Worked — all five findings verified fixed/accepted on the first attempt, with no regressions in either component's test suite, and the RV04 spec correction recorded as approved in `spec.md`'s own Change Log.

**Iteration:** Closed. `specs/features/F02-tag-bookmarks/tasks.md` F02-T13 Build-Verify Log and Plan vs. Actual updated with the observed results above. No Critical/High finding remains open for F02.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

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

**Iteration:** The F07-RV01 code/test edit was lost once to an external git operation and had to be reapplied; it applied cleanly and passed verification both times. Closed. `specs/features/F07-delete-bookmark/status.md` to be updated with the Review gate approval and this evidence ID. No Critical/High finding remains open for F07.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-review-801

**SDLC activity:** review

**Task/feature:** F08-dark-mode — `/review-phase F08-dark-mode`

**Context given to AI:** `spec.md` (10 AC, 6 edge cases), `lld.md` (14 sections incl. LD-01…LD-04, the AMD-004 amendment, §8 Error Handling, §9 Security Considerations), `status.md` (Testing gate approved 2026-10-03, `E-testing-801`), `docs/04-testing.md` Test Matrix (F08-TC01…TC10, AI-Discovered Edge Cases, Fail→Fix→Retest, Known Limitations), `specs/architecture/component-map.json`, the `secure-input-handling` and `accessibility-review` skills, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/setting-repository.js`, `app/api/src/services/setting-service.js`, `app/api/src/routes/settings.js`, `app/api/src/app.js`, `app/web/src/index.html`, `app/web/src/app/state/theme.store.ts`, `app/web/src/app/app.html`/`app.ts`, and all F08 test files source. Live test output from the session was used as corroborating evidence (api: 517/517 tests; web: 211/211 tests, both at the Testing gate).

**Prompt/request:** Review F08-dark-mode per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); dev-1 then accepted both findings and asked for the fixes to be applied and verified.

**AI response summary:** Raised two findings. **F08-RV01** (High) — the app's CSP header (`script-src 'self'`, no `'unsafe-inline'`/nonce/hash, set on every response including the static `index.html`) blocks LD-02's inline pre-paint `<script>` outright in the actual served app, since it carries no `nonce`/hash — the entire "paint the right theme before Angular bootstraps" mechanism silently never runs in production, defeating F08-AC2/AC3's explicit no-flash guarantee. This was invisible to the existing tests: the route tests check the CSP header value in isolation, and the Angular specs run in jsdom, which does not enforce CSP from an HTTP header. **F08-RV02** (Low) — `THEME_STORAGE_KEY` is duplicated as a hand-typed string literal in `index.html`'s inline script and as a named constant in `theme.store.ts`, with the file's own comment acknowledging the two "must be kept in sync by hand"; no test caught a future drift between them. No Critical finding was raised; the allow-list validation (S1), parameterized upsert (S4), the LD-03 rapid-toggle token guard (F08-AC8), the `localStorage` failure handling (F08-AC10), the keyboard/ARIA wiring (F08-AC7, U1/U2), and the restart-persistence proxy (F08-AC5/EC26) were all confirmed correct against `lld.md` with no new finding.

**Your decision:** Accepted (both)

**What you changed and why:** Both findings accepted using each finding's suggested fix, with no modification. F08-RV01: moved the pre-paint logic from `index.html`'s inline `<script>` into a new external, same-origin `app/web/public/theme-preboot.js`, referenced via a plain blocking `<script src="theme-preboot.js">` (no `defer`/`async`/`module`, so it still runs before first paint) — this satisfies the existing CSP with no inline exception and no weakening of the policy itself. F08-RV02: added `app/web/src/app/theme-preboot.spec.ts`, which reads `public/theme-preboot.js`'s source via `node:fs` and asserts it contains the same `localStorage` key literal as `ThemeStore.THEME_STORAGE_KEY`; this required adding `@types/node` as a devDependency and `"node"` to `tsconfig.spec.json`'s `types` array (previously only `vitest/globals`).

**How you verified it:** Both fixes applied in one attempt each, with one transient infrastructure interruption. `npx prettier --write` / `npx eslint . --fix` (web) → clean, 0 errors. `npx ng test --watch=false` (web) first attempt hit a vitest worker-pool crash unrelated to the change (`SIGTERM` during a forked-worker startup, the same class of transient flake already recorded at the F06 gate); retried cleanly: **212 passed (212)**, 16 files, 0 failed (211 pre-existing + 1 new). `npx vitest run` (api) → **517 passed (517)**, 30 files, 0 failed, confirming the web-only fix caused no api regression. `npx ng build` re-run, then the built output inspected directly: `app/api/public/index.html` contains only `<script src="theme-preboot.js">` and the Angular bundle's own `<script src="main-....js" type="module">`, no inline script content; `app/api/public/theme-preboot.js` exists as a separate file. Independently re-verified as the reviewer: re-ran `npx ng test --watch=false` (web, 212/212), `npx vitest run` and `npx vitest run --coverage` (api, 517/517, coverage unchanged at 97.13%/90.53%/96.34%/99.05%), and rebuilt + re-inspected the served `index.html`/`theme-preboot.js` directly, rather than trusting the builder's report alone.

**Outcome:** worked — both findings verified fixed, with no regressions in either component's test suite, after one transient (unrelated) test-runner flake resolved itself on retry.

**Iteration:** One retry of the web test suite was needed due to a transient vitest worker-pool `SIGTERM` crash (infrastructure, not a test failure caused by this change); the retry passed cleanly on the first attempt. Closed. `specs/features/F08-dark-mode/status.md` to be updated with the Review gate approval and this evidence ID. No Critical/High finding remains open for F08.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-review-901

**SDLC activity:** review

**Task/feature:** app — `/review-phase app`

**Context given to AI:** `specs/backlog.md` (App-level Gates table, requiring testing approved before review), `specs/product-spec.md` (R01–R15, NFR-01…05), `specs/architecture/component-map.json` (commands, audit, smoke), `app/api/src/app.js`/`server.js`, `app/web/proxy.conf.json`, `app/api/package.json`/`app/web/package.json` against `specs/technology.md` §5's dependency register, and the full prior per-feature review history already rolled up in this document (F01–F08 findings, accepted fixes, and verifications).

**Prompt/request:** `/review-phase App` — whole-application review: cross-cutting code review, dependency audit for both components, full regression, smoke check, and the Final Readiness Check mapping every R-ID and NFR to its final solution and status.

**AI response summary:** Ran `npm audit --omit=dev` in `app/api` and `app/web` (0 vulnerabilities each, manifests matching `technology.md` §5's register exactly). Re-ran the full regression suites: api 31 files/518 tests passed, coverage 97.34%/90.85%/97.56%/99.29% (Q4 target 80%, unchanged from the Testing gate); web 16 files/212 tests passed, unchanged. Ran a live smoke check against a real running server (`GET /api/health`, `/api/bookmarks`, `/api/tags` → 200/200/200). Reviewed `app.js`, `server.js`, and the dev proxy config for cross-cutting issues (CSP header, body-limit/error-middleware translation, schema-bootstrap-before-listen ordering) and found nothing new. Built the Final Readiness Check table mapping all 15 FRs and 5 NFRs to their owning feature(s) and test IDs, marking R01 `Partial` (F01-AC16's literal-text-rendering manual check remains honestly recorded as "Not run" since `/test-phase F01`) and every other item `Done`.

**Your decision:** Accepted

**What you changed and why:** No code was changed — no new app-level finding was raised, since every Critical/High issue found across the eight feature reviews (F01-RV01, F02-RV01, F08-RV01) was already fixed and independently re-verified at its own gate.

**How you verified it:** Directly, in this session: `npm audit --omit=dev` (api, web) → 0 vulnerabilities each. `npx vitest run --coverage` (api) → 31 files, 518 tests passed, coverage 97.34%/90.85%/97.56%/99.29%. `npx ng test --watch=false` (web) → 16 files, 212 tests passed. Live smoke check via `Invoke-WebRequest` against a running `node src/server.js` instance → 200/200/200 on all three endpoints.

**Outcome:** worked

**Iteration:** None — no new finding was raised, so there was nothing to fix or re-verify beyond the regression/audit/smoke confirmation above.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

## Final Readiness Check

| Item | Type (FR/NFR) | Final solution mapping | Status |
|---|---|---|---|
| R01 Add Bookmark | FR | F01 (F01-TC01…TC18) | Partial — F01-AC16's literal-text-rendering manual check remains "Not run" (`docs/04-testing.md`); every other AC/EC automated and passing |
| R02 Tag Bookmarks | FR | F02 (F02-TC01…TC16) | Done |
| R03 List Bookmarks | FR | F03 (F03-TC01…TC17) | Done |
| R04 Filter by Tag | FR | F04 (F04-TC01…TC17) | Done |
| R05 Search | FR | F05 (F05-TC01…TC15) | Done |
| R06 Edit Bookmark | FR | F06 (F06-TC01…TC15) | Done |
| R07 Delete Bookmark | FR | F07 (F07-TC01…TC16) | Done |
| R08 Persistence | FR | F01, F03, F06, F07 restart-integrity/settings-route real-restart tests | Done |
| R09 Validation | FR | F01, F02, F06 | Done |
| R10 Duplicate Handling | FR | F01, F06 | Done |
| R11 Empty/Error States | FR | F01, F03, F04, F05, F07 | Done |
| R12 Dark Mode | FR | F08 (F08-TC01…TC10) | Done |
| R13 Undo Delete | FR | F07 | Done |
| R14 Tag Autocomplete | FR | F02 | Done |
| R15 Paginated List | FR | F03 | Done |
| NFR-01 Performance | NFR | F03/F04/F05 `nfr01-timing.test.js` | Done |
| NFR-02 Persistence | NFR | `restart-integrity.test.js`, `settings-route.test.js` real-restart proxies | Done |
| NFR-03 Accessibility | NFR | Manual keyboard walkthroughs across F01–F08, structural a11y specs | Done |
| NFR-04 Security | NFR | `injection-probe.test.js`, `tag-security-probe.test.js`, `ssrf-rebinding.test.js`, `address-range.test.js` | Done |
| NFR-05 Robustness | NFR | `nfr05-timing.test.js` | Done |

<!-- Completion checklist (checked by /status and /sync-check; remove when all pass):
- [ ] 7 mandatory ## headings, exact and in order.
- [ ] Every finding has the human's assessment and action. Accepted fixes are verified.
- [ ] At least 3 complete E-review records. Readiness covers every R-ID and NFR ID.
-->
