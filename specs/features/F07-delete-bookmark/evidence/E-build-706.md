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
