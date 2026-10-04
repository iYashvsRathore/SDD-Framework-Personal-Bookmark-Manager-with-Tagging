### Evidence E-testing-801

**SDLC activity:** testing

**Task/feature:** F08-dark-mode — close the two gaps `lld.md` §11 explicitly carried forward to `/test-phase`: F08-AC2/AC3's rendered-DOM contract for the header toggle (aria-pressed/aria-label/icon, no OS `prefers-color-scheme` detection) had no structural assertion anywhere, and F08-AC5/EC26's restart persistence had only a mocked `ThemeStore` reconciliation test, never a real file-backed close/reopen proxy (the pattern already established by F06-AC9/F07-AC14/AC15 in `restart-integrity.test.js`/`delete-bookmark.test.js`).

**Context given to AI:** `spec.md` (10 AC, 6 edge cases), `lld.md` §3/§4/§6/§8/§11 (component changes, contract, UI states, error handling, test hooks), `tasks.md`'s Build-Verify Log, `product-spec.md` NFR-02/NFR-03/NFR-04, `component-map.json` test commands, and the full existing F08 test files (`setting-repository.test.js`, `setting-service.test.js`, `settings-route.test.js`, `theme.store.spec.ts`) plus `app.spec.ts`, `app.html`/`app.ts`, `index.html`, and `restart-integrity.test.js`'s F06-AC9 proxy pattern, all read end-to-end before writing anything.

**Prompt/request:** `/test-phase F08` — after presenting a test plan preview naming the two gaps (AC2/AC3 structural, AC5/EC26 restart proxy) and the AC7 manual keyboard walkthrough, received `GO`, wrote and ran the new tests, then asked the human to perform the walkthrough.

**AI response summary:** Added a new `F08-AC2/AC3 — header theme toggle wiring` describe block to `app.spec.ts` (3 cases: initial render is light with `aria-pressed="false"`/label `"Dark mode"`; a click flips to dark with `aria-pressed="true"`/label `"Light mode"`/`<html data-theme="dark">`; the toggle is a native `<button>` with no custom `tabindex`, reachable by `Tab`), plus a `beforeEach` reset of `document.documentElement.dataset.theme` so the suite is order-independent. Added a new `F08-AC5 / EC26` describe block to `settings-route.test.js`: a real on-disk SQLite file (not `:memory:`), `PUT` to set `dark`, the listener and db connection both closed, then a fresh `createApp`/`createDb` against the same file and a `GET` confirming `{ theme: 'dark' }` survives — the same close/reopen proxy `restart-integrity.test.js` already uses for F06-AC9. One failure found and fixed on the first run: the AC3 click test's `http.expectOne('/api/settings/theme')` matched 2 pending requests (the app constructor's own unflushed `theme.load()` GET plus the test's `PUT`) because it filtered on URL only; fixed by matching `{ url: '/api/settings/theme', method: 'PUT' }`. Re-ran and it passed.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; all four new test cases were accepted as written and the Testing gate was approved as presented.

**How you verified it:** Ran `npx prettier --write` / `npx eslint . --fix` on both edited files (0 errors). Ran the full `api` suite: `npx vitest run` → **30 test files, 517 tests passed, 0 failed** (up from 516 before this phase). Ran `npx vitest run --coverage` (api): **97.13% stmts / 90.53% branch / 96.34% funcs / 99.05% lines** over `src/services` + `src/lib` (Q4 target 80%). Ran the full `web` suite: `npx ng test --watch=false` — first attempt had 1 failure (the `expectOne` ambiguity above); fixed, reformatted, re-ran: **15 test files, 211 tests passed, 0 failed** (up from 207 before this phase). `npx ng test --coverage --watch=false` failed outright with "Code coverage requires either @vitest/coverage-v8 or @vitest/coverage-istanbul to be installed" — the package is not installed in this workspace and no prior F01-F07 testing gate ran it either (all prior gates measured coverage on `api` only); recorded as a known limitation, not a failure, consistent with that established precedent. dev-1 performed the F08-AC7 keyboard walkthrough (Tab to the toggle, visible focus outline, Enter to flip to dark, Tab away and back, Space to flip back to light) against the live running app and confirmed: "passed."

**Outcome:** worked

**Iteration:** One Fail -> Fix -> Retest this phase: the AC3 click test's ambiguous `expectOne` match, fixed by matching on `method` as well as `url`; retest passed.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
