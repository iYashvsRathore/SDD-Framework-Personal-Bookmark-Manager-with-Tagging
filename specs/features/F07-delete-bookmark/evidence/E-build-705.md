### Evidence E-build-705

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T10–F07-T14 (the `DeleteConfirm` dialog component, `BookmarkList`'s `deleteRequested` wiring, `Toast`'s Undo button, the app shell wiring, and the ported CSS)

**Context given to AI:** `lld.md` sections 2 (LD-01), 6, 8; `spec.md` F07-AC1, AC2, AC3, AC4, AC9, AC16; `docs/mockup.html`'s `#dd` dialog markup and its `.btn.bad`/`.prev`/`.toast button` CSS rules; the existing `BookmarkForm` component (`open()`/`openEdit()`, explicit-focus-not-autofocus, `(close)` handler restoring focus to the captured opener) as the pattern to mirror per LD-01's stated trade-off.

**Prompt/request:** Implement F07-T10 through F07-T14 per `tasks.md`, one at a time, each followed by the build-verify loop.

**AI response summary:** Created `DeleteConfirm` (`delete-confirm.ts`/`.html`): a native `<dialog>` with `showModal()`, mirroring `BookmarkForm`'s pattern — `open(item, opener)` captures the opener and the row, explicitly focuses the Cancel button, and a `confirming` signal disables the Delete button after the first click so a second activation can't double-fire; `onDialogClose()` (fired by both Esc and the Cancel button, since they share the native `close` event) restores focus to the opener. Confirm calls `store.deleteBookmark(item)`. Wired `BookmarkList`'s existing Delete button to a new `deleteRequested` output, mirroring `editRequested`. Added an `Undo` button to `Toast`, shown only while `store.toastUndo()` is non-null; an `undoing` signal disables it after the first click, reset by an `effect()` whenever the toast's undo handler changes (a new toast means a fresh button). Wired `<app-delete-confirm>` into `app.ts`/`app.html`: a `deleteConfirm` `viewChild`, an `onDeleteRequested()` handler calling `.open(item, opener)`, mirroring the existing `onEditRequested()` → `openEdit()` pattern. Ported `.btn.bad`, `.prev`, and `.toast button` CSS rules from `docs/mockup.html` into `styles.css` unchanged.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Each task ran `npx prettier --write` / `npx eslint --fix` on its files, then `npx ng build` and `npx ng test --watch=false` — all five tasks: files unchanged by formatting, 0 lint errors, build compiled (the bundle grew once `app.ts` referenced `DeleteConfirm` in F07-T13, confirming it was previously tree-shaken as expected), 13 test files / 191 tests passed throughout with no regression. F07-T13 additionally started the server (`node src/server.js`) and confirmed `GET /` returned `200`.

**Outcome:** worked

**Iteration:** none — all five tasks passed on the first attempt.

**Approx. time:** TODO(human)

**Learning:** None beyond what prior F07 evidence already recorded.
