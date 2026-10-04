<!-- GUIDE: Created by /constitution INIT. Filled only by the gate rollup after /build-feature approvals (and /review-phase fixes). Keep the ## headings exactly as they are. Replace each _Pending_ line and its GUIDE comment when the section is filled. -->
# 03 · Build

## Implementation Plan vs. Actual

### F01 Add Bookmark

Twelve tasks (F01-T01…T12) built in order, each followed by the build-verify loop. Eight went in as planned; four deviated, all recorded below with reasons. Two tasks stopped on contradictions in the approved specs rather than guessing, and both were ruled by dev-1.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01–T04 | As written | As written | — |
| T05 | Seam `createTitleFetcher({ lookup, request, clock })` | Seam `createTitleFetcher({ lookup, request, clock, isBlocked })` | The LLD §11 mandated loopback test cannot run against `127.0.0.1` while the guard it is meant to prove is active. `isBlocked` defaults to the real guard, so production is unchanged, and the one file that overrides it carries a banner comment saying so |
| T06 | Repository, service, POST route | As planned, **plus** `asClientBodyError()` in `app.js` | A manual `curl` found body-parser's own errors returning 500 for a client fault. Neither the LLD nor the HLD specified that path. Fixed with the **existing** `INVALID_URL` code and message — no new error code or user-facing string invented |
| T07 | As written | As written | — |
| T08 | Scaffold per plan | As planned, **minus** the router | `app.config.ts` provides no router and `app.routes.ts` was deleted: F01 is a single page and the backlog adds no routes, so an empty route table would be an abstraction the spec does not need (constitution "simple first") |
| T09 | Files per plan | As planned, **plus** `src/test-setup.ts` | jsdom has no `<dialog>` modal implementation. The shim reproduces open/close state only and explicitly does **not** fake the focus trap, so the tests cannot overclaim what they verify |
| T10 | Files per plan, including `features/toast/` | As planned | The toast was briefly inlined in `app.html`, then extracted to `features/toast/` to match the approved file list rather than deviate silently |
| T11 | Notice rendered in the dialog's note region | Notice announced in the `#toasts` region, **text unchanged** | F01-AC5 contradicted itself (notice in the dialog **and** the dialog closes). dev-1 ruled option A; `lld.md` §6 now records the ruling and the two rejected alternatives |
| T12 | Build to `app/api/public`, serve under CSP | As planned, **plus** `optimization.styles.inlineCritical: false` | Angular's default critical-CSS inlining emits an inline `<script>` that `script-src 'self'` blocks. Turning the optimizer off keeps the CSP verbatim per HLD §8; weakening the CSP to suit the build tool was rejected |
| T12 | — | `src/index.html` title `Web` → `TagVault` | Scaffold leftover; the browser tab showed the component id rather than the product name |

**Architecture wording that the build could not fix.** Two approved decisions now disagree with working, dev-1-ruled code, and `/build-feature` owns neither file: `data-model.md` INV-02 (and `lld.md` LD-04) still describe the narrow trailing-slash rule, and `spec.md` F01-AC5 still places the fetch-failure notice inside the dialog. Both need an amendment before `/review-phase` reads them as defects.

### F03 List Bookmarks

Eight tasks (F03-T01…T08) built in order, each followed by the build-verify loop. Six went in as planned; two deviated, both recorded below with reasons.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01 | As written | As written, 1 attempt, 0 failures | — |
| T02 | Built and verified independently of T03 | Built and verified together with T03, in one build-verify pass | Landing T02 alone leaves `GET /api/bookmarks` calling a now-deleted `service.listRecent()`, breaking the declared smoke check and `list-route.test.js` — a real regression the per-task build-verify loop would have to fail on. Combining T02+T03 avoids ever landing a broken intermediate state, consistent with `lld.md` §13's claim that every task leaves the app buildable and runnable |
| T03 | Built and verified independently of T02 | Built and verified together with T02 (see above) | Same reason as T02 |
| T04 | As written | As written, 1 attempt, 0 failures | — |
| T05 | As written | As planned overall; one test-only async-timing fix (`await Promise.resolve()` after an un-awaited `flush()`), and one self-caught fix: `loadList()`'s failure path originally returned a cause-dependent message, which does not satisfy F03-AC11's one-fixed-message requirement — fixed before T06 began | The test needed to await a tick after flushing an HTTP response for a call the code under test does not itself await. The AC11 mismatch was caught by re-reading `spec.md` against the just-written code before building on top of it |
| T06 | As written | As planned, production code unchanged from first draft. `npx ng test` appeared to hang (no output for 60-150s across 3 invocations); diagnosed with a temporary minimal smoke spec, confirming transient environment slowness (the same session's `eslint --fix` and `ng build` were independently 10-20x their historical durations, with climbing CPU usage proving progress, not a deadlock) | No code or test defect; documented so a future slow `ng test` run is not mistaken for a real hang without first checking process CPU usage |
| T07 | As written | As written, 2 attempts: markup landed and compiled first, then 4 tests were added proving F03-AC4/AC6/AC9/AC10 | Matched the chosen shape (select + Previous/Next + "Page X of Y" text) before writing tests, to confirm the markup compiled first |
| T08 | Wire `<app-bookmark-list>` into the shell | As planned, **plus** `addRequested` changed from `output<void>()` to `output<Event>()` so the real click event reaches `openDialog()`, preserving the existing Esc-returns-focus-to-opener behavior | Implied by T06's `addRequested.emit()` call but not spelled out as a signature change in `lld.md` |

### F02 Tag Bookmarks

Twelve tasks (F02-T01…T12) built in order, each followed by the build-verify loop. Ten went in exactly as planned; two deviated from their literal Done-when text, both recorded below with reasons, plus one cosmetic finding from the human's keyboard walkthrough.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01–T03 | As written | As written | — |
| T04 | Change `bookmark-repository.js`, `bookmark-service.js`, `bookmark-service.test.js` only | As planned, **plus** one assertion fixed in the pre-existing `bookmarks-route.test.js` | `insert()` now always attaches a `tags` field (F02-AC1), which broke an F01 test hard-asserting a 6-key response shape. Updated that one assertion to include `tags`, since the shape change is an intended, permanent contract (E-build-204) |
| T05 | Reproduce `spec.md` F02-AC11's literal `prefix=DA` example → `["database","design"]` | Substituted `prefix=DOC` → `["docs"]` instead | `spec.md`'s own example is mathematically inconsistent with the LLD's documented plain-prefix-match algorithm — "design" does not start with "da". Flagged for `/amend-architecture` or a spec.md fix rather than silently rewritten (E-build-201) |
| T06, T07 | As written | As written | — |
| T08 | As written | As planned, after one test-only fix: a Backspace-removal test's `.focus()` call triggered the component's real `(focus)` binding, firing an unflushed HTTP request that poisoned `TestBed` teardown for every later test in the file | Added an explicit `http.expectOne(...).flush([])` after the `.focus()` call (E-build-202) |
| T09, T10 | As written | As written | — |
| T11, T12 | End-to-end wiring check and keyboard walkthrough | As planned; all five human-performed checks passed (chip commit, Tab order, Backspace removal, remove-button labels, suggestion list appearing) | One cosmetic finding: the native `<datalist>` suggestion dropdown's "look and feel" was reported poor by the human. Not a code defect — `<datalist>` styling is browser-controlled and the LLD explicitly chose it over a custom dropdown (§6/§7.2). Flagged for `/review-phase` (E-build-203) |

**Architecture wording that the build could not fix.** `spec.md` F02-AC11's `prefix=DA` example disagrees with the LLD's own plain-prefix-match algorithm and `/build-feature` owns neither file. Needs an amendment or spec fix before `/review-phase` reads it as a defect.

### F04 Filter by Tag

Twelve tasks (F04-T01…T12) built in order, each followed by the build-verify loop. Eleven went in exactly as planned; one task's test design was corrected before any test run, recorded below.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01–T03 | As written | As written, 1 attempt each, 0 failures | — |
| T04–T06 | As written | As written, 1 attempt each, 0 failures | — |
| T07 | `tag-rail.ts`, `tag-rail.html`, `icons.ts` | As planned, **plus** `tag-rail.spec.ts` | Every other component in this codebase carries its own unit-test file; the LLD's file list predates that convention already established by F01-F03 |
| T08 | `bookmark-list.ts`, `bookmark-list.html` | As planned, **plus** an update to the existing `bookmark-list.spec.ts` | F03's own "renders each tag as a plain, non-interactive span" assertion was superseded by F04's chips-as-buttons change and had to be replaced, not just extended |
| T09 | Mount `<app-tag-rail />` | As planned, **plus** a one-attempt fix: the rail's "All bookmarks" icon needed the same `.ic`/`aria-hidden="true"` wrapper every other icon in the app already carries | Caught by the pre-existing `app.spec.ts` accessibility assertion, not a new requirement |
| T10 | As written | As written, 1 attempt, 0 failures | — |
| T11 | Test `refreshTagRail`/EC17/EC4 by exercising them through `loadList()` | Tested `refreshTagRail()` directly, awaiting its own returned promise | `loadList()` only invokes `refreshTagRail()` as a fire-and-forget call (`void this.refreshTagRail()`), so awaiting only `loadList()`'s own promise cannot deterministically observe `refreshTagRail()`'s internal continuation settling; this was caught and corrected via code review before any test was run, so no fix-attempt was spent on it |
| T12 | Manual keyboard walkthrough | As planned | dev-1 confirmed Tab order, visible focus, and Enter/Space activation all correct across the rail and the active-filter chip |

### F06 Edit Bookmark

Eleven tasks (F06-T01…T11) built in order, each followed by the build-verify loop. Ten went in exactly as planned; one task (T05) hit a test-fixture bug fixed in a single retry; the closing manual task (T11) additionally surfaced and fixed a pre-existing defect in **F03**, out of this feature's own scope.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01–T04 | As written | As written, 1 attempt each, 0 failures | — |
| T05 | `edit-conflict.test.js`: two sequential `service.update()` calls simulating "two tabs" | As planned, 2 attempts | First attempt used the same fixed clock for `create()` and Tab A's `update()`, so `updated_at` never actually advanced and Tab B's stale-timestamp check spuriously passed instead of rejecting. Fixed by giving Tab A's save its own clock, distinct from `create()`'s — a test-fixture bug, not a product defect |
| T06–T10 | As written | As written, 1 attempt each, 0 failures | — |
| T11 | Manual keyboard walkthrough (F06-AC13) and the F06-AC7 ordering check | As planned, **plus** an out-of-band fix | The human's walkthrough found the duplicate banner's *View existing* button (F01-AC11, specified as F03's to wire per `F01/spec.md` §9) had never been wired — F03-T08 only wired `addRequested`. Fixed as a clamp-and-highlight (`hld.md` §7, decision A05): `App.onViewExisting()` closes the dialog, clears the tag filter, resets to page 1, reloads, then a new `BookmarkList.scrollToAndFlash(id)` scrolls to and flashes the row (`.card.flash`/`@keyframes fl` in `styles.css`, ported from `docs/mockup.html`'s `showDup()`). Recorded against **F03's** `status.md`, not F06's task list — the changed files are F03-owned and no F06 acceptance criterion changed |

**Architecture wording that the build could not fix.** None — `hld.md` v3 already describes `EDIT_CONFLICT` via AMD-003, applied during `/design-feature`.

### F05 Search

Fourteen tasks (F05-T01…T14) built in order, each followed by the build-verify loop. Twelve went in as planned, one (F05-T06) corrected a stale LLD assumption before any code was written, and the closing manual task (F05-T14) surfaced two production defects that were diagnosed and fixed before the walkthrough could pass.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01 | As written | As written, 2 attempts | First attempt corrupted `list-query.js`/`list-query.test.js` via two overlapping `replace_string_in_file` matches; rewritten precisely on the second attempt |
| T02–T05 | As written | As written, 1 attempt each, 0 failures (T03 hoisted a test helper to module scope to fix a lint-only `no-undef`) | — |
| T06 | Port `search`/`x` icons, following "the existing `x`-icon's two-subpath precedent" | Both icons added fresh | No pre-existing `x` icon was actually present in `icons.ts` — the LLD's reference to one did not match the shipped code |
| T07, T12 | Built and verified separately | Built and verified together in one pass | The task briefs' done-checks are textually identical (store change + its own tests), so splitting them would mean landing an intermediate state with no test coverage |
| T08 | As written | As written, 3 attempts | `http.verify()` failed twice on unflushed `/api/tags`/`/api/bookmarks/count` follow-up requests from `loadList()`'s `refreshTagRail()` call; fixed by awaiting two `Promise.resolve()` microtask ticks between the primary flush and the follow-up `expectOne` calls |
| T09 | As written | As written, 2 attempts | Reordering the empty-state branches regressed 12 tests whose fixtures never set `store.allCount()` (defaulted to 0, triggering the new all-empty branch); fixed by defaulting `allCount.set(1)` in the shared test fixtures |
| T10, T11 | As written | As written, 1 attempt each, 0 failures | — |
| T13 | As written | As written, 1 attempt (which also fixed a latent F05-T09 bug) | A new test exposed that `@else if (...; as activeSearchForEmpty)` bound the alias to the boolean condition's result, not to `store.search()`, rendering the literal word `"true"` in the heading; fixed by reading `store.search()` directly |
| T14 | Manual keyboard walkthrough, recorded pass/fail | Walkthrough surfaced 2 real bugs, both diagnosed and fixed, then re-walked and confirmed passing | See Troubleshooting below |

### F08 Dark Mode

Nine tasks (F08-T01…T09) built in order, each followed by the build-verify loop. All nine went in as planned; one declared deviation (folding the dark-theme CSS into T09, below) was flagged to dev-1 before the build started and accepted.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01 | `INVALID_THEME` constructor in `app-error.js` | As written, 1 attempt, 0 failures | — |
| T02 | `setting-repository.js` (get/upsert) | As written, 1 attempt, 0 failures | — |
| T03 | `setting-service.js` (validate/get/set) | As written, 1 attempt, 0 failures | — |
| T04 | `settings.js` routes mounted in `app.js` | As written, 1 attempt, 0 failures; smoke-tested live against a running server | — |
| T05 | `Theme`/`ThemeResponse` types, `ApiService` methods | As written, 1 attempt, 0 failures | — |
| T06 | Port `moon`/`sun` icons | As written, 1 attempt, 0 failures | The mockup's `sun` icon used an SVG `<circle>`; converted to a two-arc path to match this codebase's single-`d`-string icon convention (precedent: `search`) |
| T07 | `ThemeStore` (load/toggle/race guard/localStorage mirror) | As written, 1 attempt, 0 failures | — |
| T08 | Inline pre-paint `<script>` in `index.html` | As written, 1 attempt, 0 failures | — |
| T09 | Wire header toggle button into `app.html`/`app.ts` | As planned, **plus** `styles.css`'s `[data-theme='dark']` token block and `.btn.sq` rule, ported from `docs/mockup.html` | `lld.md` §3's file list never named `styles.css`; without the dark-theme CSS tokens the toggle would flip `data-theme` with no visible effect. Flagged to dev-1 before the build started and folded into T09 rather than silently added |

**Architecture wording that the build could not fix.** None — `hld.md` v4 already describes `INVALID_THEME` via AMD-004, applied during `/design-feature`.

### F07 Delete Bookmark

Fifteen tasks (F07-T01…T15) built in order, each followed by the build-verify loop. Thirteen went in exactly as planned; two test-only fixes were needed and are recorded below, both resolved within the 3-attempt limit.

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
| T01–T04 | `restoreDuplicateUrlError`, repository `softDelete`/`findDeletedById`/`restore`, service wrappers, `DELETE`/`restore` routes | As written, 1 attempt, 0 failures each; smoke-tested live against a running server (delete, re-delete 404, restore, invalid `:id`, not-found restore, the restore 409 race) | — |
| T05, T06 | `delete-bookmark.test.js`/`restore-bookmark.test.js` using `expect(fn()).rejects.toMatchObject(...)` | Rewritten with a sync `captureError()` try/catch helper | `softDelete`/`restore` are plain synchronous functions (matching `list()`'s shape), not async — `.rejects` requires a Promise, so the sync throw escaped before the matcher could attach, surfacing as the test's own uncaught exception rather than a matcher mismatch |
| T07 | Add `RestoreBookmarkResponse` type and `ApiService` methods only | As planned, **plus** reverting an unrelated, already-present change in the working tree: `DEFAULT_PAGE_SIZE` had been edited to `10` | Discovered via `git diff` while diagnosing 18 unrelated `search-box.spec.ts` failures; no task had authorized the change, and F03-AC5 documents `20` as the default |
| T08, T09 | Generalize `BookmarksStore`'s toast into `showToast()`/`clearToast()`/`toastUndo` (LD-02); add `deleteBookmark()`/`restoreBookmark()` | As written, 1 attempt, 0 failures | — |
| T10–T14 | `DeleteConfirm` dialog (mirroring `BookmarkForm`'s `showModal()`/focus-restore pattern), `BookmarkList`'s `deleteRequested` wiring, `Toast`'s Undo button, the app-shell wiring, and the ported `.btn.bad`/`.prev`/`.toast button` CSS | As written, 1 attempt, 0 failures each; T13 additionally smoke-tested the running server | — |
| T15 | Vitest + `TestBed` specs for the whole feature | As planned, after one test-ordering fix: 6 new delete/restore store tests flushed the list-reload `GET` before awaiting the outer call | `deleteBookmark`/`restoreBookmark` fire their reload via an un-awaited `void this.loadList()` inside `finally`, so the `GET` is only dispatched once the outer promise is awaited and that microtask runs; reordered to flush-then-await-then-flush-reload |

**Architecture wording that the build could not fix.** None — `hld.md` §6.4 and §8 already approve the full soft-delete/restore sequence and every error code F07 uses.

## Feature Evidence Matrix

<!-- GUIDE: One row per mandatory requirement. Status is Done only with verification; cite evidence IDs in "How AI helped". Must agree with backlog.md, status.md, and 05 Final Readiness Check (sync C5). -->

| Requirement | Status | How AI helped | What I changed/decided | How I verified |
|---|---|---|---|---|
| Add Bookmark | Partial | Copilot implemented the validate → normalize → duplicate-check → title-decision → insert chain across `bookmark-service.js` and `bookmarks.js`, and the Angular dialog that drives it (E-build-101, E-build-103); at `/test-phase` added `nfr05-timing.test.js` (real wall-clock NFR-05), `ssrf-rebinding.test.js` (F01-EC2 DNS-rebinding) (E-testing-101); at `/review-phase` raised and fixed 4 findings (E-review-101) — `web` had no ESLint config, 11 non-`src` files failed `prettier --check`, `BookmarksStore.save()` ignored `apiError.field`, and a non-synthetic URL sat in local `data/` | Ruled that `normalizeUrl` strips a trailing `/` from **any** path, against the narrower INV-02 wording, so F01-AC12 can pass | `npx vitest run` → **275 passed (275)**, exit 0, coverage 95.49%/86.61%/90.38%/98.02%. Manual `curl` POST observed `201 {"bookmark":{"id":1,…,"title_source":"user"}}`. F01-AC17 keyboard walkthrough confirmed **Pass** by dev-1 at `/test-phase`. F01-AC16: script non-execution confirmed by dev-1; the literal-text-rendering half remains **Not run** — see `docs/04-testing.md` Known Limitations. All 4 review findings verified fixed: `eslint .` exit 0, `prettier --check .` clean, `ng test --no-watch` 50 passed (50), `data/` deleted with no test regression (275/275) |
| Tags | Done | Copilot implemented `escapeLikePattern`, `tag-repository.js`'s `upsertAndGetId`/`findByPrefix`, `tag-service.js`'s normalize/validate/suggest pipeline, the atomic bookmark+tag-link insert, the shared `GET /api/tags` prefix branch, and the web-side `TagInput` component/`BookmarksStore` tag state mounted into the add-bookmark dialog (E-build-201, E-build-202, E-build-203, E-build-204); at `/test-phase` added `tag-security-probe.test.js` (attack-shaped tag payloads) and a literal-`_`-in-prefix proof in `tags-route.test.js` (E-testing-201); at `/review-phase` raised and fixed 5 findings (E-review-201) — uncommitted tag-input text was silently dropped on submit, the datalist-pick heuristic could false-positive on partial matches, the tag error region lacked `aria-describedby`/`aria-invalid`, `spec.md` F02-AC11's `prefix=DA` example was mathematically impossible, and native `<datalist>` styling was accepted as a known trade-off | Fixed a stale F01 test assertion that hard-coded a 6-key response shape once `tags` became a permanent field; substituted an unambiguous case-insensitivity test for `spec.md`'s internally-inconsistent `prefix=DA` example at Build time, then amended `spec.md` F02-AC11 itself at Review time (F02-RV04) per dev-1's direction, with a Change Log entry recording the correction | `npx vitest run` (api) → **360 passed (360)** at the Build gate, **364 passed (364)** at `/test-phase` and unchanged at `/review-phase` (20 files), coverage 96.93%/88.84%/96.92%/99.17% over `src/services`+`src/lib` (Q4 target 80%). `npx ng test --watch=false` (web) → **116 passed (116)** at `/test-phase`, **121 passed (121)** at `/review-phase` (8 files; 5 new regression tests for the RV01/RV02/RV03 fixes). `npx ng build` clean throughout. End-to-end: `POST /api/bookmarks` with `tags:["Research","docs"]` round-tripped as `tags:["docs","research"]` via `Invoke-RestMethod`; `GET /api/tags?prefix=d` returned `["docs"]`. `tag-security-probe.test.js` observed a SQL-metacharacter tag and an XSS-shaped tag both rejected `400 INVALID_TAG` with zero rows written and the `bookmark`/`tag` tables intact; `tags-route.test.js`'s new case observed prefix `a_b` matching only `a_bc`, not `a1bc` (S6). Human keyboard walkthrough confirmed chip commit (Enter/comma), Tab order with visible focus, Backspace-removal, and per-chip `aria-label`s all **worked**. All 5 review findings verified fixed/accepted: format/lint clean in both components, full test suites green with no regressions. See `docs/04-testing.md` F02-TC01…TC16 for the full Test Matrix and `docs/05-review.md` for the Findings table |
| List/Newest First | Done | Copilot implemented the shared predicate builder and real `service.list()` query, the pagination clamp helpers, the client store's list state (stale-response token guard), and the card/pagination UI (E-build-303, E-build-304, E-build-305, E-build-306); at `/test-phase` added `nfr01-timing.test.js` (real, measured NFR-01) and a new NFR-04/S4 injection-shaped probe on `page`/`size` (E-testing-307), and executed the F03-AC7/NFR-02 restart check at the full 1,000-record volume across two real process restarts (E-testing-308); at `/review-phase` raised and fixed 1 finding (E-review-309) — the pagination "Page X of Y" text had no `aria-live` region | Combined F03-T02+T03 into one verified build pass rather than landing a known-broken intermediate route; changed `BookmarkList.addRequested` from `output<void>()` to `output<Event>()` so focus-return keeps working; added `aria-live="polite"` to the pagination page-text per the review finding | `npx vitest run` (api) → **319 passed (319)**, coverage 96.14%/87.2%/93.22%/98.49% (Q4 target 80%). `npx ng test --watch=false` (web) → **85 passed (85)** (84 pre-existing + 1 new regression test for the review fix). NFR-01 observed at 1,000 seeded rows: page1 median=15ms/max=51ms, last-page median=12ms/max=21ms (n=20 each; target <1,000ms). F03-AC7/NFR-02 restart check re-run at 1,000 rows across two real process restarts — 0 diffs both times, `total=1000` throughout. F03-AC9 keyboard walkthrough confirmed **Pass** by dev-1 (cited, Build gate). The one review finding (F03-RV01) was fixed and independently re-verified: `npx ng build` clean, full smoke contract 200/200/200/200. See `docs/04-testing.md` F03-TC01…TC17 for the full Test Matrix and `docs/05-review.md` for the Findings table |
| Filter by Tag | Done | Copilot extended the shared `buildPredicate()` with a tag predicate and `normalizeTagFilterValue()`, added `bookmark-service.countLive()` and the `GET /api/bookmarks/count` route, extended `BookmarksStore` with tag-filter state and `refreshTagRail()` (its own stale-response guard and the EC17 fallback), and built the new `TagRail` component plus `BookmarkList`'s chips-as-buttons/active-filter-chip/tag-empty-state changes (E-build-402, E-build-403, E-build-404); at `/test-phase` added the NFR-01 tag-filter timing measurement and a dedicated `?tag=` read-path security probe (E-testing-401) | Consolidated T03's count-route tests into the existing `bookmarks-route.test.js` rather than a new file; fixed T09's icon markup to match the established `.ic`/`aria-hidden` wrapper pattern, caught by the app's own existing accessibility test; corrected T11's test design (testing `refreshTagRail()` directly rather than through `loadList()`'s fire-and-forget call) before running any test | `npx vitest run` (api) → **389 passed (389)** at the Build gate, **506 passed (506)** at `/test-phase` (30 files, whole-suite total including later features). `npx ng test --watch=false` (web) → **149 passed (149)** at the Build gate, **207 passed (207)** at `/test-phase` (15 files, whole-suite total). `npx ng build` clean (183.37 kB initial total) throughout. Full smoke contract 200 after every task. F04-T12 keyboard walkthrough confirmed **Pass** by dev-1: Tab order, visible focus, and Enter/Space activation all correct for the tag rail and the active-filter chip's Clear button — cited at `/test-phase`, not re-run (no UI code changed since). NFR-01 tag-filter half measured at `/test-phase`: **median=15ms, max=23ms** (n=20) at 1,000 seeded bookmarks, target <500ms. New `?tag=` security probe (SQL-metacharacter, XSS-shaped): 200/zero-matches/tables-intact, observed passed (2/2). Coverage **97.05% stmts / 90.27% branch / 96.25% funcs / 98.87% lines** (Q4 target 80%). See `docs/04-testing.md` F04-TC01…TC17 for the full Test Matrix |
| Search | Done | Copilot extended the shared `buildPredicate()`/`normalizeSearchValue()` (LD-01…LD-03) for title/URL search, threaded `q` through `bookmark-service.js`, `routes/bookmarks.js`, and `ApiService.listBookmarks()`, added the `search`/`x` icons, `BookmarksStore`'s `search` signal/`setSearchText()`/`clearSearch()`, the new `SearchBox` component (250ms debounce, LD-04), the reordered/extended `BookmarkList` empty-state branches (LD-06), and the ported `.search`/`.si`/`.cl` CSS (E-build-501…513); at `/test-phase` re-ran the full suite (all F05 coverage was already written during build) and measured the NFR-01 search-timing case in isolation (E-testing-504); at `/review-phase` raised and fixed 2 findings (E-review-505) — `SearchBox`'s native input value/`hasText` never resynced when `store.search()` was cleared externally (F05-RV01), and the NFR-01 search-query assertion was looser (`<1000ms`) than the spec's implied `<500ms` F04-parity target (F05-RV02) | Accepted all of LD-01…LD-06 as designed; fixed a corrupted edit at T01, a scoping lint failure at T03, an async-timing test bug at T08 (3 attempts), a fixture regression at T09 (2 attempts), and a latent `@else if ... as` template bug found by T13's new tests; at T14's manual walkthrough, diagnosed and fixed two real production bugs (see Troubleshooting); at `/review-phase` added an `effect()` in `search-box.ts` syncing native input value/`hasText` to `store.search()`, and tightened `nfr01-timing.test.js`'s search-query assertion to `<500ms` | `npx vitest run` (api) → **452 passed (452)** at the Build gate, **511 passed (511)** at `/test-phase`, **516 passed (516)** at `/review-phase` (30 files, whole-suite total). `npx ng test --watch=false` (web) → **186 passed (186)** at the Build gate, **207 passed (207)** at `/test-phase` and unchanged at `/review-phase` (15 files, whole-suite total, 0 regressions). `npx ng build` clean (189.27 kB initial total) throughout. F05-T14's keyboard walkthrough confirmed **Pass** by dev-1 after both bugs were fixed and re-verified: "Great job, its fixed now" — cited at `/test-phase`/`/review-phase`, not re-run (no keyboard/focus-affecting code changed). Manual `curl`/`Invoke-RestMethod` against the live server confirmed `GET /api/bookmarks?q=youtube` returns exactly 1 row (`total: 1`) versus 4 unfiltered. NFR-01 search half measured at `/test-phase`: median=14ms, max=25ms (n=20) at 1,000 seeded bookmarks; re-measured at `/review-phase` against the tightened `<500ms` assertion: **still median=14ms, max=25ms**, comfortably under the new threshold. See `docs/04-testing.md` F05-TC01…TC17 for the full Test Matrix and `docs/05-review.md` for the Findings table |
| Edit | Done | Copilot implemented `editConflictError()`/`duplicateUrlError()` on `api`, the self-exclusion duplicate lookup (`findLiveByNormalizedExcluding`), `bookmark-service.update()` (LD-01 fail-closed optimistic concurrency on an exact-string `updatedAt` match, LD-02 self-exclusion), the `PUT /bookmarks/:id` route, and on `web` the `EditBookmarkRequest`/`EDIT_CONFLICT` types, `BookmarksStore.editing`/`editBannerError`/`beginEdit()`, `BookmarkForm.openEdit()` plus its conflict/not-found banners, `BookmarkList`'s `editRequested` output, and `App`'s wiring of both edit entry points (row button and the duplicate banner's *Edit existing*) (E-build-602); at `/test-phase` closed the two declared-open test-hook items — F06-AC7's ordering guarantee (automated) and F06-AC9's real-restart check (file-backed db, close/reopen) — plus a new AI-discovered SQL-metacharacter/SQLi-shaped probe aimed at `PUT /api/bookmarks/:id` specifically (E-testing-601) | Accepted all of LD-01…LD-04 as designed; fixed a test-fixture bug in `edit-conflict.test.js` (same clock used for create and Tab A's save, so `updated_at` never advanced) rather than a product bug; found and fixed, out-of-band, F03's never-wired *View existing* button during the closing manual walkthrough | `npx vitest run` (api) → **422 passed (422)** at the Build gate, **511 passed (511)** at `/test-phase` (30 files, whole-suite total), coverage 97.05%/90.27%/96.25%/98.87% (Q4 target 80%). `npx ng test --watch=false` (web) → **167 passed (167)** at the Build gate, **207 passed (207)** at `/test-phase` (15 files, whole-suite total; one transient worker crash on first attempt, clean on immediate retry). `npx ng build` clean (185.91 kB initial total). A manual `Invoke-WebRequest` PUT against a real running server observed **200**, `created_at` unchanged, `updated_at` advanced. F06-T11's human keyboard walkthrough confirmed **Pass**: both edit triggers opened by keyboard only with correct pre-fill, `Esc` returned focus to each trigger's own opener, a saved edit's row position stayed unchanged, and the re-fixed *View existing* button was re-tested and confirmed working. At `/test-phase`: F06-AC7's ordering guarantee automated (`edit-bookmark.test.js`, observed passed), F06-AC9 observed passed against a real file-backed SQLite connection closed and reopened (edited values returned, `created_at` unchanged), and the new PUT-path security probe observed passed (3/3) — see `docs/04-testing.md` F06-TC01…TC15. At `/review-phase`: 2 Low findings raised and fixed (E-review-601) — F06-RV01 (duplicated validation/title-decision logic between `create()` and `update()` extracted into shared `validatePayload()`/`decideTitle()` helpers) and F06-RV02 (the duplicate-banner's "Edit existing" pre-fill no longer hardcodes `title_source`, reading it from the now-enriched `DUPLICATE_URL` response instead). Re-verified: `npx vitest run` (api) → **511 passed (511)**, 30 files, coverage 97.13%/90.53%/96.34%/99.05% (Q4 target 80%); `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files; `npx ng build` clean (194.77 kB initial total). No Critical/High/Medium finding; no modified or rejected feedback |
| Delete | Done | Copilot implemented `restoreDuplicateUrlError()`, the repository's `softDelete`/`findDeletedById`/`restore` (`restore` catching `SQLITE_CONSTRAINT_UNIQUE`), the service wrappers, the `DELETE /bookmarks/:id`/`POST /bookmarks/:id/restore` routes, and on `web` the generalized `BookmarksStore.showToast()`/`clearToast()`/`toastUndo` (LD-02), `deleteBookmark()`/`restoreBookmark()`, the new `DeleteConfirm` dialog (mirroring `BookmarkForm`'s `showModal()`/focus-restore pattern), `BookmarkList`'s `deleteRequested` wiring, `Toast`'s Undo button, the app-shell wiring, and the ported CSS (E-build-701…706); at `/test-phase` found and closed three AC gaps `tasks.md` had claimed but not actually covered (F07-AC11, AC12, AC13) plus the declared-open F07-AC14/AC15 restart checks (E-testing-701) | Fixed a sync-vs-`.rejects` test-authoring bug in `delete-bookmark.test.js`/`restore-bookmark.test.js` with a `captureError()` helper; reverted an unrelated, already-present `DEFAULT_PAGE_SIZE` regression found via `git diff` while diagnosing unrelated test failures; fixed a test-ordering bug around an un-awaited `finally` list reload in the new store specs | `npx vitest run` (api) → **503 passed (503)** at the Build gate, **516 passed (516)** at `/test-phase` (30 files, 13 new tests for F07-AC11–AC15). `npx ng test --watch=false` (web) → **207 passed (207)** throughout (16 new F07 tests across `bookmarks.store.spec.ts`, new `delete-confirm.spec.ts`, new `toast.spec.ts`, `bookmark-list.spec.ts`; unchanged at `/test-phase`, no web code touched). `npx ng build` clean throughout. Manual `curl`/`Invoke-RestMethod` smoke checks against a live server observed the documented 204/404/200/409 bodies for delete, re-delete, restore, and the restore 409 race. F07-AC14/AC15 verified via a real file-backed SQLite close/reopen proxy (same pattern as F06-AC9): a soft-deleted row stays deleted and a restored row keeps its tags/position. F07-AC16's keyboard walkthrough confirmed **Pass** by dev-1 at `/test-phase`: "All passed." dev-1 also manually verified the delete → confirm → undo → 6-second-auto-clear flow in-browser at the Build gate ("all passed"); screenshots deferred to be captured later. See `docs/04-testing.md` F07-TC01…TC16 for the full Test Matrix. At `/review-phase` raised and fixed 2 findings (E-review-701) — `deleteBookmark()`'s catch swallowed every error identically, not just the documented 404, against U5 (F07-RV01); `tasks.md`'s F07-T05/T06 rows misreported the restart-check/AC11-13 coverage timeline (F07-RV02). Narrowed the catch to only suppress `NOT_FOUND`, surfacing any other failure via `showToast()` like `restoreBookmark()` already does; corrected `tasks.md`'s text. `npx ng build` clean, `npx ng test --watch=false` → **208 passed (208)** (207 pre-existing + 1 new), `npx vitest run` (api) → **516 passed (516)** unaffected |
| Dark Mode | Done | Copilot implemented `invalidThemeError()`, the `setting` repository/service (default-without-write `getTheme()`, allow-list-validated `setTheme()`), and the `GET`/`PUT /api/settings/theme` routes on `api`; on `web`, the `Theme`/`ThemeResponse` types, `ApiService` methods, `moon`/`sun` icons, the request-token-guarded `ThemeStore`, the inline pre-paint `<script>`, and the header toggle button wiring (E-build-801, E-build-802); at `/test-phase` closed the two declared-open test hooks — F08-AC2/AC3's rendered-DOM structural assertions and F08-AC5/EC26's real file-backed restart proxy (E-testing-801) | Converted the mockup's `sun` `<circle>` to a two-arc path to match the existing icon convention; folded `styles.css`'s dark-theme tokens and `.btn.sq` rule into T09 after flagging the LLD's file list never named `styles.css`; fixed a test-authoring bug at `/test-phase` where an `expectOne` matched 2 pending requests because it filtered on URL only | `npx vitest run` (api) → **472 passed (472)** at the Build gate, **517 passed (517)** at `/test-phase` (30 files, 1 new F08 restart test), coverage **97.13% stmts / 99.05% lines** over `src/services`+`src/lib` (Q4 target 80%). `npx ng test --watch=false` (web) → **191 passed (191)** at the Build gate, **211 passed (211)** at `/test-phase` (15 files, 4 new F08 structural tests). `npx ng build` clean throughout. Manual `Invoke-WebRequest` smoke checks against a live server: `GET /api/settings/theme` → 200 `{"theme":"light"}`; `PUT .../theme {theme:"dark"}` → 200 `{"theme":"dark"}`; `PUT .../theme {theme:"blue"}` → 400 `{"error":{"code":"INVALID_THEME",...}}`. F08-AC5/EC26 restart persistence verified via a real file-backed SQLite close/reopen proxy (same pattern as F06-AC9/F07-AC14). dev-1's F08-AC7 keyboard walkthrough against the live app confirmed **Pass**: "passed". See `docs/04-testing.md` F08-TC01…TC10 for the full Test Matrix |
| Persistence | Done | Copilot wrote the WAL/`foreign_keys` connection setup and the idempotent schema bootstrap, and executed the F01-AC15 procedure end to end (E-build-105) | Kept the explicit `foreign_keys` pragma even after finding the driver already defaults it on — the guarantee should not depend on a driver default | Three synthetic bookmarks saved, process **stopped and confirmed down**, restarted, list re-fetched. The response was **byte-identical** to the pre-restart capture (`$b -eq $a` → `True`), ids 3/2/1 and all `created_at` values unchanged. Not independently re-run at `/test-phase` since no persistence-path code changed; `restart-integrity.test.js` separately proves an aborted transaction leaves zero partial rows (EC19 proxy) |
| Validation | Done | Copilot built `validate-url.js` to the §7.1 rule order with the three exact messages, plus the client echo in `core/validate-url.ts` (E-build-101); at `/test-phase` added `injection-probe.test.js`, a new AI-discovered NFR-04/S4 SQL-metacharacter probe for F01's title/URL fields (E-testing-101) | Confirmed each §7.2 row against real WHATWG `URL` behaviour before writing it into a test, rather than trusting the table | **81 passed (81)** at T03. 2,048 accepted and 2,049 rejected; `localhost` and `[::1]` refused by the dot rule; `2130706433` observed to expand to `127.0.0.1` and **pass**, which is why the SSRF guard is a separate post-resolution check. `injection-probe.test.js` observed the `'; DROP TABLE bookmark; --` payload round-trip literally and the `bookmark` table survive intact |
| Duplicate Handling | Done | Copilot implemented the partial unique index, the pre-insert lookup **and** the `SQLITE_CONSTRAINT_UNIQUE` re-read, routed through one `duplicateUrlError()` so both paths cannot drift (E-build-101); at `/test-phase` added the AMD-002 §4 cheap check (E-testing-101) | Made the 409 constructor a single function, so LD-02's byte-identical requirement is structural rather than a thing tests have to keep catching | A test asserts the pre-insert and constraint paths produce **byte-identical** 409 bodies. Manual `curl` observed a 409 carrying `existingId` and `details`, with the live row count unchanged. `restart-integrity.test.js` observed no live `url_normalized` ends in `/` with a non-empty path |
| Empty/Error States | Done | Copilot built the error taxonomy, the safe client-side fallback for unrecognised error shapes, and the duplicate banner (E-build-103, E-build-104) | Ruled that the F01-AC5 notice is announced in the toast region — same text — because the dialog's note region unmounts when the dialog closes | **49 passed (49)** on the web suite, including a 502 with an HTML body rendering a safe fallback and a `status: 0` rendering an unreachable-server message. The malformed-body 500 defect was fixed and pinned by a regression test |

> **Why the Add Bookmark row is Partial rather than Done.** Every automated check passes (275/275, coverage above target), and `/test-phase` closed both manual items the Build gate left open — but only halfway on one of them. dev-1 performed the keyboard walkthrough and confirmed **F01-AC17 Pass**. For F01-AC16, dev-1 confirmed the script-like title does **not execute**, but has not yet confirmed it **renders as visible literal text** — that half stays **Not run**, recorded honestly rather than assumed. `/review-phase` (2026-10-01) raised and fixed 4 non-blocking findings (E-review-101), all verified; it did not close the AC16 gap, which remains the sole reason this row is Partial. See `docs/04-testing.md` for the full Test Matrix and Known Limitations, and `docs/05-review.md` for the Findings table.

## Troubleshooting

Fourteen problems needed at least one fix attempt across F01, F02, F03, F04 and F06. Three were contradictions or inconsistencies in approved specs, six were real defects or mistakes in working code/commands/tests, two were tooling/environment gaps, one was a cosmetic finding with no code fix available, one was a test-design mistake caught by review before it ever failed a build-verify attempt, and one was a test-fixture bug.

**1. A malformed request body returned 500 for a client fault (F01-T06).**
The mandated manual `curl` check — not the test suite — found that posting invalid JSON returned `500 {"error":{"code":"STORAGE_ERROR","message":"TagVault could not save that. Your other bookmarks are safe — try again."}}`. The app was reassuring the user about data safety for a request that never reached storage, contradicting the HLD §8 taxonomy where 5xx means the server is at fault. **Diagnosis:** body-parser raises its own `entity.parse.failed` error *before* any route runs, so it fell through to the catch-all 500. Neither the LLD nor the HLD specified that path, so no test covered it. **Resolution:** `asClientBodyError()` in `app.js` maps `entity.parse.failed` and `entity.too.large` onto the **existing** `INVALID_URL` code and `MESSAGES.EMPTY` — no new error code or user-facing string invented. Verified on a restarted server: `{"error":{"code":"INVALID_URL","message":"Enter a web address to save.","field":"url"}} <== HTTP 400`. Tests went 252 → **253 passed**.

**2. The production build emitted markup the CSP blocks (F01-T12).**
The first build into `app/api/public` looked clean, but inspecting the generated `index.html` showed Angular's critical-CSS optimizer had injected an **inline** `<script>` to swap `media` attributes on deferred stylesheets. `script-src 'self'` blocks inline scripts, so the page would have loaded with its stylesheets stuck at `media="print"` — broken styling whose only symptom is a console CSP violation. **Resolution:** set `optimization.styles.inlineCritical: false`. Adding `'unsafe-inline'` or a hash was rejected: the CSP is an HLD decision and the build configuration is the cheaper thing to bend. Verified by re-counting inline blocks in the output: **0**, and the document response header still carries the CSP verbatim.

**3. F01-AC12 and INV-02 could not both be satisfied (F01-T03).**
`spec.md` F01-AC12 names `https://example.com/a/` as equivalent to `/a`, but `data-model.md` INV-02 and `lld.md` LD-04 both say to drop a trailing `/` **only when the path is empty or exactly `/`**. Under the narrow rule the two URLs never collide and AC12 fails. **Resolution:** stopped and asked rather than picking one; dev-1 ruled that `normalizeUrl` strips one trailing `/` from any path. **81 passed (81)** on the first run after the ruling. The architecture wording still needs an amendment — `/build-feature` cannot edit `data-model.md`.

**4. F01-AC5 contradicted itself (F01-T11).**
AC5 requires the fetch-failure notice to appear "in the note region below *Title*" **and** for "the dialog still [to] close". That region lives inside the `<dialog>`, so on a 201 it unmounts in the same tick the message is written — the user would never see or hear it, defeating the point of the criterion. **Resolution:** dev-1 ruled that the text stays byte-identical but is announced in the existing `#toasts` polite live region. `lld.md` §6 records the ruling and the two rejected alternatives. A follow-on build error (`TS2339: Property 'notice' does not exist`) caught a dead reference left by the change; tests then reported **49 passed (49)**.

**5. jsdom cannot open a native dialog (F01-T09).**
Seventeen tests failed with `TypeError: dialog.showModal is not a function`. **Resolution:** `src/test-setup.ts` shims `showModal`/`show`/`close` — state and the `close` event only. The file opens with a comment stating it deliberately does **not** reproduce the modal focus trap or page inertness, so nobody reads a green suite as proof of F01-AC17. That confirmation stays with the human.

**Also fixed without a second attempt:** an unnecessary `eslint-disable` directive at T01 (removed, not suppressed), and `no-undef` on `queueMicrotask` at T05 (fixed by declaring the real global in `eslint.config.js`, not by disabling the rule).

**6. `npx ng test` appeared to hang for 60-150 seconds, three times in a row (F03-T06).**
Production code for the list/card markup was unchanged from its first draft, but three consecutive test runs produced no output for well past the suite's normal run time, with no error and no completion. **Diagnosis:** rather than assume the new spec was broken, a temporary minimal smoke spec (mount `BookmarkList`, assert it exists) was swapped in; it completed in ~7 seconds, narrowing the cause away from the component/template. `Get-Process node | Select-Object Id,CPU,StartTime` during a full run showed climbing CPU values over time, inconsistent with a deadlock. **Resolution:** concluded the slowness was transient environment load — independently corroborated by that same session's `eslint --fix` (~460s vs. a historical ~25s) and `ng build` (~461s) calls — and restored the full spec unchanged. Verified: the unmodified spec passed **78 of 78** once the slow run completed.

**7. A restart-check cleanup command silently left stale seed data behind (F03-T08).**
The F03-AC7 restart spot check seeds synthetic bookmarks, then is supposed to remove them afterward. The first cleanup used `Remove-Item data\*.sqlite*`, which does not match this project's real database file name (`tagvault.db`). **Diagnosis:** a later, unrelated reseed of 22 more bookmarks unexpectedly reported `total=37`, exposing that the first 15 seeded rows had survived. **Resolution:** corrected to `Remove-Item data\tagvault.db*`, confirmed the directory was empty, and reseeded cleanly. The restart check's own recorded result (captured before the cleanup mistake) was unaffected — only the between-task cleanup was wrong, not the verification itself.

**One finding could not be fixed here.** `better-sqlite3` 13.0.3 defaults `PRAGMA foreign_keys` to `1`; `data-model.md` INV-12's rationale states SQLite defaults it off. Verified directly (`raw better-sqlite3 foreign_keys pragma = 1`). The explicit pragma was kept regardless — the guarantee should not depend on a driver default — but the rationale is inaccurate and lives in an architecture artifact.

**11. A new `app.spec.ts` accessibility assertion caught a missing icon wrapper (F04-T09).**
Mounting `<app-tag-rail />` passed `ng build` cleanly, but `ng test` failed one pre-existing assertion: "hides decorative icons from assistive technology" expects every `.ic` element to carry `aria-hidden="true"`. **Diagnosis:** `TagRail`'s new "All bookmarks" icon was a bare `<svg class="ic">` with no wrapping `aria-hidden` span, unlike every other icon in the app. **Resolution:** wrapped it in `<span class="ic" aria-hidden="true">`, matching the established pattern exactly. Verified: 137/137 passed on the re-run.

**12. A new store test's design would have failed on an async-timing mistake, caught before running it (F04-T11).**
`BookmarksStore.loadList()` calls `void this.refreshTagRail()` as a fire-and-forget call — its own returned promise resolves without waiting for `refreshTagRail()`'s internal `Promise.all([...])` to settle. **Diagnosis:** a manual trace of the actual microtask ordering, done before running any test, found that a drafted test block calling `http.expectOne('/api/tags')` right after flushing `loadList()`'s own list request would fail with "no request found", because those requests are only issued once `loadList()`'s continuation runs; a planned concurrency test for the independent `tagRailRequestToken` guard (F04-EC4) also could not work by racing two `loadList()` calls, since `loadList()`'s own `listRequestToken` guard would prevent the earlier call's `refreshTagRail()` from ever being invoked. **Resolution:** rewrote the block to call `store.refreshTagRail()` directly (capturing and awaiting its own promise), and used `http.match()` instead of `http.expectOne()` for the two-concurrent-requests EC4 case. Verified: 149/149 passed on the first run after the rewrite — no failed build-verify attempt was recorded for this bug, since it was caught by review rather than by a test failure.

**8. `spec.md`'s own `prefix=DA` example cannot pass against a correct prefix-match implementation (F02-T05).**
The Done-when text for F02-T05, copied from `spec.md` F02-AC11, asserts `GET /api/tags?prefix=DA` against seeded `docs`/`design`/`database` tags should return `["database","design"]`. **Diagnosis:** "design" does not start with "da", so no correct plain-prefix-match implementation can produce that result — the example itself is wrong, not the code. **Resolution:** substituted an equivalent, unambiguous case-insensitivity check (`prefix=DOC` → `["docs"]`) and recorded the discrepancy in `tasks.md` Plan vs. Actual rather than silently rewriting `spec.md`. Verified: `npx vitest run test/tags-route.test.js` — 6/6 passed; full suite — 360/360 passed.

**9. A Backspace test's `.focus()` call triggered a real HTTP request that poisoned later tests (F02-T08).**
`tag-input.spec.ts`'s Backspace-removal test called `tagInput().focus()` purely to set focus state. **Diagnosis:** `TagInput`'s real `(focus)="onFocus()"` binding fired on that call, issuing an actual `GET /api/tags?prefix=` request that was never flushed; `afterEach(() => http.verify())` then failed with "Expected no open requests", and every subsequent test in the file failed with "Cannot configure the test module when the test module has already been instantiated" from the poisoned `TestBed`. **Resolution:** added `http.expectOne('/api/tags?prefix=').flush([])` immediately after the `.focus()` call. Verified: 8/11 → **11/11 passed**; full web suite — 114/114 passed.

**10. The native `<datalist>` suggestion dropdown's styling was reported poor by the human (F02-T12).**
The human's keyboard walkthrough confirmed every functional and ARIA behaviour worked, but reported the suggestion dropdown's "look and feel is very bad". **Diagnosis:** not a code defect — `<datalist>`'s option-list rendering (position, colours, spacing) is drawn entirely by the browser and cannot be restyled with CSS. This is the LLD's explicit, accepted trade-off (§6/§7.2: ported verbatim from `docs/mockup.html` over a custom dropdown). **Resolution:** left as-is; recorded as a finding in `tasks.md` Plan vs. Actual for `/review-phase` to decide whether a future amendment should replace `<datalist>` with a styleable custom listbox.

**13. A two-tab edit-conflict test passed for the wrong reason (F06-T05).**
`edit-conflict.test.js` simulates two browser tabs: Tab A saves first, then Tab B's stale `updatedAt` should be rejected. The first draft used the same fixed clock for both the row's `create()` and Tab A's `update()`, so `updated_at` never actually changed between them — Tab B's stale check then passed `resolve`, not the intended `reject`, for the wrong reason (nothing had gone stale, there was simply nothing to compare against). **Diagnosis:** caught by reading the assertion against what the test was actually supposed to prove, not by a build-verify failure — the test "passed" but proved nothing. **Resolution:** gave Tab A's save (`tabAService`) its own clock, distinct from `create()`'s. Verified: **25 test files, 422 tests passed**, including the now-genuinely-adversarial case.

**14. The duplicate banner's `View existing` button had never been wired, found during F06's manual walkthrough (F03-T08, pre-existing).**
F06-T11's human keyboard walkthrough reported the duplicate banner's *View existing* button did nothing. **Diagnosis:** `BookmarkForm`'s `viewExisting` output (added in F01) was never bound in `app.html` — only `(editExisting)` was. F03-T08's own `tasks.md` only wired `addRequested`; *View existing* was left unimplemented, and no existing test caught the gap because none asserted the output was consumed by a listener. **Resolution:** resolved per the hld.md §7/A05 decision already on record (clamp-and-highlight, no new route): `App.onViewExisting()` closes the dialog, clears the active tag filter, resets to page 1, awaits a reload, then a new `BookmarkList.scrollToAndFlash(id)` scrolls to and flashes the row (`.card.flash`/`@keyframes fl` added to `styles.css`, ported from `docs/mockup.html`'s `showDup()`, respecting `prefers-reduced-motion`); `test-setup.ts` gained `matchMedia`/`scrollIntoView` jsdom stubs (first lint attempt failed on 5 `@typescript-eslint/no-empty-function` errors in those stubs; fixed on retry by narrowing the stub shapes). Verified: `npx ng test --watch=false` → **167 passed (167)**, up from 166; the human re-tested *View existing* against the live app and confirmed it now works. Recorded against **F03's** `status.md`, since the changed files are F03-owned and no F06 acceptance criterion changed.

**15. F05-T14's manual walkthrough found search had zero effect on the live server, which turned out to be a stale server process rather than a code defect (F05-T14).**
The human reported that typing a search term and waiting past the debounce did not filter the list at all. **Diagnosis:** reproduced directly against the running server with `curl`/`Invoke-RestMethod` (`GET /api/bookmarks?q=youtube` returned all 4 rows, `total: 4`, instead of the 1 matching row). Read every backend layer in the call chain (`routes/bookmarks.js` → `bookmark-service.js` → `list-query.js` → `bookmark-repository.js`) and ran `buildPredicate()`/`normalizeSearchValue()` and the resulting SQL directly against the production `data/tagvault.db` file — all four layers were logically correct and returned the filtered row set correctly when invoked directly, ruling out a code defect. `netstat -ano`/`Get-CimInstance Win32_Process` on the PID bound to port 3000 showed it had been running since before this session's F05 code was finalized. **Resolution:** killed the stale process and restarted `npm start` fresh. Verified: `curl "http://localhost:3000/api/bookmarks?page=1&size=20&q=youtube"` now returns exactly 1 row (`total: 1`, the "Youtube" bookmark).

**16. F05-T14's manual walkthrough found two clear ("x") buttons on the search field; the first CSS fix attempt was insufficient (F05-T08).**
The human reported two visible "x" icons once text was typed into the search box, and clicking either cleared the text. **Diagnosis:** the native `<input type="search">` renders the browser's own built-in clear icon (`::-webkit-search-cancel-button`) alongside the component's own conditional `.cl` button. **Resolution (attempt 1):** added `-webkit-appearance: none` to `::-webkit-search-cancel-button`/`::-webkit-search-decoration` in `styles.css`. The human reported this still showed two buttons in their browser. **Resolution (attempt 2):** replaced it with `display: none` on `::-webkit-search-cancel-button` alone, matching `docs/mockup.html` line 41's already-proven rule verbatim. Verified: rebuilt (`npx ng build`, new bundle `styles-7QAVGTJO.css`), `npx ng test --watch=false` (186/186, no regression), restarted the server fresh, confirmed via `curl` the new bundle was being served, and the human re-performed the walkthrough and confirmed: "Great job, its fixed now." **Lesson:** `-webkit-appearance: none` alone does not reliably hide this control in current Chrome/Edge; `display: none` does, and the reference mockup already had the correct form — it should have been copied verbatim the first time.

**Both F05-T14 findings matter beyond their own fixes.** 452 api tests and 186 web tests passed throughout Bug #1's entire lifecycle and never caught it, because the bug was never in the code under test — it was a stale, already-running server process serving pre-F05 code from memory. A green automated suite only proves the code on disk is correct; it says nothing about which code a separately running process has actually loaded. Any manual/live verification step should restart the server being tested immediately beforehand.

## Significant Human Changes

No AI output was rejected outright in this phase. The material human input took a different form: **twice Copilot refused to proceed and dev-1 had to rule**, because the approved specs contradicted themselves and no implementation could satisfy both halves.

| # | Where | The human's call | Effect |
|---|---|---|---|
| 1 | F01-T03, trailing slash | Chose option A: `normalizeUrl` strips one trailing `/` from **any** path | `spec.md` F01-AC12 now passes. `data-model.md` INV-02 and `lld.md` LD-04 still carry the narrow wording and need an amendment |
| 2 | F01-T11, the AC5 notice | Chose option A: same message text, announced in the `#toasts` live region instead of the dialog | The notice can actually be read. `spec.md` F01-AC5 still carries the contradictory wording and needs an amendment |
| 3 | Angular CLI analytics prompt | Declined (`N`) → `Local setting: disabled` | No project material leaves the machine (constitution §5) |
| 4 | The Build gate | Approved on 2026-10-01 **without** performing the keyboard walkthrough | F01-AC16 (rendered) and F01-AC17 (keyboard) carry to `/test-phase` as unverified. They are **not** recorded as passing anywhere in this document |
| 5 | F03-T08, the keyboard walkthrough | dev-1 performed the F03-AC9 walkthrough against the live running app **before** approving the Build gate, and reported "Everything is working as expected." | F03-AC9 is recorded as **Pass** in this document, unlike F01-AC16/AC17 above which carried over unverified |
| 6 | F02-T11/T12, the end-to-end wiring check and keyboard walkthrough | dev-1 performed the full walkthrough against the live running app **before** approving the Build gate: bookmark card tag display, chip commit (Enter/comma), Tab order, Backspace removal, remove-button labels all confirmed **worked**; the suggestion list was confirmed to appear, with a cosmetic styling complaint | F02-AC10, AC12, AC13 recorded as **Pass** (functional contract) in this document; the native `<datalist>` styling finding carries to `/review-phase` rather than being silently fixed |
| 7 | F06-T11, the keyboard walkthrough | dev-1 performed the full walkthrough against the live running app **before** approving the Build gate, reported the duplicate banner's *View existing* button was non-functional, confirmed the fix, then reported "great job, it works now and passed" | F06-AC7, AC13 recorded as **Pass** in this document; the *View existing* defect and fix are recorded against **F03's** `status.md`, not F06's, since the changed files are F03-owned |
| 8 | F05-T14, the manual walkthrough | dev-1 performed the keyboard walkthrough against the live running app **before** approving the Build gate, reported two defects (search not filtering; two clear buttons), then confirmed both fixes after two CSS iterations: "Great job, its fixed now" | F05-AC12/AC13 recorded as **Pass** in this document; both defects and their diagnoses are recorded in Troubleshooting #15/#16 rather than silently fixed |
| 9 | F08-T09, the dark-mode manual walkthrough | dev-1 performed the keyboard/visual walkthrough against the live running app **before** approving the Build gate, and reported "all passed" with no defects found | F08's dark-mode toggle, keyboard operability, and persistence are recorded as **Pass** in this document |

Three smaller judgement calls were made during the build and are worth naming, because each chose the harder option over the convenient one: the CSP was kept verbatim and the build tool reconfigured instead; the `eslint` failures were fixed by declaring real globals and deleting a stale directive rather than by disabling rules; and the jsdom dialog shim was written to reproduce *less* than the real platform, with a comment saying so, rather than faking a focus trap the tests would then appear to verify.

_The **What you changed and why**, **Approx. time** and **Learning** fields on E-build-101…105 are `TODO(human)` — they are dev-1's to write and have not been invented here. On E-build-303…306 (F03), dev-1 supplied **Your decision**, **What you changed and why**, and **Approx. time**; a one-line **Learning** remains `TODO(human)` on E-build-303/304/305, and **Approx. time** remains `TODO(human)` on E-build-306. On E-build-201…204 (F02), dev-1 supplied **Your decision** (Accepted, all four), **What you changed and why** (nothing, accepted as-is), and **Approx. time** (~30–45 minutes across the whole build session, not tracked per task); a one-line **Learning** remains `TODO(human)` on E-build-203. On E-build-402…404 (F04), **Approx. time** and **Learning** remain `TODO(human)` on all three — left honestly open rather than invented. On E-build-602 (F06), dev-1 supplied **Your decision** (Accepted) implicitly by approving the gate; **What you changed and why**, **Approx. time** and **Learning** remain `TODO(human)`. On E-build-501…513 (F05), **Your decision** and **What you changed and why** remain `TODO(human)` throughout, and **Approx. time** remains `TODO(human)` on all thirteen; **Learning** is filled only on E-build-513 (the stale-server-process and CSS-specificity lessons from F05-T14's two production bugs)._

## AI Interactions

Thirty-eight records, copied verbatim from `specs/features/F01-add-bookmark/evidence/`, `specs/features/F02-tag-bookmarks/evidence/`, `specs/features/F03-list-bookmarks/evidence/`, `specs/features/F04-filter-by-tag/evidence/`, `specs/features/F05-search/evidence/`, `specs/features/F06-edit-bookmark/evidence/`, `specs/features/F07-delete-bookmark/evidence/` and `specs/features/F08-dark-mode/evidence/`. The five F01 records are **all complete**. All four F02 records have **Your decision**, **What you changed and why** and **Approx. time** filled; one (E-build-203) has an open one-line **Learning**. Of the four F03 records, E-build-303/304/305 are complete except for a one-line **Learning**, and E-build-306 is complete except for **Approx. time**. All three F04 records (E-build-402, E-build-403, E-build-404) have **Approx. time** and **Learning** open as `TODO(human)` — all left honestly as `TODO(human)` rather than invented. The thirteen F05 records (E-build-501…513) have **Your decision** and **What you changed and why** open as `TODO(human)` throughout; **Approx. time** is `TODO(human)` on all thirteen; **Learning** is filled only on E-build-513. The one F06 record (E-build-602) has **Your decision** filled (Accepted); **What you changed and why**, **Approx. time** and **Learning** remain `TODO(human)`. The six F07 records (E-build-701…706) have **Your decision** filled (Accepted) and **How you verified it**/**Outcome**/**Iteration** complete throughout; **What you changed and why** and **Approx. time** remain `TODO(human)` on all six; **Learning** is filled on E-build-701 (the stale-port-listener lesson) and E-build-706 (the un-awaited-`finally`-reload testing lesson). The two F08 records (E-build-801, E-build-802) have **How you verified it** and **Outcome** filled; **Your decision**, **What you changed and why**, **Approx. time** and **Learning** remain `TODO(human)`.
### Evidence E-build-101

**SDLC activity:** build

**Task/feature:** F01-T03 — implementing `normalizeUrl()` so that F01-AC12 treats `https://example.com/a`, `EXAMPLE.com/a/`, `example.com:443/a#x` and the punycode form as one bookmark.

**Context given to AI:** `spec.md` F01-AC12 (which names `https://example.com/a/` as equivalent to `/a`), `data-model.md` INV-02 and `lld.md` LD-04 (which both say to drop a trailing `/` **only when the path is empty or exactly `/`**), and `lld.md` §7.2's literal normalization table.

**Prompt/request:** Implement F01-T03 — `validateUrl`, `normalizeUrl` and `hostnameForTitle` — with table tests covering every §7.1 rule and every §7.2 row.

**AI response summary:** Copilot stopped before writing `normalizeUrl` and reported that the two sources cannot both be satisfied: under INV-02 as written, `https://example.com/a/` normalizes to `https://example.com/a/` and would **not** collide with `https://example.com/a`, so F01-AC12 would fail. It presented two options — (A) strip one trailing `/` from any path, satisfying AC12 and needing an INV-02 amendment, or (B) implement INV-02 literally and raise AC12 as a spec defect — and recommended A, noting that `/build-feature` cannot edit `data-model.md` either way.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — option A was accepted as recommended, after reading through both options and understanding the trade-off before accepting.

**How you verified it:** `npx vitest run` in `app/api` reported **81 passed (81)**, exit 0, on the first attempt after the ruling. The suite asserts `example.com/a` ≡ `EXAMPLE.com/a/` ≡ `example.com:443/a#x` while `example.com/A` stays distinct. Each §7.2 row was independently checked against actual WHATWG `URL` behaviour with `node -e` before being written into a test, so the table pins real behaviour rather than an assumption — `2130706433` and `0x7f.1` were confirmed to expand to `127.0.0.1` and to **pass** validation, which is why the SSRF guard is a separate post-resolution check.

**Outcome:** worked

**Iteration:** The wording gap is unresolved by design: the code and `spec.md` now agree, but INV-02 and LD-04 still describe the narrower rule. Raised as a Build-gate finding requiring an architecture amendment rather than edited in place.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.

### Evidence E-build-102

**SDLC activity:** build

**Task/feature:** F01-T05 — writing the SSRF-guarded title fetcher and the `lld.md` §11 loopback honesty check that is supposed to prove the guard works.

**Context given to AI:** `hld.md` §8's blocked address ranges, `lld.md` LD-01 (the injected `{ lookup, request, clock }` seam), F01-AC13, and the LLD §11 requirement for **one** test that runs the real fetcher against a real HTTP server on `127.0.0.1`.

**Prompt/request:** Implement F01-T05 to the LLD's seam, including the mandated loopback test.

**AI response summary:** Copilot pointed out that the mandated test is impossible as specified: a real server on `127.0.0.1` is exactly what the guard blocks, so the real fetcher can never reach it. It proposed adding a fourth injected dependency, `isBlocked`, defaulted to the real guard, so the one loopback file can disable it deliberately and visibly — and warned that this seam is itself a risk, because a careless future test could disable the guard without anyone noticing.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the added `isBlocked` seam was accepted as recommended, after reading through the proposal and understanding the risk it named before accepting.

**How you verified it:** `npx vitest run` reported **215 passed (215)** and `npx eslint .` exit 0 on attempt 2. Attempt 1 had 211 tests passing but eslint exit 1 with four `no-undef` errors on `queueMicrotask`; that was fixed by **declaring the real global** in `eslint.config.js`, not by disabling the rule. The guard is proven two ways: the probe suite asserts `request` is called **zero times** for a private resolved address, and the loopback file's fourth test runs the real fetcher **with** the guard enabled against a real loopback server and asserts `requestCalls === 0`.

**Outcome:** worked

**Iteration:** The loopback file opens with a banner comment stating that `isBlocked: () => false` disables the guard **for that file only**, so a reviewer cannot mistake it for the production path. Recorded as a Build-gate finding since it deviates from the LLD's three-dependency seam.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.

### Evidence E-build-103

**SDLC activity:** build

**Task/feature:** F01-T06 — a defect found by the manually executed `curl` check, not by the test suite: a malformed JSON request body returned **500 STORAGE_ERROR** instead of a 4xx.

**Context given to AI:** `hld.md` §8's error taxonomy (5xx means the server is at fault), the `AppError` code table, and the observed response from a real running server.

**Prompt/request:** Run the manual `curl` checks F01-T06's "Done when" requires, and record the actual statuses.

**AI response summary:** The 201, 409 and 400 cases matched the spec. Sending a malformed body returned `500 {"error":{"code":"STORAGE_ERROR","message":"TagVault could not save that. Your other bookmarks are safe — try again."}}` — telling the user their data was safe about a request that never reached storage. Copilot diagnosed it as body-parser raising its own `entity.parse.failed` error before any route runs, falling through to the catch-all 500, and proposed `asClientBodyError()` in `app.js` to map body-parser's `entity.parse.failed` and `entity.too.large` onto the **existing** `INVALID_URL` code and `MESSAGES.EMPTY` — deliberately inventing no new error code and no new user-facing string.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the `asClientBodyError()` fix was accepted as recommended, after reading through the diagnosis and understanding why the existing `INVALID_URL` code was reused before accepting.

**How you verified it:** Re-ran the same `curl` against a **restarted** server and observed `{"error":{"code":"INVALID_URL","message":"Enter a web address to save.","field":"url"}}` `<== HTTP 400`. A regression test was added and `npx vitest run` went from 252 to **253 passed (253)**, exit 0, with eslint clean.

**Outcome:** worked

**Iteration:** Worth noting at the gate that neither the LLD nor the HLD specified body-parser's own error path, so no test would have caught this — only the manually executed check did. This is the strongest argument in F01 for the build loop's mandated manual smoke step.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.

### Evidence E-build-104

**SDLC activity:** build

**Task/feature:** F01-T11 — deciding where the F01-AC5 title-fetch-failure notice is actually rendered, after the acceptance criterion turned out to contradict itself.

**Context given to AI:** `spec.md` F01-AC5, `lld.md` §6's UI state table, the `#toasts` live region already present in the shell from F01-T08, and `docs/mockup.html`.

**Prompt/request:** Implement F01-T11 — the duplicate banner and the fetch-failure notice.

**AI response summary:** The banner half was implemented directly. For the notice, Copilot stopped and reported that F01-AC5 asks for two things that cannot both hold: the notice appears in "the note region below *Title*" **and** "the dialog still closes". That region is inside the `<dialog>`, so on a 201 it unmounts in the same tick the message is written and the user would never see or hear it — defeating the point of AC5. Three options were offered: (A) same text, announced in the existing `#toasts` polite region; (B) keep the dialog open when the title fell back; (C) render in both places. A was recommended; C was rejected outright as two polite regions announcing at once.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — option A (announce in `#toasts`) was accepted as recommended, after reading through all three options and understanding why C was rejected before accepting.

**How you verified it:** `npx ng test --no-watch` reported **49 passed (49)**, exit 0, on attempt 3. Attempt 2 failed the build with `TS2339: Property 'notice' does not exist on type 'BookmarksStore'` — a dead reference left behind by the change, which the compiler caught. The suite asserts the message **byte-for-byte**, including the ASCII apostrophe declared as the Q5 deviation, and asserts that a `fetched` or `user` title still yields the plain `Bookmark saved`. A separate shell test confirms the text renders inside `#toasts`.

**Outcome:** worked

**Iteration:** `lld.md` §6 was updated to record the ruling, the unchanged message text, and both rejected alternatives, so `/review-phase` reads a decision rather than raising a finding. `spec.md` still carries the contradictory wording and needs an amendment — `/build-feature` does not own it.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.

### Evidence E-build-105

**SDLC activity:** build

**Task/feature:** F01-T12 — assembling the single-process build and discovering that Angular's default production optimizer emits markup the HLD §8 CSP blocks.

**Context given to AI:** `hld.md` §8's verbatim CSP (`default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`), F01-AC15's stop/start procedure, and `component-map.json`.

**Prompt/request:** Point `ng build` at `app/api/public`, serve it from Express under the CSP, then execute and record the F01-AC15 restart check.

**AI response summary:** After the first build, Copilot inspected the generated `index.html` rather than assuming it was fine, and found that Angular's critical-CSS optimizer (`beasties`) injects an **inline** `<script>` to swap `media` attributes on deferred stylesheets. `script-src 'self'` blocks inline scripts, so the page would load with its stylesheets stuck at `media="print"` — broken styling, with the only symptom a console CSP violation. Copilot recommended disabling `inlineCritical` rather than adding `'unsafe-inline'` or a hash to the CSP.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — disabling `inlineCritical` was accepted as recommended, after reading through why weakening the CSP was rejected before accepting.

**How you verified it:** Rebuilt after setting `optimization.styles.inlineCritical: false` and counted inline blocks in the output: **0**. Then smoke-checked the single process: `/ -> 200`, `/api/health -> 200`, `/api/bookmarks -> 200`, `/api/tags -> 200`, with the document's response headers carrying the CSP verbatim and no `x-powered-by`. **F01-AC15 was then executed for real**: three synthetic bookmarks saved, the process stopped (confirmed down — `/api/health` returned nothing), started again, and the list re-fetched. The post-restart response was **byte-identical** to the pre-restart capture (`$b -eq $a` → `True`), with ids 3/2/1 and their `created_at` values unchanged.

**Outcome:** worked

**Iteration:** Weakening the CSP to suit the build tool was considered and rejected — the CSP is an HLD decision and `/build-feature` may not edit `hld.md`, so the build configuration gave way instead. The `<script>alert(1)</script>` title used in the AC15 run doubles as the AC16 fixture: it is stored and returned as literal text, but **rendered** confirmation still needs a human to look at the page.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.

### Evidence E-build-201

**SDLC activity:** build

**Task/feature:** F02-T05 — `routes/tags.js` prefix-branch and its test's EC4 case (F02-AC11, AC12, AC13)

**Context given to AI:** `tasks.md`'s F02-T05 Done-when text, which specifies the test case as `GET /api/tags?prefix=DA` against seeded `docs`/`design`/`database` tags returning `["database","design"]` (an example copied from `spec.md` F02-AC11), plus the LLD's documented plain-prefix-match algorithm (`findByPrefix` via `LIKE prefix% ESCAPE '\'`).

**Prompt/request:** Implement F02-T05 and its test, following the Done-when text's literal example.

**AI response summary:** Writing the test as specified failed: `GET /api/tags?prefix=DA` returned `["database"]` only, not `["database","design"]`, because "design" does not start with "da" under a correct prefix match. Identified `spec.md`/`tasks.md`'s own example as internally inconsistent with the LLD's algorithm. Replaced the EC4 test case with `prefix=DOC` → `["docs"]`, an equivalent, unambiguous case-insensitivity check, and left a comment plus a `tasks.md` Plan vs. Actual entry flagging the discrepancy instead of silently rewriting the spec.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx vitest run test/tags-route.test.js` — 1 file, 6/6 passed after the substitution; `npx vitest run` (full suite) — 19 files, 360/360 passed.

**Outcome:** Worked — the substituted test passes and the route's actual prefix-match behavior is correct; the `prefix=DA` example in `spec.md`/`tasks.md` remains unfixed pending an architect/planner decision.

**Iteration:** n/a — first attempt at T05, not yet revised

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A literal example copied from one spec document into a test's Done-when text can itself be wrong — verifying it against the algorithm (not just transcribing it) caught the inconsistency before it became a false test failure blamed on the implementation.

### Evidence E-build-202

**SDLC activity:** build

**Task/feature:** F02-T08 — `TagInput` component and its test suite (`tag-input.spec.ts`), F02-AC10, AC12, AC13

**Context given to AI:** `tasks.md`'s F02-T08 row (labelled input, chip row before input, Enter/comma commit, Backspace-on-empty removal, per-chip `aria-label`, `<datalist>` suggestions, debounced fetch on input + immediate fetch on focus), `BookmarksStore`'s F02-T07 API (`addTagChip`, `addTagsFromText`, `removeTagChip`, `removeLastTagChip`, `loadTagSuggestions`), and the established `BookmarkForm`/`BookmarkList` pattern of injecting the store directly plus `HttpClientTestingModule`-style `provideHttpClientTesting()` in specs.

**Prompt/request:** Implement F02-T08 (`tag-input.ts`, `tag-input.html`, `tag-input.spec.ts`) and run its build-verify loop.

**AI response summary:** First test run: 8 of 11 tests failed. Root cause: a Backspace-removal test called `tagInput().focus()` to set focus state, which triggered the component's real `(focus)="onFocus()"` binding and issued an actual `GET /api/tags?prefix=` request that was never flushed; `afterEach(() => http.verify())` then failed with "Expected no open requests", and every subsequent test in the file failed with "Cannot configure the test module when the test module has already been instantiated" because the poisoned `TestBed` never tore down cleanly. Fix: added `http.expectOne('/api/tags?prefix=').flush([])` immediately after the `.focus()` call, and introduced a `setValue()` helper (sets `.value` without dispatching `input`) alongside the existing `type()` helper so keydown-only tests do not accidentally trigger the debounced suggestion-fetch path.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx ng test` (single spec) — 11/11 passed after the fix; `npx ng test --watch=false` (full suite) — 8 files, 114/114 passed; `npx ng build` — clean, `Application bundle generation complete`.

**Outcome:** Worked — all 11 `TagInput` tests pass and the full web suite has no regressions.

**Iteration:** Attempt 1 (8/11 failed) → attempt 2, after the fix (11/11 passed, then full-suite 114/114 confirmed)

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A component with a real DOM event binding (`(focus)`) will still fire that binding when a test calls `.focus()` for an unrelated reason (here, testing Backspace); any such test must explicitly account for the binding's side effects (here, flushing the HTTP request it triggers) or it will silently poison every later test in the same file via a broken `TestBed` teardown.

### Evidence E-build-203

**SDLC activity:** build

**Task/feature:** F02-T11/F02-T12 — end-to-end wiring check and keyboard walkthrough against the running app (F02-AC1, AC10, AC11, AC12, AC13)

**Context given to AI:** The running app (`node src/server.js` serving the `npx ng build` output at `http://localhost:3000`), a bookmark saved via `Invoke-RestMethod` with `tags: ["Research","docs"]`, and a request for the human to exercise the Add-bookmark dialog's tag input by hand (Enter/comma commit, Tab order, Backspace removal, remove-button labels, suggestion list).

**Prompt/request:** Human ran through the five checks and reported: (1) the saved bookmark's card shows both tag chips — "Yes exist"; (2a) Enter/comma commit — "worked"; (2b) Tab order with visible focus outline — "Worked"; (2c) Backspace-on-empty removes the last chip, focus stays — "Worked"; (2d) remove-button `aria-label` — "Worked"; (2e) suggestion list appears but "the drop down look and feed is very bad".

**AI response summary:** Recorded all five results verbatim in `tasks.md`'s Build-Verify Log and marked F02-T11/T12 `done`. For 2e, identified that `<datalist>`'s rendering (position, colours, spacing of the options box) is drawn by the browser itself and cannot be restyled with CSS — this is the LLD's explicit, accepted trade-off (§6/§7.2: ported verbatim from `docs/mockup.html` rather than building a custom dropdown) — so it was not treated as a code defect to silently fix. Added a `tasks.md` Plan vs. Actual entry flagging it as a finding for `/review-phase` to decide whether a future amendment should replace `<datalist>` with a styleable custom listbox.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is. The `<datalist>` styling finding is left open for `/review-phase` rather than fixed here.

**How you verified it:** Human-performed manual verification in a browser against the running app (not an automated test); the AI additionally confirmed the API-level contract first via `Invoke-RestMethod` (`POST /api/bookmarks` with tags, then `GET /api/bookmarks` showing `tags: ["docs","research"]`, and `GET /api/tags?prefix=d` returning `["docs"]`).

**Outcome:** Worked — all functional keyboard/ARIA behavior confirmed; one cosmetic finding (native `<datalist>` styling) left open for `/review-phase`.

**Iteration:** n/a — single walkthrough, not yet revised

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** TODO(human)

### Evidence E-build-204

**SDLC activity:** build

**Task/feature:** F02-T04 — atomic bookmark+tag insert and `INVALID_TAG` validation (F02-AC1, AC6, AC8, AC9, F02-EC2)

**Context given to AI:** `tasks.md`'s F02-T04 row (changed files: `bookmark-repository.js`, `bookmark-service.js`, `bookmark-service.test.js` only), plus F01's existing `bookmarks-route.test.js`, which was not listed as a file F02-T04 should touch.

**Prompt/request:** Implement F02-T04 so `insert()` always attaches a `tags` field to the saved row, and `create()` validates `payload.tags` before the duplicate lookup.

**AI response summary:** Implementing the declared behavior broke a pre-existing F01 test in `bookmarks-route.test.js` that hard-asserted the bookmark response had exactly 6 keys with no `tags` field. Since `tags` is now a permanent part of every bookmark response (F02-AC1), updated that one assertion to include `tags`, rather than leaving the full-suite regression red or reverting the new behavior.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx vitest run test/bookmark-service.test.js` — 1 file, 40/40 passed; `npx vitest run` (full suite, before the `bookmarks-route.test.js` fix) — FAILED on the stale 6-key assertion; `npx vitest run` (full suite, after the fix) — 18 files, 354/354 passed.

**Outcome:** Worked — the full suite is green and the response shape change is intentional and consistent with F02-AC1.

**Iteration:** Attempt 1 (full-suite regression caught the stale F01 assertion) → attempt 2, after updating `bookmarks-route.test.js` (354/354 passed)

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A task scoped to "only touch these files" can still legitimately require a one-line fix to an unlisted file, when the new behavior is a declared, permanent contract change (not a side effect) that an older test hard-coded against; the full-suite regression step exists precisely to catch this before it ships silently broken.

### Evidence E-build-303

**SDLC activity:** build

**Task/feature:** F03-T02 and F03-T03 — the shared predicate builder/real list query (`service.list()` replacing `listRecent()`/`countLive()`), and repointing `GET /api/bookmarks` at it.

**Context given to AI:** `tasks.md`'s own task split (T02 = predicate/query/service, T03 = route), `lld.md`'s AS-F03-01 predicate contract, and the mode instructions' build-verify-loop requirement that each task leave the app buildable and runnable.

**Prompt/request:** Build F03-T02, then F03-T03, one task at a time per the tasks.md order.

**AI response summary:** Before writing any code, Copilot noted that landing T02 alone would break `GET /api/bookmarks`: the route still calls `service.listRecent()`, which T02 deletes, so the declared smoke check and `list-route.test.js` would fail on a real regression the build-verify loop is required to catch. It proposed combining T02+T03 into one verified build-verify pass instead of landing a known-broken intermediate state, citing `lld.md` §13's own claim that every task leaves the app buildable and runnable, and recording the combination as a deviation rather than silently reordering `tasks.md`.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — combining T02+T03 into one build-verify pass was accepted as proposed.

**How you verified it:** `npx vitest run` reported **309 passed (309)**, exit 0, after combining the two tasks. The suite proves newest-`created_at`-first ordering with `id DESC` as the tie-break on rows sharing one identical `created_at` instant, 25 seeded rows at default size returning `size=20, page=1, total=25`, `page=99&size=10` against 25 rows returning the real last page rather than an empty array, and every F03-AC5 input over HTTP returning 200 (never 400). The declared smoke contract (`/api/health`, `/api/bookmarks`, `/api/tags`) returned 200/200/200.

**Outcome:** worked

**Iteration:** No further changes were needed; the combined pass was clean on the first attempt.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)

### Evidence E-build-304

**SDLC activity:** build

**Task/feature:** F03-T05 — list state in `BookmarksStore` (`items`, `total`, `page`, `size`, `listLoading`, `listError`, `countText`, `maxPage`, `loadList()`, `changePage()`, `changePageSize()`, `retryList()`), and a defect found while writing its tests.

**Context given to AI:** `spec.md` F03-AC11 (one fixed error message for the list's error state, regardless of cause), `lld.md` LD-04's stale-response request-token guard, and the store's existing `save()` flow from F01.

**Prompt/request:** Build F03-T05 to the LLD's state shape and done-when clause.

**AI response summary:** The store and its tests were written in one pass. Running the new tests surfaced two separate issues: (1) a new "save refreshes the list" test asserted state immediately after `http.expectOne(...).flush(...)` without awaiting the microtask of the fire-and-forget `void this.loadList()` call, which Copilot fixed with `await Promise.resolve()` before the assertion, matching no prior precedent in this codebase (this was the first occurrence, later reused at T08); (2) while re-reading `spec.md` §2 against the written code, Copilot caught that `loadList()`'s failure path reused `toApiError(error).message`, which varies by cause and does not satisfy F03-AC11's requirement for one fixed message — fixed to a constant string before starting T06, since T06's error-state rendering depends on it.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — both the async-timing fix and the AC11 fixed-message fix were accepted as proposed.

**How you verified it:** `npx ng test --watch=false` reported all tests passing after both fixes. The suite asserts `countText()` reads `1 bookmark` for `total=1` and `N bookmarks` otherwise, `changePageSize()` sets `page` to `1` before calling the API, resolving two fake `listBookmarks()` promises out of order leaves `items` matching only the later call's result (the LD-04 guard), and `listLoading` is `true` only while a request is in flight.

**Outcome:** worked

**Iteration:** The AC11 fix was folded into T05 rather than deferred to T06, since T06's error-state test would otherwise have pinned the wrong (non-fixed) message.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)

### Evidence E-build-305

**SDLC activity:** build

**Task/feature:** F03-T06 — the bookmark list and card markup (count region, loading/empty/error states, card row with tags and Edit/Delete), and a test run that appeared to hang.

**Context given to AI:** `spec.md` F03-AC1/AC2/AC8/AC10/AC11/AC12 and F03-EC3/EC4/EC5, `lld.md`'s card layout, and three consecutive `npx ng test --watch=false` invocations that each produced no output for 60-150 seconds (roughly 10-20x the suite's normal run time).

**Prompt/request:** Build F03-T06, then diagnose why `ng test` appears to hang instead of completing or failing.

**AI response summary:** Rather than assume the new spec file was broken (e.g. an infinite loop in a `@for`/signal, or a malformed selector causing Angular's test harness to hang), Copilot temporarily swapped in a minimal smoke spec that only mounts `BookmarkList` and asserts it exists, leaving production code untouched. That minimal spec completed in ~7 seconds, narrowing the cause away from the component/template. Copilot then checked `Get-Process node | Select-Object Id,CPU,StartTime` while a full run was in progress and observed climbing CPU values over time (not a flat, stuck value), which is inconsistent with a deadlock. It concluded the slowness was transient environment load — independently corroborated by that same session's `eslint --fix` (~460s vs. a historical ~25s) and `ng build` (~461s) calls — and restored the full spec unchanged.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the transient-slowness diagnosis was accepted as reasoned.

**How you verified it:** The restored, unmodified spec file passed **78 of 78** tests once the slow run completed. No application or test code was changed as part of the diagnosis — only a temporary, reverted smoke spec was used to isolate the cause.

**Outcome:** worked

**Iteration:** Documented in `tasks.md`'s Plan vs. Actual table so a future slow `ng test` run is not mistaken for a real hang without first checking process CPU usage.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)

### Evidence E-build-306

**SDLC activity:** build

**Task/feature:** F03-T08 — wiring `<app-bookmark-list>` into the app shell, the F03-AC7 restart spot check, and the F03-AC9 keyboard walkthrough.

**Context given to AI:** `spec.md` F03-AC7 (restart persistence) and F03-AC9 (keyboard access to the card actions and pagination control), `lld.md`'s wiring plan (`loadList()` once on startup, `addRequested` to `openDialog()`), and `app.ts`'s existing `openDialog(event: Event)` signature from F01.

**Prompt/request:** Build F03-T08: replace the F01 placeholder with the real list, wire it up, then run the restart spot check and the keyboard walkthrough.

**AI response summary:** Wiring `addRequested` directly to `openDialog(event)` required `BookmarkList.addRequested` to carry the real DOM event rather than `void`, since `openDialog()` uses the event to resolve the opener element for focus-return on `Esc` (the same pattern F01 already used for the header and FAB buttons). Copilot changed the output's type from `output<void>()` to `output<Event>()` and updated the one `.emit()` call site to pass `$event`, calling this out as an LLD gap (implied by T06's existing `addRequested.emit()` call, but not spelled out as a signature change) rather than a silent deviation. Two new `app.spec.ts` tests then failed on the same async-timing gap seen at T05, fixed the same way. Copilot executed the F03-AC7 restart spot check against a real running server (seeding synthetic bookmarks, capturing both pages, stopping and restarting the process, re-fetching and diffing both pages), and in doing so made and then caught its own mistake: the first cleanup attempt used a `*.sqlite*` glob that did not match the project's real `tagvault.db` file name, silently leaving seed data behind until a later reseed's unexpectedly high `total` exposed it; this was corrected and recorded honestly in `tasks.md` rather than left undocumented.

**Your decision:** Accepted — confirmed by dev-1 running the F03-AC9 keyboard walkthrough against the live app and reporting "Everything is working as expected."

**What you changed and why:** No changes — the `output<Event>()` wiring and all other T08 work were accepted as implemented.

**How you verified it:** `npx ng test --watch=false` reported **84 of 84** passing and `npx vitest run` (api) reported **309 of 309** passing after the async-timing fix. `npx ng build` completed cleanly. The declared smoke contract (`GET /`, `/api/health`, `/api/bookmarks`, `/api/tags`) returned 200/200/200/200 against a running server. The F03-AC7 restart check captured identical `items` (ids, urls, `created_at`, order) and identical `total` on both paginated pages before and after a real process stop/restart. The F03-AC9 keyboard walkthrough was performed by dev-1 against the running app (22 synthetic bookmarks seeded, two pages) and confirmed: `Tab` reaches every card's Edit then Delete in visual order, then the page-size select, then Previous/Next, each with a visible focus indicator; the page-size select carries an associated label; the current page is conveyed as text.

**Outcome:** worked

**Iteration:** No screenshot was supplied for `docs/assets/`; the verbal confirmation stands as the recorded verification.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-402

**SDLC activity:** build

**Task/feature:** F04-T01\u2026T03 \u2014 the backend tag-filter layer: `buildPredicate({ tag })`'s `EXISTS` subquery and `normalizeTagFilterValue()` in `list-query.js`; `bookmark-service.list({ page, size, tag })` and the new `countLive()`; and the `routes/bookmarks.js` `?tag=` query param plus the new `GET /api/bookmarks/count` route.

**Context given to AI:** `specs/features/F04-filter-by-tag/lld.md` (LD-01 object-param `buildPredicate` signature, LD-02 a separate `normalizeTagFilterValue()`, LD-04 the new count route) and `tasks.md`'s F04-T01\u2026T03 rows (files, covered AC, done-when criteria); the existing `list-query.js`/`bookmark-service.js`/`routes/bookmarks.js` read directly to extend them without breaking F03's unfiltered-list contract.

**Prompt/request:** Build F04-T01, then F04-T02, then F04-T03, one task at a time, each followed by the build-verify loop.

**AI response summary:** Added `buildPredicate({ tag } = {})`'s `EXISTS` subquery against `bookmark_tag`/`tag`, and `normalizeTagFilterValue(raw)` (trim, lowercase, returns `null` for anything not a non-empty string) in T01, with unit tests covering the normalizer's full input table. Extended `bookmark-service.list()` to normalize and thread `tag` through, and added `countLive()` reusing `buildPredicate()` with no tag, in T02. Wired `req.query.tag` into the route and registered `GET /api/bookmarks/count` ahead of any future `:id`-shaped route, in T03 \u2014 tests were added to the existing `bookmarks-route.test.js` rather than a new `count-route.test.js`, a declared deviation from the file list in `tasks.md` since the new assertions fit naturally alongside the existing route-level test setup.

**Your decision:** Accepted

**What you changed and why:** T03's test file placement was consolidated into the existing `bookmarks-route.test.js` instead of a new `count-route.test.js`, because the two routes share the same running-server test fixture and splitting them would have duplicated setup for no benefit (constitution P3/P6 \u2014 simplicity, no unnecessary files).

**How you verified it:** `npx vitest run` after each task: T01 \u2192 378 tests passed (21 files); T02 \u2192 384 tests passed (6 new); T03 \u2192 389 tests passed. T03's smoke check (`curl`-equivalent against `/api/health`, `/api/bookmarks`, `/api/tags`, `/api/bookmarks/count`) failed once with a 404 on the count route \u2014 diagnosed as a stale `node` process left bound to port 3000 from an earlier session (confirmed via `netstat`), not a code defect; killed the stale PID and re-ran, getting `200`/`200`/`200`/`200` with `/api/bookmarks/count` returning `{"total":3}`.

**Outcome:** worked

**Iteration:** One iteration per task; the T03 smoke failure was an environmental stale-process issue, resolved without a code change.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-403

**SDLC activity:** build

**Task/feature:** F04-T04\u2026T10 \u2014 the frontend tag-filter layer: API client/model extensions, the extracted `tagHue()` helper, `BookmarksStore`'s tag-filter state and `refreshTagRail()`, the new `TagRail` component, `BookmarkList`'s chips-as-buttons/active-filter-chip/tag-empty-state changes, mounting `TagRail` in the app shell, and the rail/chip CSS port from `docs/mockup.html`.

**Context given to AI:** `lld.md`'s LD-03 (rail+count reload on every `loadList()`), LD-05 (`TagRail` injecting `BookmarksStore` directly, matching every other feature component), LD-06 (active-filter chip rendered inside `BookmarkList` beside `#count`, matching the mockup's actual DOM nesting); `tasks.md`'s F04-T04\u2026T10 rows; the existing `bookmarks.store.ts`, `bookmark-list.ts/html`, `app.ts/html`, `styles.css`, and `docs/mockup.html` read directly for the exact rail/chip markup, hues, and CSS to port.

**Prompt/request:** Build F04-T04 through F04-T10, one task at a time, each followed by the build-verify loop.

**AI response summary:** T04 added `TagWithCount`/`CountBookmarksResponse` models and `listTags()`/`countBookmarks()` API methods. T05 extracted `tagHue()` into `src/app/core/tag-hue.ts` out of `BookmarkList`'s private copy. T06 added `tagFilter`/`tagRail`/`allCount` signals and `selectTag`/`toggleTagFilter`/`clearTagFilter`/`refreshTagRail()` (with its own `tagRailRequestToken` stale-response guard and the EC17 \"active filter absent from the new rail\" fallback) to `BookmarksStore`. T07 added the new `TagRail` component and the `tag` icon path. T08 changed `BookmarkList`'s card chips into buttons calling `store.selectTag(tag)`, added the active-filter chip beside `#count`, and the tag-empty state branch \u2014 this required updating one existing F03 assertion in `bookmark-list.spec.ts` that asserted chips were non-interactive spans, now superseded by F04. T09 mounted `<app-tag-rail />` in `app.html`; the first test run failed one pre-existing accessibility assertion (every `.ic` element must carry `aria-hidden=\"true\"`) because the new rail icon was a bare, unwrapped `<svg class=\"ic\">` \u2014 fixed in one attempt by wrapping it in the same `<span class=\"ic\" aria-hidden=\"true\">` pattern used everywhere else in the app. T10 ported the rail/chip CSS rules from the mockup.

**Your decision:** Accepted

**What you changed and why:** T09's icon markup was changed to match the established `.ic`/`aria-hidden` wrapper pattern, because the app's own existing accessibility test (not a new requirement) caught the inconsistency; T08 and T07 added `*.spec.ts` files beyond `tasks.md`'s declared file list, because every other component in this codebase carries direct unit-test coverage for its own file (constitution P6 \u2014 don't ship untested behavior) and the LLD's file list predates the per-component-test convention already established by F01-F03.

**How you verified it:** `npx ng test --watch=false` after each task: T04 \u2192 (existing suite, extended, build clean); T05 \u2192 125 passed (9 files); T06 \u2192 125 passed (unchanged count, new store coverage deferred to T11 as planned); T07 \u2192 133 passed (8 new); T08 \u2192 137 passed (4 new/updated); T09 \u2192 first run had 1 failure (the `.ic`/`aria-hidden` assertion), re-run after the fix \u2192 137 passed; T10 \u2192 137 passed. `npx ng build` was clean at every step (final bundle 183.37 kB initial total). Smoke (`Invoke-WebRequest http://localhost:4200/` \u2192 200) passed after every task.

**Outcome:** worked

**Iteration:** T09 needed one fix iteration (the icon wrapper); every other task in this group passed build-verify on the first attempt.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-404

**SDLC activity:** build

**Task/feature:** F04-T11 \u2014 extending `bookmarks.store.spec.ts` with tests for `selectTag`, `toggleTagFilter`, `clearTagFilter`, `refreshTagRail`'s EC17 fallback, and the `tagRailRequestToken` stale-response guard (F04-EC4); and F04-T12 \u2014 the manual keyboard walkthrough of the tag rail and active-filter chip.

**Context given to AI:** `tasks.md`'s F04-T11/T12 rows; `bookmarks.store.ts`'s actual implementation of `loadList()` (which calls `void this.refreshTagRail()` as a fire-and-forget call, not awaited) and `refreshTagRail()` (its own `Promise.all([listTags(), countBookmarks()])` and `tagRailRequestToken` guard); the existing test file's established `HttpTestingController` conventions (no global `http.verify()` in this file).

**Prompt/request:** Build F04-T11 (extend the store spec), then F04-T12 (manual walkthrough), continuing `/build-feature F04-filter-by-tag`.

**AI response summary:** Drafted an initial version of the new test block that flushed `/api/tags`/`/api/bookmarks/count` via `loadList()`'s indirect, fire-and-forget call to `refreshTagRail()`. Before running it, a code-level review (tracing the actual microtask ordering of `void this.refreshTagRail()` inside `loadList()`) found two predictable bugs: (1) several tests called `http.expectOne('/api/tags')` before those requests were actually issued (they only become outstanding once `loadList()`'s own promise is awaited, letting its continuation run); (2) the EC4 stale-response test raced two `loadList()` calls, which doesn't actually exercise the independent `tagRailRequestToken` guard, because `loadList()`'s own `listRequestToken` check would prevent the earlier call's `refreshTagRail()` from ever being invoked if superseded. Rewrote the block to call `store.refreshTagRail()` directly (capturing and awaiting its own returned promise) for every rail-specific assertion, and used `http.match()` instead of `http.expectOne()` for the EC4 test since two concurrent calls produce two outstanding requests to the identical URL. Also simplified the `countText` tests to set `store.total`/`store.allCount`/`store.tagFilter` signals directly rather than routing through HTTP, avoiding the same timing class of bug entirely.

**Your decision:** Accepted

**What you changed and why:** Chose to catch and fix the async-ordering bug through manual code review before running any test, rather than spending one of the build-verify loop's 3 allowed fix attempts on a bug that was fully diagnosable from the code; this matches the build-verify-loop skill's intent that fix attempts are for genuine, unpredicted failures.

**How you verified it:** `npx ng test --watch=false` on the corrected test block: 149 tests passed (10 files, 12 new F04 tests, 0 failed) on the first run after the rewrite. `npx ng build` clean (183.37 kB). For F04-T12, started both the `api` (`node src/server.js`) and `web` (`npx ng serve`) servers and asked the human to perform the keyboard walkthrough directly against the running app at `http://localhost:4200/`; the human reported Tab order, visible focus, and Enter/Space activation all correct across \"All bookmarks\", every rail tag button, and the active-filter chip's \"Clear tag filter\" button.

**Outcome:** worked

**Iteration:** The T11 test-ordering bug was caught and corrected before the first test run, so no failed build-verify attempt was recorded for it. T12 passed on the human's first walkthrough.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-501

**SDLC activity:** build

**Task/feature:** F05-T01 — refactor `buildPredicate({ tag, q } = {})` to a clause array (LD-01), add the escaped search `LIKE` clause (LD-02), and add `normalizeSearchValue()` (LD-03) in `app/api/src/services/list-query.js`, with extended `test/list-query.test.js` coverage (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC11, F05-EC2)

**Context given to AI:** `lld.md` §2 (LD-01, LD-02, LD-03), §3, §5, §9, §11; `tasks.md` F05-T01's row; the shipped `list-query.js` (F03/F04), `like-escape.js`'s `escapeLikePattern()`, and the existing `list-query.test.js` (F04's assertions, which must stay byte-identical per the task's done-check)

**Prompt/request:** Implement F05-T01 per the task brief: clause-array refactor, escaped LIKE clause for search, new normalizer, extend unit tests for all four predicate shapes and the normalizer's input table

**AI response summary:** Rewrote `buildPredicate()` as a clause-array builder (`deleted_at IS NULL` always, optional tag `EXISTS`, optional `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` via `escapeLikePattern(q)`), added `normalizeSearchValue(raw)` (trim, cap 200 chars, `null` for non-strings/empty/arrays, no lowercasing — unlike the tag normalizer), and extended `list-query.test.js` with `q`-only, combined tag+q, and `normalizeSearchValue` input-table tests

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors after fixing a self-inflicted syntax corruption from an overlapping string replacement — see Iteration), then `npx vitest run test/list-query.test.js` (29/29 passed, including the byte-identical F04 tag-only assertion), then the full suite `npx vitest run` (25 files, 437/437 passed — no regression to F01-F04)

**Outcome:** worked

**Iteration:** First attempt introduced a parsing error in both `list-query.js` and `list-query.test.js` because two `replace_string_in_file` calls matched overlapping text and merged unrelated blocks. Diagnosed from the exact `eslint`/`vitest` parse-error output, rewrote the affected regions precisely, and reran the loop — second attempt passed clean

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-502

**SDLC activity:** build

**Task/feature:** F05-T02 — extend `bookmark-service.js`'s `list({ page, size, tag, q })` to normalize `q` via `normalizeSearchValue()` and thread it into `buildPredicate()` alongside `tag`, with new unit tests in `test/bookmark-service.test.js` (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC10, F05-EC3, F05-EC4)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T02's row; the already-refactored `list-query.js` (F05-T01, `buildPredicate({ tag, q })` and `normalizeSearchValue()`); the existing `bookmark-service.js` `list()` method and its F03/F04 test organization (`makeService()` helper, `seedTagged()` local helper inside the F04 describe block)

**Prompt/request:** Implement F05-T02 per the task brief: thread `q` through the service's `list()` call to `buildPredicate()`, and add unit tests against a real `:memory:` schema for title-only, URL-only, case-insensitive, `%`/`_`-literal, quote/`<script>`-literal, and combined search+tag fixtures

**AI response summary:** Updated `bookmark-service.js`'s import to add `normalizeSearchValue` and changed `list()` to call `buildPredicate({ tag: normalizeTagFilterValue(tag), q: normalizeSearchValue(q) })`. Added a new `describe('F05 — list({ q }) search', ...)` block to `bookmark-service.test.js` with a `seedBookmark()` helper and ten test cases covering: title-only match (F05-AC1), URL-only match (F05-AC2/EC4), case-insensitivity (F05-AC3), literal `%` (F05-AC4), literal `_` (F05-AC5), quote and `<script>` payloads matched literally without throwing (F05-AC6), combined tag+search intersection (F05-AC9/EC3), and a page/total sanity check (F05-AC10's service-level precondition — the actual page-reset-to-1 behavior is the web store's responsibility per F05-T07)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors), then `npx vitest run test/bookmark-service.test.js` (55/55 passed, 26 new), then the full suite `npx vitest run` (25 files, 446/446 passed — no regression to F01-F04)

**Outcome:** worked

**Iteration:** None needed this time — the production-code edit and the new test block were both syntactically clean on the first attempt (more careful, non-overlapping `replace_string_in_file` targeting after the F05-T01 corruption lesson)

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-503

**SDLC activity:** build

**Task/feature:** F05-T03 — extend `routes/bookmarks.js`'s `GET /bookmarks` handler to read `req.query.q` and pass it through unvalidated alongside `page`/`size`/`tag`, with new HTTP-level tests in `bookmarks-route.test.js` (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC11)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T03's row; the already-threaded `bookmark-service.js` `list({ q })` (F05-T02); the existing `routes/bookmarks.js` GET handler and `bookmarks-route.test.js`'s F04 `?tag=` describe block (`createTagged()` helper, a real listening server per test)

**Prompt/request:** Implement F05-T03 per the task brief: thread `req.query.q` through to `service.list()`, and add HTTP-level tests for a title match, a quote payload, a `<script>` payload, a 210-character query, and a combined `?tag=&q=` request

**AI response summary:** Updated the GET handler's doc comment and call to include `q: req.query.q`. Added a new `describe('GET /api/bookmarks?q= — F05-AC1-AC6, AC9, F05-EC3', ...)` block with 5 tests reusing the existing `createTagged()` helper

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** First attempt failed lint (`no-undef` on `createTagged`, 8 errors) because the helper was scoped inside the F04 `describe` block and not visible to the new F05 block; fixed by hoisting `createTagged` to module scope next to the existing `post()` helper. Second attempt: `npx prettier --write .` and `npx eslint . --fix` (0 errors), `npx vitest run test/bookmarks-route.test.js` (20/20 passed, 5 new), then the full suite `npx vitest run` (25 files, 451/451 passed — no regression)

**Outcome:** worked

**Iteration:** One fix cycle — a scoping (`no-undef`) lint failure on the first attempt, resolved by hoisting the shared `createTagged()` helper to module scope; second attempt passed clean

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-504

**SDLC activity:** build

**Task/feature:** F05-T04 — add a third timed run to `nfr01-timing.test.js` for `GET /api/bookmarks?q=` against the existing 1,000-record seed (supports NFR-01; no AC of its own)

**Context given to AI:** `lld.md` §11; `tasks.md` F05-T04's row (explicitly: the actual run and recorded median/max numbers are deferred to `/test-phase F05-search`, this task only needs the test itself to exist and pass its in-build threshold assertion); the existing `nfr01-timing.test.js` (its `seedOneThousand()` seed and the two existing timed `page=1`/`page=50` tests' structure)

**Prompt/request:** Implement F05-T04 per the task brief: add a third timed test for `?q=` following the existing median/max-over-REPS pattern

**AI response summary:** Added a third `it(...)` inside the existing `describe` block: `GET /api/bookmarks?q=bookmark&size=20` repeated `REPS` (20) times, asserting `total === SEED_COUNT` and 20 items per page, collecting timings, then asserting median and max are each `< 1000ms` (same threshold/shape as the two existing tests)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors), then `npx vitest run test/nfr01-timing.test.js` (3/3 passed, 1 new), then the full suite `npx vitest run` (25 files, 452/452 passed — no regression). The actual median/max numbers from this run are **not** recorded here per the task's explicit deferral to `/test-phase F05-search`

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-505

**SDLC activity:** build

**Task/feature:** F05-T05 — extend `ApiService.listBookmarks(page, size, tag?, q?)` (`web`) to append `q` only when non-null, mirroring the existing `tag` convention (supports F05-AC1, wiring only)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T05's row; the existing `api.service.ts` `listBookmarks()` method and its `tag`-only-when-non-null pattern

**Prompt/request:** Implement F05-T05 per the task brief: add an optional `q` parameter appended to the request params only when non-null

**AI response summary:** Added a `q?: string | null` fourth parameter to `listBookmarks()`, appending `params['q'] = q` only when `q != null`, and updated the method's doc comment to describe both `tag` and `q`'s identical non-null-only convention

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src` and `npx eslint . --fix` (0 errors — the first `npx ng build` invocation combined with the preceding `prettier`/`eslint` chain in one terminal appeared to hang for several minutes with no new output; killed that terminal and reran `eslint . --fix` alone, which completed quickly with no errors), then `npx ng build` (succeeded, 16.4s, no new chunk-size warnings), then `npx ng test --watch=false` (11 files, 167/167 passed — no regression; `--browsers=ChromeHeadless` is not a valid flag for this project's vitest-based `ng test`, corrected to the bare watch-mode flag)

**Outcome:** worked

**Iteration:** One environment hiccup — a chained `prettier && eslint && ng build` command in a single terminal call appeared to hang indefinitely (likely a terminal/PTY buffering issue, not an actual lint/build hang, since `eslint` alone completed in seconds when rerun separately); recovered by killing the stalled terminal and running each step as its own command. A separate, unrelated flag mistake (`--browsers=ChromeHeadless`) was corrected once `ng test`'s actual CLI reported the right usage

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-506

**SDLC activity:** build

**Task/feature:** F05-T06 — add `search` and `x` icon paths to `icons.ts` (`web`), ported numerically from `docs/mockup.html`'s icon set (supports F05-AC7, AC12)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T06's row; the existing `icons.ts` `ICON_PATHS` map and its single-`<path [attr.d]>`-per-icon rendering convention (confirmed via `bookmark-list.html`'s usage); `docs/mockup.html`'s icon definitions (`const P = {...}`), which render `search` as a separate `<circle>` + `<path>` pair and `x` as a two-subpath `<path>`; `styles.css`'s `.ic svg` rule (`fill: none; stroke: currentColor`), confirming every icon is stroke-only so multiple `M`-prefixed subpaths in one `d` string render identically to separate elements

**Prompt/request:** Implement F05-T06 per the task brief: add `search` (circle + handle) and `x` icon paths

**AI response summary:** Discovered no pre-existing `x` icon was actually present in `icons.ts` (the LLD's reference to an "existing x-icon precedent" did not match the shipped code) — both icons were added fresh. Converted mockup's `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>` into a single `d` string using two 7-radius arcs to draw the circle followed by a second `M`-prefixed subpath for the handle line (`M18 11a7 7 0 1 1-14 0 7 7 0 1 1 14 0M20 20l-3.5-3.5`); ported `x` directly from the mockup's two-line `d` (`M18 6 6 18M6 6l12 12`)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/core/icons.ts` and `npx eslint src/app/core/icons.ts --fix` (0 errors), then `npx ng build` (succeeded, 2.2s, no new warnings). No automated visual-equivalence check was run — the task's done-check ("render visually equivalent to the reference") is a visual judgment deferred to the human's manual verification once F05-T08/T09/T10 wire these icons into the UI

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-507

**SDLC activity:** build

**Task/feature:** F05-T07 — extend `bookmarks.store.ts` with `search` state, `setSearchText`/`clearSearch`, `loadList()` threading, and `countText` composition (`web`); F05-T12 — the matching `bookmarks.store.spec.ts` assertions, written together with the store change rather than as a separate pass (F05-AC9, AC10, AC13)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T07's and F05-T12's rows; the full current `bookmarks.store.ts` (430 lines), in particular the F04 tag-filter precedent (`tagFilter` signal, `selectTag`/`toggleTagFilter`/`clearTagFilter`, the `listRequestToken` out-of-order guard in `loadList()`, and the existing `countText` computed); the existing `bookmarks.store.spec.ts` F04 `describe('BookmarksStore — tag filter (F04)', ...)` block as the test-shape precedent

**Prompt/request:** Implement F05-T07 per the task brief: add `search` signal (`''` default), `setSearchText(value)`/`clearSearch()` methods mirroring `selectTag`/`clearTagFilter`'s set→page.set(1)→loadList() pattern, thread `this.search()` into `api.listBookmarks()`'s 4th arg as `null` when empty, and update `countText` to check `search() !== ''` alongside `tagFilter() !== null`. Also wrote F05-T12's store-spec assertions in the same pass since the two tasks' done-checks are textually identical

**AI response summary:** Added the `search` signal grouped with the F04 tag-filter state; updated `countText`'s condition to an `||`; changed `loadList()`'s `api.listBookmarks()` call to a multi-line call passing `this.search() === '' ? null : this.search()` as the 4th argument; added `setSearchText`/`clearSearch` methods adjacent to `clearTagFilter`. Added a new `describe('BookmarksStore — search (F05)', ...)` block with 7 tests: `setSearchText` alone and composed with an active tag filter (asserting the exact built query string), `clearSearch`, an out-of-order `loadList()` guard test (search call racing a prior call, mirroring F04-EC4's test shape), and three `countText` composition cases (search alone, both active, neither active)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts` and `npx eslint ... --fix` (0 errors), then `npx ng build` (succeeded, 3.0s), then `npx ng test --watch=false` (11 files, 174/174 tests passed — 7 new, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-508

**SDLC activity:** build

**Task/feature:** F05-T08 — new `SearchBox` component (`web`): `#q`/`#qx` markup, 250 ms debounce calling `store.setSearchText()`, immediate `hasText` signal for `#qx`'s visibility, click-to-clear (F05-AC12, AC13)

**Context given to AI:** `lld.md` §2, §11 (LD-04); `tasks.md` F05-T08's row; `TagInput`'s shipped component/spec as the debounce-pattern precedent (`SUGGESTION_DEBOUNCE_MS`, `debounceHandle`, fake-timer test shape); `docs/mockup.html`'s `.search` markup (`#q`/`#qx`, the `sr`-class visually-hidden label, the icon spans) and its `$('#qx').onclick` handler; `app.html`'s existing `[attr.d]="icons.X"` single-path-per-icon rendering convention; the now-complete `bookmarks.store.ts` `setSearchText`/`clearSearch` methods from F05-T07

**Prompt/request:** Implement F05-T08 per the task brief: a standalone `SearchBox` component with a local `hasText` signal driving `#qx`'s immediate show/hide, a 250 ms debounce before calling `store.setSearchText()`, and a clear handler that cancels the debounce, empties the native input, calls `store.clearSearch()`, and returns focus to `#q`

**AI response summary:** Created `search-box.ts` (debounce via `setTimeout`/`clearTimeout` mirroring `TagInput`), `search-box.html` (ported `#q`/`#qx` markup, visually-hidden label, decorative icon spans using `icons.search`/`icons.x`), and `search-box.spec.ts` (7 tests: label/icon wiring, `#qx` absent/immediate-present, two fake-timer debounce tests, clear-cancels-debounce, and focus-return). First test run failed `http.verify()` because `loadList()`'s `refreshTagRail()` follow-up issues `/api/tags`/`/api/bookmarks/count` requests that the tests never flushed, and a failed assertion left `TestBed` unable to reconfigure for subsequent tests in the file. Second attempt added the missing flushes but still failed because the flush calls ran before the awaited promise's continuation (which issues those follow-up requests) had executed as a microtask. Third attempt inserted `await Promise.resolve()` twice between the primary flush and the follow-up `expectOne` calls, which let the microtask queue drain first

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/features/search-box` and `npx eslint src/app/features/search-box --fix` (0 errors both times), `npx ng build` (succeeded each attempt, ~2.3-3.1s), and `npx ng test --watch=false` across all three attempts — final run: 12 files, 181/181 tests passed (7 new), no regression

**Outcome:** worked (after 2 fix attempts)

**Iteration:** 2 fix attempts — see Build-Verify Log rows for F05-T08 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-509

**SDLC activity:** build

**Task/feature:** F05-T09 — reorder `BookmarkList`'s empty-state branch precedence and add the search no-results state (`web`), F05-AC7, AC8, F05-EC3, F05-EC5, F05-EC6

**Context given to AI:** `lld.md` §2, §11 (LD-06, the corrected precedence rule); `tasks.md` F05-T09's row; `docs/mockup.html`'s `empty(kind)` function (the `none`/`search`/`tag` message table and its `!n ? 'none' : q ? 'search' : 'tag'` precedence, where `n` is the unfiltered count); the current `bookmark-list.html` (all-empty and tag-empty `@else if` branches, in the wrong precedence order per the F05 LLD's design-alternatives discussion from `/design-feature`)

**Prompt/request:** Implement F05-T09 per the task brief: reorder so `store.allCount() === 0` is checked first, add a search no-results branch (heading `No bookmarks match "<q>"`, fixed copy, primary `Clear search`, and a conditional secondary `Clear tag filter` only when a tag filter is also active), ahead of the existing tag-empty branch

**AI response summary:** Rewrote the three `@else if` branches in the corrected order (all-empty → search-no-results → tag-empty → list), using `icons.search` for the new branch's art and porting the exact mockup copy. `ng build` succeeded immediately, but `ng test --watch=false` regressed 12 previously-passing tests across `bookmark-list.spec.ts` and `app.spec.ts` — every populated-list fixture in those files left `store.allCount()` at its default `0`, so the new all-empty branch (which checks `allCount() === 0` first) now rendered instead of the list/other empty states those tests expected. Fixed by adding a default `store.allCount.set(1)` to `bookmark-list.spec.ts`'s shared `beforeEach` (with an explicit `.set(0)` override in the one test that exercises the true all-empty state) and an explicit `allCount.set(1)` in `app.spec.ts`'s `viewExisting` test, which populates the list without ever setting `allCount`

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write ...` and `npx eslint ... --fix` (0 errors), `npx ng build` (succeeded, ~2.9s), and `npx ng test --watch=false` — final run: 12 files, 181/181 tests passed, no regression

**Outcome:** worked (after 1 fix attempt)

**Iteration:** 1 fix attempt — see Build-Verify Log rows for F05-T09 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-510

**SDLC activity:** build

**Task/feature:** F05-T10 — mount `<app-search-box />` in `app.html`'s `.bar`, wire `app.ts` imports (`web`, F05-AC12)

**Context given to AI:** `tasks.md` F05-T10's row; the current `app.html`/`app.ts` (logo span, *Add bookmark* button, existing `imports: [BookmarkForm, BookmarkList, TagRail, Toast]` array); `docs/mockup.html`'s header DOM order (`.logo`, `.search`, *Add bookmark*, theme toggle)

**Prompt/request:** Implement F05-T10 per the task brief: mount the search box between the logo and the *Add bookmark* button, matching the mockup's DOM order

**AI response summary:** Added a `<div class="search"><app-search-box /></div>` between the `.logo` span and the *Add bookmark* button in `app.html`; added the `SearchBox` import and listed it in `app.ts`'s `@Component({ imports: [...] })` array

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/app.html src/app/app.ts` and `npx eslint src/app/app.ts --fix` (0 errors, both unchanged by prettier), `npx ng build` (succeeded, 3.1s), and `npx ng test --watch=false` (12 files, 181/181 tests passed, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-511

**SDLC activity:** build

**Task/feature:** F05-T11 — port `.search`, `.search input`, `.si`, `.cl`, and the `>=720px` `.search` reorder/width rule from `docs/mockup.html` into `styles.css` (`web`, F05-AC12, visual contract only)

**Context given to AI:** `tasks.md` F05-T11's row; `docs/mockup.html`'s `<style>` block (`.search`, `.search input`, `.si`, `.cl`, the `@media(min-width:720px)` reorder rule, and `.sr`); the current `styles.css`'s `.bar`/`.logo`/`.logo .ic` rules and its existing `@media (min-width: 640px)` block, as the insertion point

**Prompt/request:** Implement F05-T11 per the task brief: port the five listed rule groups numerically from the mockup

**AI response summary:** Inserted the ported rules immediately after the existing `@media (min-width: 640px)` block: `.search` (order 3, full-width row by default), `.search input` (46px min-height, 42px/46px padding for the icon/clear button), `.si` (absolute-positioned search icon), `.cl` (absolute-positioned clear button), and the `>=720px` reorder (`.search` to `order:0`, capped width, pushed right via `margin-left:auto`, `.logo` margin reset, `.bar` gap). Also added a `.sr` visually-hidden-label rule — not explicitly named in the task's rule list, but required for `search-box.html`'s (F05-T08) `<label class="sr">` to render invisibly as the reference does; without it the task's own done-check ("visually matches the reference") would not hold

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/styles.css` and `npx eslint src --fix` (0 errors, unchanged), `npx ng build` (succeeded, 2.3s), and `npx ng test --watch=false` (12 files, 181/181 tests passed, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-512

**SDLC activity:** build

**Task/feature:** F05-T13 — extend `bookmark-list.spec.ts` with tests for the corrected empty-state precedence order and the no-results state's conditional second action (`web`, F05-AC7, AC8, F05-EC3, F05-EC5)

**Context given to AI:** `tasks.md` F05-T13's row; the current `bookmark-list.html` (F05-T09's reordered branches) and `bookmark-list.spec.ts` (the existing `F04-AC9` tag-empty test and the shared `beforeEach`'s `allCount.set(1)` default)

**Prompt/request:** Implement F05-T13 per the task brief: add tests asserting all-empty beats both tag-empty and search-no-results, and that the no-results state's second `Clear tag filter` action only appears when a tag filter is also active

**AI response summary:** Added a new `describe` block with 5 tests: all-empty wins when search+tag are both set but `allCount() === 0`; search-no-results wins over tag-empty when both are active but `allCount() > 0`; only `Clear search` renders with no tag filter; both `Clear search` and `Clear tag filter` render with one; and `Clear search`'s click wiring to `store.clearSearch()`. One test failed on the first run — it exposed a real template bug introduced in F05-T09: `@else if (... store.search() !== ''; as activeSearchForEmpty)` binds `as` to the boolean result of the whole condition expression, not to `store.search()`, so the heading rendered the literal string `"true"` instead of the search text. Fixed by reading `store.search()` directly in the heading interpolation instead of relying on the `as` alias

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write ...` and `npx eslint ... --fix` (0 errors), `npx ng build` (succeeded, 3.8s), and `npx ng test --watch=false` (12 files, 186/186 tests passed — 5 new, no regression)

**Outcome:** worked (after 1 fix attempt — which also fixed a latent F05-T09 bug)

**Iteration:** 1 fix attempt — see Build-Verify Log rows for F05-T13 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-513

**SDLC activity:** build

**Task/feature:** F05-T14 — manual keyboard walkthrough (`web`/`api`, F05-AC12) — two defects surfaced during the walkthrough and fixed before the walkthrough could be re-attempted

**Context given to AI:** F05-T14's task row in `tasks.md`; the running `npm start` server started earlier in the session to support the manual walkthrough; the human's report of two bugs instead of a pass/fail result

**Prompt/request:** The human reported: (1) "The search performs after debounce time but it is not filtering the list with the search URL or title. basically it does not filter and instead show all items." (2) "also on the search when we type something i can see two (x) buttons and on clicking on either clears the text. there should be only one (x) button"

**AI response summary:** Investigated Bug #1 by reproducing it directly against the running server with `curl`/`Invoke-RestMethod` (`GET /api/bookmarks?q=youtube` returned all 4 rows, `total: 4`), then read every backend layer in the call chain (`routes/bookmarks.js` → `services/bookmark-service.js` → `services/list-query.js` → `data/bookmark-repository.js`) and confirmed each was logically correct — `buildPredicate()`/`normalizeSearchValue()` invoked directly, and the resulting SQL run directly against the production `data/tagvault.db` file, both returned the correct filtered row. This ruled out a code defect. Checked `netstat -ano` for the PID bound to port 3000 and found it had been running since before this session's F05 code was finalized — a stale server process serving pre-F05 code from memory. Killed it (`Stop-Process -Force`). Investigated Bug #2 by reading `search-box.html`: the native `<input type="search">` renders the browser's own built-in clear icon (`::-webkit-search-cancel-button`) in addition to the component's own conditional `.cl` button, producing two visible "x" icons. Fixed by adding CSS to suppress the native icon (`::-webkit-search-cancel-button`, `::-webkit-search-decoration`, `::-ms-clear`) in `styles.css`, leaving only the component's own button. Ran the full build-verify loop for the CSS change (format/lint/build/test for `web`, plus a full `api` test run as a sanity check since the investigation touched api code paths), then restarted `npm start` fresh and re-confirmed via `curl` that `q=youtube` now correctly returns only the 1 matching row.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/styles.css`, `npx eslint . --fix`, `npx ng build` (0 lint errors, build succeeded) in `app/web`; `npx ng test --watch=false` (12 files, 186/186 passed, no regression); `npx vitest run` in `app/api` (25 files, 452/452 passed, no regression). Restarted the api server fresh and re-ran `curl "http://localhost:3000/api/bookmarks?page=1&size=20&q=youtube"`, which now returns exactly 1 row (`total: 1`, the "Youtube" bookmark) versus the 4 unfiltered rows from `GET /api/bookmarks?page=1&size=20` with no `q`. The human then reported the first Bug #2 attempt (`-webkit-appearance: none` on `::-webkit-search-cancel-button`/`::-webkit-search-decoration`) still showed two "x" buttons in their browser. Replaced it with `display: none` on `::-webkit-search-cancel-button` alone (matching `docs/mockup.html` line 41's already-proven rule exactly), rebuilt (`npx ng build`, new bundle `styles-7QAVGTJO.css`), re-ran `npx ng test --watch=false` (186/186, no regression), restarted the server fresh again, and confirmed the new CSS bundle was being served via `curl`. The human then re-performed the F05-T14 keyboard walkthrough and confirmed: "Great job, its fixed now."

**Outcome:** worked — both bugs confirmed fixed by the human after two CSS iterations

**Iteration:** 6 troubleshooting steps — see Build-Verify Log rows for F05-T14 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** Automated tests (452 api, 186 web) all passed throughout and never caught Bug #1, because the bug was never in the code under test — it was a stale, already-running server process left over from before the F05 backend changes were saved to disk. A green test suite only proves the code on disk is correct; it says nothing about which code a *separately running* process actually has loaded in memory. Any manual/live verification step must restart the server being tested immediately beforehand, or explicitly confirm (via the process start time, or a version/commit marker in a health endpoint) that it is running current code. Separately, for Bug #2: `-webkit-appearance: none` alone does not reliably hide `::-webkit-search-cancel-button` in current Chrome/Edge — `display: none` is the rule that actually works, and `docs/mockup.html`'s reference CSS already had the correct form; it should have been copied verbatim the first time instead of guessed at.

### Evidence E-build-602

**SDLC activity:** build

**Task/feature:** F06-edit-bookmark — implement all 11 tasks in `tasks.md` (PUT `/bookmarks/:id` route and its validation/conflict/duplicate handling on `api`; `editing`/`editBannerError` state, `beginEdit()`/`openEdit()`, the edit-mode dialog banners, and the row-button/duplicate-banner triggers on `web`), then run the human keyboard walkthrough (F06-T11).

**Context given to AI:** `specs/features/F06-edit-bookmark/lld.md` v1 (14 sections, approved) and `tasks.md` (11 tasks, F06-T01…T11, approved); `specs/architecture/hld.md` v3 (AMD-003's `EDIT_CONFLICT` 409); `specs/architecture/data-model.md`, `component-map.json`; the existing F01/F02/F03 `api` and `web` source as the patterns to extend (`bookmark-repository.js`, `bookmark-service.js`, `routes/bookmarks.js`, `app-error.js`, `bookmarks.store.ts`, `bookmark-form.*`, `bookmark-list.*`, `app.ts`/`app.html`); `docs/mockup.html`'s `openForm()`/`showDup()` as the UX reference for edit-mode reuse and the duplicate banner's two actions.

**Prompt/request:** Run `/build-feature F06-edit-bookmark` per `.github/prompts/build-feature.prompt.md` — implement `tasks.md` one task at a time with a build-verify loop after each, then perform the closing manual keyboard walkthrough (F06-T11).

**AI response summary:** Implemented F06-T01–T05 on `api` (`editConflictError`/`duplicateUrlError` helpers, `findLiveByNormalizedExcluding` + `update()` on the repository, `bookmark-service.update()` with LD-01 fail-closed optimistic concurrency and LD-02 self-exclusion duplicate check, the `PUT /bookmarks/:id` route, and `edit-conflict.test.js`'s two-tab simulation) and F06-T06–T10 on `web` (`EditBookmarkRequest`/`EDIT_CONFLICT` types, `updateBookmark()`, `BookmarksStore.editing`/`editBannerError`/`beginEdit()`/`CHANGES_SAVED_TOAST`, `BookmarkForm.openEdit()` plus the conflict/not-found banners, `BookmarkList`'s `editRequested` output, and `App`'s wiring of both edit entry points), each followed by its own build-verify loop (format/lint/build/test). During F06-T11's human walkthrough, the human reported the pre-existing duplicate banner's **View existing** button (F01-AC11, specified as F03's to wire) was non-functional — found to have never been wired in F03-T08. Fixed as an out-of-band F03 defect: `App.onViewExisting()` (close dialog, clear tag filter, reset to page 1, reload) plus a new `BookmarkList.scrollToAndFlash(id)` (ported from `docs/mockup.html`'s `showDup()`, respecting `prefers-reduced-motion`), `.card.flash`/`@keyframes fl` added to `styles.css`, and `matchMedia`/`scrollIntoView` jsdom stubs added to `test-setup.ts` (first lint attempt failed on 5 `@typescript-eslint/no-empty-function` errors in those stubs, fixed on retry by narrowing the stub shapes instead of supplying empty listener methods).

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Every task's build-verify loop was run for real and its output recorded in `tasks.md`'s Build-Verify Log: `api` finished at **25 test files, 422 tests passing** (`npx vitest run`), `web` finished at **11 test files, 167 tests passing** (`npx ng test --watch=false`) with `npx ng build` clean at 185.91 kB initial / 53.95 kB transfer, and `npx eslint . --fix` / `npx prettier --write .` clean on both components. F06-T04 was additionally verified with a manual `Invoke-WebRequest` PUT against a real running `node src/server.js` (200, `created_at` unchanged, `updated_at` advanced). F06-T11's keyboard walkthrough was performed by the human against both live dev servers (`node src/server.js`, `npx ng serve`): both edit triggers (row button, duplicate-banner "Edit existing") opened by keyboard only with correct pre-fill, `Esc` returned focus to each one's own opener, the fixed "View existing" button was re-tested and confirmed working, and a saved edit's row position was confirmed unchanged (F06-AC7). The human's own words: "all passed" / "great job, it works now and passed".

**Outcome:** Worked — all 11 tasks done, both components build-verify clean, and the human-performed keyboard walkthrough passed, including the out-of-band View-existing fix.

**Iteration:** One: F03's View-existing defect was found during F06-T11, fixed (two attempts — first attempt failed ESLint's empty-function rule, second was clean), and re-verified before the human confirmed the walkthrough passed.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-801

**SDLC activity:** build

**Task/feature:** F08-dark-mode — tasks T01–T04, the full `api` surface: `invalidThemeError()`, the `setting` repository, the `setting` service, and the `GET`/`PUT /api/settings/theme` routes mounted in `app.js`

**Context given to AI:** `lld.md` sections 3–5, 7, 8 (exact file list, statements, validation rule, error message); `tasks.md`'s per-task Done-when criteria; `data-model.md`'s already-existing `setting` table (AD-05, INV-11); existing `tag-repository.js`, `tags.js`, `app-error.js`, `app.js` as the pattern to follow

**Prompt/request:** Implement F08-T01 through F08-T04 in order, one task at a time, each ending with the build-verify loop

**AI response summary:** Added `INVALID_THEME: 400` to `STATUS_BY_CODE` and `invalidThemeError()` (mirroring `duplicateUrlError()`/`editConflictError()`); `setting-repository.js` with `get`/`upsert` prepared statements; `setting-service.js` with `getTheme()` (default-without-write) and `setTheme()` (allow-list validation before any repository call); `settings.js` router; mounted `settingRepository`/`settingService`/`createSettingsRouter` into `app.js` alongside the existing repositories/services

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx vitest run` per new/changed test file after each task (4, 4, 12, and the route tests passed), then the full suite: `npx vitest run` → 28 files, 472 tests passed, 0 failed (no regression). Started a fresh server (`node src/server.js`) and ran `Invoke-WebRequest` smoke checks: `GET /api/health` → 200, `GET /api/bookmarks` → 200, `GET /api/tags` → 200, `GET /api/settings/theme` → 200 `{"theme":"light"}`, `PUT /api/settings/theme {theme:"dark"}` → 200 `{"theme":"dark"}`, `PUT /api/settings/theme {theme:"blue"}` → 400 `{"error":{"code":"INVALID_THEME","message":"Theme must be \"light\" or \"dark\".","field":"theme"}}`. All observed bodies match `lld.md` section 4/7/8 exactly.

**Outcome:** worked

**Iteration:** none needed — all four tasks passed on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-802

**SDLC activity:** build

**Task/feature:** F08-dark-mode — tasks T05–T09, the full `web` surface: `Theme`/`ThemeResponse` types and `ApiService` methods, the `moon`/`sun` icons, `ThemeStore`, the inline pre-paint script, and the header toggle button

**Context given to AI:** `lld.md` sections 3, 6, 8, 10, 11 (file list, UI states, error handling, sequence diagram, test hooks); LD-01…LD-04's accepted decisions; `tasks.md`'s per-task Done-when criteria; existing `bookmarks.store.ts` (request-token idiom), `icons.ts` (single-`d`-string convention), `app.html`/`app.ts` (shell pattern), `docs/mockup.html` (exact CSS tokens and icon markup to port)

**Prompt/request:** Implement F08-T05 through F08-T09 in order, one task at a time, each ending with the build-verify loop

**AI response summary:** Added `Theme`/`ThemeResponse` to `models.ts` and `getTheme()`/`setTheme()` to `ApiService`; converted the mockup's `sun` `<circle>` into a two-arc path matching `search`'s precedent; built `ThemeStore` with `load()`/`toggle()`, a monotonic request-token guard, and a `try/catch`-wrapped `localStorage` mirror under the key `tagvault-theme`; added the inline pre-paint `<script>` to `index.html`'s `<head>` reading the same key; wired the header toggle into `app.html`/`app.ts` with a state-aware `aria-label`/`aria-pressed`. Flagged before `GO` that `lld.md` section 3 never lists `styles.css`, and that without porting the mockup's `[data-theme=dark]` token block and `.btn.sq` rule the toggle would be visually inert; folded that port into T09 with the human's prior acknowledgement.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** After each task: `npx prettier --write` / `npx eslint --fix` (0 errors each time), `npx ng build` (succeeded 5 times across T05–T09, 3–9s each). `theme.store.spec.ts` alone: `npx ng test --watch=false --include=src/app/state/theme.store.spec.ts` → 1 file, 5 passed (load() fallback on rejected GET, load() applying the server value, toggle()'s optimistic flip, the rapid-toggle race resolving to the last call, a throwing `localStorage` not crashing `toggle()`). Full suite after T09: `npx ng test --watch=false` → 13 files, 191 passed (186 prior + 5 new, no regression). Final consolidated loop across both components: api (`npx prettier --write .`, `npx eslint . --fix`, `npx vitest run`) → 28 files, 472 passed, 0 lint errors; web (`npx prettier --write .`, `npx eslint . --fix`, `npx ng test --watch=false`) → 58 files unchanged by prettier, 0 lint errors, 13 files/191 tests passed. Started `npm start` (api, port 3000) and `npx ng serve` (web, port 4200) and handed off to dev-1 for the manual keyboard/visual walkthrough; dev-1 confirmed "all passed".

**Outcome:** worked

**Iteration:** none needed — all five tasks passed on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-build-701

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T01–F07-T04 (api-side soft-delete/restore: `restoreDuplicateUrlError`, repository/service functions, and the two new routes)

**Context given to AI:** `lld.md` sections 3–5, 8–9 (the exact function signatures, SQL, error shapes and ordering); the existing `app-error.js`, `bookmark-repository.js`, `bookmark-service.js`, `routes/bookmarks.js` for the established patterns (catch-as-backstop, service-level `Number.isInteger` guard, route `Number()` coercion).

**Prompt/request:** Implement F07-T01 through F07-T04 per `tasks.md`, one task at a time, then run the build-verify loop.

**AI response summary:** Added `restoreDuplicateUrlError(existing)` to `app-error.js` as a second, dedicated 409 constructor (never shared with `duplicateUrlError()`). Added `softDelete`, `findDeletedById`, `restore` to `bookmark-repository.js` as three prepared statements (no new transaction), with `restore` catching `SQLITE_CONSTRAINT_UNIQUE` and throwing the restore-specific error. Added `softDelete(id)`/`restore(id)` to `bookmark-service.js`, each rejecting a non-integer `id` with `NOT_FOUND` before any repository call. Added `DELETE /bookmarks/:id` and `POST /bookmarks/:id/restore` to `routes/bookmarks.js`, grouped with the existing single-resource routes.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write .` and `npx eslint . --fix` (0 errors, no changes needed). `npx vitest run` — 28 files, 472 passed, 0 failed (full existing suite, no regression). Started `node src/server.js` (after discovering and killing a stale process from an earlier session that was still holding port 3000) and ran live `curl` checks: a fresh bookmark deleted (204), a second delete on the same id (404 `NOT_FOUND`), a restore (200 with the restored row), an invalid `:id` delete (404), a restore of a never-deleted id (404), and the duplicate-URL restore race — delete a row, re-add the same URL, then restore the original (409 `DUPLICATE_URL`, message `"That address has been saved again since. Nothing was restored."`, matching F07-AC7 exactly). Also ran the component-map smoke checks: `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` — all 200.

**Outcome:** worked

**Iteration:** none — all four tasks passed on the first attempt. One unplanned troubleshooting step: the first server start appeared to leave the old routes live (DELETE returned Express's own 404, "Cannot DELETE ...", rather than the new JSON NOT_FOUND body); a stale `node src/server.js` process from an earlier session was found still bound to port 3000 and was killed, then the server was restarted and the smoke checks above passed cleanly.

**Approx. time:** TODO(human)

**Learning:** When a smoke check returns an HTML "Cannot METHOD /path" 404 instead of the app's own JSON error body, that is Express's own router-miss page, not the app's error middleware — a strong signal the running process predates the edit, not that the route is missing from the code. Check `Get-NetTCPConnection`/`Get-CimInstance Win32_Process` for a stale listener on the port before assuming the new route is wrong.

### Evidence E-build-702

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T05–F07-T06 (api-side test coverage for `softDelete`/`restore`: `test/delete-bookmark.test.js`, `test/restore-bookmark.test.js`)

**Context given to AI:** `lld.md` sections 4–5, 8, 11 (the sync/async shape of each function, the exact error codes/messages, and the "write tests the way the route calls it" guidance); the existing `bookmark-service.js`/`bookmark-repository.js` under test; sibling test files (`edit-conflict.test.js`, `restart-integrity.test.js`) for the established `rejects.toMatchObject` pattern used elsewhere in the suite.

**Prompt/request:** Implement F07-T05 and F07-T06 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Wrote `delete-bookmark.test.js` (service + route specs for `softDelete`, covering a live delete, the already-deleted race, every invalid `:id` shape, and the live DELETE route) and `restore-bookmark.test.js` (service + route specs for `restore`, covering a successful restore, the duplicate-URL race, and every not-found shape). First `npx vitest run` showed 17 failing tests across both new files, each failure's stack trace showing the exact expected `AppError` being thrown at the exact line under test. Diagnosed this as a test-authoring bug, not a production bug: `bookmark-service.softDelete`/`restore` are plain synchronous functions (matching `list()`'s existing shape), but the new tests wrote `expect(service.softDelete(id)).rejects.toMatchObject(...)` — since the call throws synchronously while the argument to `expect()` is being evaluated, the exception propagates before `expect()`/`.rejects` ever runs, so it surfaced as the test's own uncaught exception rather than a matcher failure. Fixed every such assertion to use a `captureError(() => service.softDelete(id))` helper that catches the synchronous throw, then asserts `toMatchObject` on the captured error. Also fixed an unrelated bug in `delete-bookmark.test.js`'s `liveRows()` helper, which selected all rows instead of filtering `WHERE deleted_at IS NULL`.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write .` and `npx eslint . --fix` (0 errors on both attempts). `npx vitest run` — first attempt: 2 files failed, 17 of 503 tests failed; after the fix, second attempt: 30 files passed, 503 of 503 tests passed, 0 failed.

**Outcome:** worked (after one fix iteration)

**Iteration:** 1 of the allowed 3 fix attempts was used, then all tests passed.

**Approx. time:** TODO(human)

**Learning:** A `rejects.toMatchObject(...)` assertion can only be used when the function under test genuinely returns a Promise. For a function that throws synchronously (no internal `await`), `expect(fn())` already lets the exception escape while evaluating the argument, before `.rejects` can attach — the symptom looks identical to a production bug (the stack trace shows the exact expected error) but is actually a mismatch between the test's assumed calling convention and the function's real (synchronous) shape. Confirm a function's sync/async shape before choosing `.rejects` vs. a try/catch (or `captureError`) helper.

### Evidence E-build-703

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Task F07-T07 (web-side API contract: `RestoreBookmarkResponse` type, `ApiService.deleteBookmark(id)`/`restoreBookmark(id)`)

**Context given to AI:** `lld.md` sections 3–4 (the exact type/method signatures); the existing `models.ts`/`api.service.ts` for established conventions (`firstValueFrom`, relative URLs, JSDoc referencing the AC).

**Prompt/request:** Implement F07-T07 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Added `export type RestoreBookmarkResponse = CreateBookmarkResponse;` to `models.ts`. Added `deleteBookmark(id): Promise<void>` (DELETE, 204 success) and `restoreBookmark(id): Promise<RestoreBookmarkResponse>` (POST, parsed `{ bookmark }`) to `ApiService`. First `npx ng build` failed with `TS2552: Cannot find name 'RestoreBookmarkResponse'` — a missing import, fixed by adding it to the existing `./models` type import. Second build succeeded, but `npx ng test` then showed 18 failures, all in `search-box.spec.ts`, unrelated to the edited files' symbols. Traced to an already-present, unexplained change in the working tree: `models.ts`'s `DEFAULT_PAGE_SIZE` had been set to `10` (it should be `20` per F03-AC5, confirmed via `git diff` against the last commit) — reverted it back to `20`, which fixed all 18 failures with no further changes.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write` / `npx eslint --fix` on both files (unchanged, 0 errors). `npx ng build` — failed once (missing import), passed on the second attempt. `npx ng test --watch=false` — 13 files passed, 191 of 191 tests passed (after the `DEFAULT_PAGE_SIZE` revert; 18 failures beforehand, all in the unrelated `search-box.spec.ts`).

**Outcome:** worked (after one fix iteration)

**Iteration:** 1 of the allowed 3 fix attempts was used for the missing import; the `DEFAULT_PAGE_SIZE` revert was a separate, pre-existing issue discovered during this task's verification, not a fix attempt against F07-T07's own code.

**Approx. time:** TODO(human)

**Learning:** Always run `git diff` on files you did not believe you touched before trusting a test failure's apparent cause — `search-box.spec.ts`'s failures initially looked plausible as a caused-by-this-task regression, but `git diff` against the last commit immediately showed the real, unrelated change (`DEFAULT_PAGE_SIZE: 20 → 10`) that predated this task's edits.

### Evidence E-build-704

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T08–F07-T09 (`BookmarksStore`'s generalized `showToast`/`clearToast`/`toastUndo`, and the new `deleteBookmark(item)`/`restoreBookmark(id)` methods)

**Context given to AI:** `lld.md` sections 6, 8 (the toast's states and the exact success/failure handling for delete/restore); `spec.md` F07-AC3–AC9 (exact toast wording `Bookmark deleted`, the Undo contract, the silent-404 delete path, the restore 409/404 replace-text-remove-undo behavior); the existing `bookmarks.store.ts` `save()` method as the only prior `toast.set(...)` caller.

**Prompt/request:** Implement F07-T08 and F07-T09 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Added a private `showToast(message, onUndo?)`/`clearToast()` pair and a `toastUndo` signal to `BookmarksStore`; `showToast` always cancels any still-pending timer before starting a new 6-second one (LD-02), so two timers can never race to clear the same signal. Rewrote `save()`'s two existing `toast.set(...)` call sites (the initial clear and the success message) to use `clearToast()`/`showToast()`. Added `deleteBookmark(item)`, which calls `ApiService.deleteBookmark`, shows the `Bookmark deleted` toast with an Undo handler on success, silently swallows a 404 (the row vanished before the request landed), and always reloads the list. Added `restoreBookmark(id)`, which calls `ApiService.restoreBookmark`, clears the toast on success, and on failure replaces the toast's text with the server's own message (no Undo handler, so the Undo button disappears) — always reloading the list either way.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write` / `npx eslint --fix` on `bookmarks.store.ts` (unchanged, 0 errors). `npx ng build` — compiled successfully. `npx ng test --watch=false` — 13 files passed, 191 of 191 tests passed (no regression; dedicated specs for the new behavior are written in F07-T15, per the task plan).

**Outcome:** worked

**Iteration:** none — passed on the first attempt.

**Approx. time:** TODO(human)

**Learning:** None beyond what E-build-703 already recorded.

### Evidence E-build-705

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T10–F07-T14 (the `DeleteConfirm` dialog component, `BookmarkList`'s `deleteRequested` wiring, `Toast`'s Undo button, the app shell wiring, and the ported CSS)

**Context given to AI:** `lld.md` sections 2 (LD-01), 6, 8; `spec.md` F07-AC1, AC2, AC3, AC4, AC9, AC16; `docs/mockup.html`'s `#dd` dialog markup and its `.btn.bad`/`.prev`/`.toast button` CSS rules; the existing `BookmarkForm` component (`open()`/`openEdit()`, explicit-focus-not-autofocus, `(close)` handler restoring focus to the captured opener) as the pattern to mirror per LD-01's stated trade-off.

**Prompt/request:** Implement F07-T10 through F07-T14 per `tasks.md`, one at a time, each followed by the build-verify loop.

**AI response summary:** Created `DeleteConfirm` (`delete-confirm.ts`/`.html`): a native `<dialog>` with `showModal()`, mirroring `BookmarkForm`'s pattern — `open(item, opener)` captures the opener and the row, explicitly focuses the Cancel button, and a `confirming` signal disables the Delete button after the first click so a second activation can't double-fire; `onDialogClose()` (fired by both Esc and the Cancel button, since they share the native `close` event) restores focus to the opener. Confirm calls `store.deleteBookmark(item)`. Wired `BookmarkList`'s existing Delete button to a new `deleteRequested` output, mirroring `editRequested`. Added an `Undo` button to `Toast`, shown only while `store.toastUndo()` is non-null; a guard disables it after the first click. Wired `<app-delete-confirm>` into `app.ts`/`app.html`: a `deleteConfirm` `viewChild`, an `onDeleteRequested()` handler calling `.open(item, opener)`, mirroring the existing `onEditRequested()` → `openEdit()` pattern. Ported `.btn.bad`, `.prev`, and `.toast button` CSS rules from `docs/mockup.html` into `styles.css` unchanged.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Each task ran `npx prettier --write` / `npx eslint --fix` on its files, then `npx ng build` and `npx ng test --watch=false` — all five tasks: files unchanged by formatting, 0 lint errors, build compiled (the bundle grew once `app.ts` referenced `DeleteConfirm` in F07-T13, confirming it was previously tree-shaken as expected), 13 test files / 191 tests passed throughout with no regression. F07-T13 additionally started the server (`node src/server.js`) and confirmed `GET /` returned `200`.

**Outcome:** worked

**Iteration:** none — all five tasks passed on the first attempt.

**Approx. time:** TODO(human)

**Learning:** None beyond what prior F07 evidence already recorded.

### Evidence E-build-706

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Task F07-T15 (Vitest + `TestBed` specs covering the whole feature: `bookmarks.store.spec.ts`, the new `delete-confirm.spec.ts` and `toast.spec.ts`, and `bookmark-list.spec.ts`'s Delete wiring)

**Context given to AI:** `spec.md`'s F07-AC1–AC9, AC16; the LD-02 toast timer behavior; the already-passing `bookmark-form.spec.ts`/`search-box.spec.ts` as the patterns to mirror for native-`<dialog>` testing and `vi.useFakeTimers()` debounce/timer testing respectively; `tasks.md`'s stale placeholder test (`'the Delete button is not wired to any behavior yet (F07)'`) that needed replacing now that F07-T11 wired it.

**Prompt/request:** Implement F07-T15 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Added a `BookmarksStore — delete/restore (F07)` describe block covering: `deleteBookmark`'s success (toast + undo handler set) and silent-404 paths; `restoreBookmark`'s success (toast cleared) and failure (toast text replaced, undo removed) paths; and the LD-02 timer (auto-clears at exactly 6,000ms, and a second toast cancels the first's still-pending timer). Created `delete-confirm.spec.ts`, mirroring `bookmark-form.spec.ts`'s native-`<dialog>` approach: `open()` focuses Cancel and names the row, Cancel/Esc both restore focus to the opener, Confirm disables the Delete button and calls `store.deleteBookmark(item)` exactly once even under a double-click. Created `toast.spec.ts`: no Undo button without a handler, a real `<button>` when one is set, click invokes it and disables the button, a second click before the toast changes is a no-op, and a fresh toast (new handler) re-enables it. Replaced `bookmark-list.spec.ts`'s now-stale "not wired yet" placeholder with an assertion that clicking Delete emits `deleteRequested` with the row and the clicked element.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write` / `npx eslint --fix` on all four spec files plus `toast.ts` — found and fixed 3 `@typescript-eslint/no-empty-function` errors in `toast.spec.ts` (empty `() => {}` mocks, replaced with `() => undefined`). First `npx ng test --watch=false` run: 6 of the new delete/restore store tests failed with "Expected one matching request... found none" for the post-action list-reload GET — traced to `deleteBookmark`/`restoreBookmark` firing their reload via an un-awaited `void this.loadList()` inside `finally`, so the GET is only dispatched once the outer `await pending` lets that microtask run; the tests had been flushing it too early. Reordered every affected test to flush the DELETE/POST, then `await pending`, then flush the reload GET (extracted as a small `flushListReload()` helper). Second run: `npx ng build` compiled; `npx ng test --watch=false` — 15 files passed, 207 of 207 tests passed. A final `npx eslint . --fix` across the whole web project reported 0 errors.

**Outcome:** worked

**Iteration:** 1 fix attempt (of the max 3) — the request-ordering bug above, resolved.

**Approx. time:** TODO(human)

**Learning:** When a store method fires a side-effect request via `void somePromise()` inside a `finally` (fire-and-forget, not awaited by the caller), that request is only dispatched once a microtask runs *after* the outer call's own promise is awaited — `HttpTestingController.expectOne()` for it must come after `await pending`, not before, or it fails with "found none" even though the code is correct.

## Local Run Evidence

Commands resolved from `specs/architecture/component-map.json` v1. Everything below is observed output.

**Install and build**

```
cd app/api  && npm install      → added 192 packages, found 0 vulnerabilities
                                  better-sqlite3 13.0.3 resolved a PREBUILT binary
                                  (no node-gyp, no toolchain) — RK06 CLOSED
cd app/web  && npx ng build     → exit 0, output → app/api/public
```

**Start (single process, production assembly)**

```
cd app/api && node src/server.js
→ [api] TagVault API listening on http://localhost:3000
```

**Smoke check — observed status codes**

| Request | Observed |
|---|---|
| `GET /` | **200** (SPA document) |
| `GET /api/health` | **200** `{"status":"ok"}` |
| `GET /api/bookmarks` | **200** `{"items":[…3 rows…],"total":3}` |
| `GET /api/tags` | **200** `[]` |

Response headers on the SPA document: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'` — matching HLD §8 verbatim — and **no** `x-powered-by`.

**Automated checks**

| Component | Command | Observed |
|---|---|---|
| api | `npx prettier --check .` | `All matched files use Prettier code style!` |
| api | `npx eslint .` | exit 0 |
| api | `npx vitest run` | **Test Files 9 passed (9), Tests 266 passed (266)**, exit 0 |
| api | `npx vitest run --coverage` | **95.21% stmts, 86.61% branch, 98.02% lines** over `src/services` + `src/lib` (Q4 target: 80%) |
| web | `npx prettier --check src/**` | `All matched files use Prettier code style!` |
| web | `npx ng test --no-watch` | **Test Files 3 passed (3), Tests 49 passed (49)**, exit 0 |
| web | `npx ng build` | exit 0 |

**F01-AC15 — the restart check, executed**

Three synthetic bookmarks were saved (`example.com/alpha` with a user title, `example.org/beta` with no title, `example.net/gamma` titled `<script>alert(1)</script>`). The process was stopped and **confirmed down** (`/api/health` returned nothing), then started again and the list re-fetched.

```
AC15 byte-identical: True

id  url                        title                      title_source  created_at
 3  https://example.net/gamma  <script>alert(1)</script>  user          2026-09-30T20:51:09.102Z
 2  https://example.org/beta   example.org                hostname      2026-09-30T20:51:09.049Z
 1  https://example.com/alpha  Alpha note                 user          2026-09-30T20:51:08.937Z
```

The `title_source: "hostname"` row is incidental but useful: the title fetch for `example.org` genuinely failed and fell back to the domain, which is the F01-AC5 path occurring naturally rather than being stubbed.

**Security check.** `innerHTML|bypassSecurityTrust|outerHTML|insertAdjacentHTML` across `app/web/src` returned **one match, and it is a comment** explaining that `[innerHTML]` is deliberately not used. Zero bindings.

**Not verified — outstanding.** No screenshots were captured, and `docs/assets/` holds none for F01. The F01-AC17 keyboard walkthrough (`Enter` opens, focus lands inside, `Tab` cycles without escaping, `Esc` closes and restores focus) and the F01-AC16 *rendered* confirmation were not performed before the gate was approved. Both carry to `/test-phase F01-add-bookmark`.

### F03 List Bookmarks

**Automated checks**

| Component | Command | Observed |
|---|---|---|
| api | `npx vitest run` | **Test Files 14 passed (14), Tests 309 passed (309)**, exit 0 |
| web | `npx ng test --watch=false` | **Test Files 6 passed (6), Tests 84 passed (84)**, exit 0 |
| web | `npx ng build` | exit 0, bundle styles 6.31kB |

**Smoke check — observed status codes (fresh database)**

| Request | Observed |
|---|---|
| `GET /` | **200** (SPA document) |
| `GET /api/health` | **200** `{"status":"ok"}` |
| `GET /api/bookmarks` | **200** |
| `GET /api/tags` | **200** |

**F03-AC7 — the restart spot check, executed**

15 synthetic bookmarks (`https://example.com/item-1`…`15`) were saved. `GET /api/bookmarks?page=1&size=10` and `?page=2&size=10` were captured (`total=15` both pages), the process was stopped, started again against the same database file, and both pages re-fetched.

```
AC7 restart check: items and total identical on both pages, before and after restart
```

**F03-AC9 — the keyboard walkthrough, human-performed**

22 synthetic bookmarks (`https://example.com/post-1`…`22`) were seeded and the app started at `http://localhost:3000`. dev-1 tabbed through the running page and confirmed: focus reaches the header *Add bookmark*, then each card's *Edit* then *Delete* in visual order, then the page-size select, then Previous/Next, each with a visible focus indicator; the page-size select carries an associated label; the current page is conveyed as text. Reported: "Everything is working as expected." No screenshot was supplied.

### F02 Tag Bookmarks

**Automated checks**

| Component | Command | Observed |
|---|---|---|
| api | `npx vitest run` | **Test Files 19 passed (19), Tests 360 passed (360)**, exit 0 |
| web | `npx ng test --watch=false` | **Test Files 8 passed (8), Tests 116 passed (116)**, exit 0 |
| web | `npx ng build` | exit 0, bundle styles grew 6.31kB → 6.63kB |

**Smoke check — observed status codes**

| Request | Observed |
|---|---|
| `GET /` | **200** (SPA document) |
| `GET /api/health` | **200** `{"status":"ok"}` |
| `GET /api/bookmarks` | **200** |
| `GET /api/tags?prefix=` | **200** `[]` (fresh database) |

**F02-AC1/AC11 — end-to-end tag round-trip, executed**

A bookmark was saved via `Invoke-RestMethod -Method Post` with `tags:["Research","docs"]` (curl.exe on this machine mis-sent the request body — a local tooling quirk, not reproduced through PowerShell's native client, and not a product defect). `GET /api/bookmarks` then returned:

```
tags: ["docs","research"]
```

— normalized, deduped and alphabetical, confirming the full write path (route → service → repository → `bookmark_tag` links). `GET /api/tags?prefix=d` returned `["docs"]`.

**F02-AC10/AC12/AC13 — the keyboard walkthrough, human-performed**

dev-1 exercised the Add-bookmark dialog's tag input against the running app and reported: the saved bookmark's card shows both tag chips ("Yes exist"); Enter/comma commits a chip and clears the input ("worked"); `Tab` reaches each chip's remove button then the tag input in visual order with a visible focus outline ("Worked"); Backspace on an empty input removes the last chip and keeps focus in the input ("Worked"); each chip's remove button exposes `Remove tag <name>` ("Worked"); typing a partial tag shows the suggestion list ("Yes the suggestion list do appear"), with one cosmetic complaint: "the drop down look and feed is very bad" (native `<datalist>` styling — not a code defect; see Troubleshooting #10). No screenshot was supplied.

### F05 Search

**Automated checks**

| Component | Command | Observed |
|---|---|---|
| api | `npx vitest run` | **Test Files 25 passed (25), Tests 452 passed (452)**, exit 0 |
| web | `npx ng test --watch=false` | **Test Files 12 passed (12), Tests 186 passed (186)**, exit 0 |
| web | `npx ng build` | exit 0, bundle `styles-7QAVGTJO.css` |

**Smoke check — observed status codes (live `npm start` server, synthetic data)**

| Request | Observed |
|---|---|
| `GET /api/bookmarks?page=1&size=20` | **200**, `total: 4` (unfiltered) |
| `GET /api/bookmarks?page=1&size=20&q=youtube` | **200**, `total: 1` (filtered, the "Youtube" bookmark only) |

**F05-T14 — the manual keyboard walkthrough, human-performed**

dev-1 walked through the search box against the live running app and first reported two defects instead of a pass: (1) "The search performs after debounce time but it is not filtering the list with the search URL or title. basically it does not filter and instead show all items." and (2) "also on the search when we type something i can see two (x) buttons and on clicking on either clears the text. there should be only one (x) button". Both were diagnosed and fixed (see Troubleshooting #15/#16); after the second CSS fix, dev-1 re-performed the walkthrough and confirmed: "Great job, its fixed now."

**Not verified — outstanding.** No screenshot was supplied for `docs/assets/Screenshots/` — dev-1 said they will add one later. The actual NFR-01 median/max timing numbers for `GET /api/bookmarks?q=` (F05-T04's test exists and passes its in-build threshold, but the numbers themselves were explicitly deferred) carry to `/test-phase F05-search`.

### F07 Delete Bookmark

**Automated checks**

| Component | Command | Observed |
|---|---|---|
| api | `npx vitest run` | **Test Files 30 passed (30), Tests 503 passed (503)**, exit 0 |
| web | `npx ng test --watch=false` | **Test Files 15 passed (15), Tests 207 passed (207)**, exit 0 |
| web | `npx ng build` | exit 0 |
| web | `npx eslint . --fix` (whole project) | exit 0 |

**Smoke check — observed status codes (live `node src/server.js` server)**

| Request | Observed |
|---|---|
| `GET /` | **200** (SPA document) |
| `DELETE /api/bookmarks/:id` (live row) | **204** |
| `DELETE /api/bookmarks/:id` (already deleted) | **404** `NOT_FOUND` |
| `POST /api/bookmarks/:id/restore` (deleted row) | **200** `{bookmark}` |
| `POST /api/bookmarks/:id/restore` (invalid `:id`) | **404** |
| `POST /api/bookmarks/:id/restore` (409 race — URL re-added before restoring) | **409** `DUPLICATE_URL` |

**F07 — the manual delete/undo walkthrough, human-performed**

dev-1 exercised the full flow against the live running app (delete confirmation dialog, focus on Cancel, Esc/Cancel returning focus, Confirm, the `Bookmark deleted` toast with Undo, the 6-second auto-clear) and reported: "all passed". No screenshot was supplied for `docs/assets/Screenshots/` yet — dev-1 said they will capture one later.

<!-- Completion checklist (checked by /status and /sync-check; remove when all pass):
- [x] 6 mandatory ## headings, exact and in order.
- [ ] Every matrix row has a verified status. At least 2 real troubleshooting entries, or an honest note.
      Troubleshooting: PASS (10 entries: 5 for F01, 3 for F02, 2 for F03). Matrix: NOT YET — 5 of 11 rows are
      Not started (F04–F08 unbuilt). F01's 4 rows, F02's 1 row (Tags) and F03's 1 row (List/Newest First) carry
      build-verified evidence; F01-AC16/AC17 and F03's NFR-01/Test Matrix still carry to /test-phase as unverified.
- [x] At least 5 complete E-build records across different features.
      13 records exist (E-build-101…105 for F01, E-build-201…204 for F02, E-build-303…306 for F03). The 5 F01
      records are all complete. All 4 F02 records are complete except a one-line Learning on E-build-203.
      Of the 4 F03 records, 3 are complete except a one-line Learning and 1 is complete except Approx. time —
      left as TODO(human) rather than invented.
      Approx. time, and Learning on 2026-10-01.
-->
