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
