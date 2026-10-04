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
