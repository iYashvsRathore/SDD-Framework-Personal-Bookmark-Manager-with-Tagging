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
