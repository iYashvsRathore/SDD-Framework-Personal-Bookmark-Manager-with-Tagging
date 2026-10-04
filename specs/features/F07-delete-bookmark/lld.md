# F07: Delete Bookmark (Low-Level Design)

**Feature ID:** F07-delete-bookmark
**Status:** approved — LD-01…LD-04 accepted by dev-1 ("Go with all recommendations") 2026-10-01
**Spec version:** 1, approved 2026-10-01
**HLD version:** 2
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F07 code exists yet. Every "the code will…" statement is an instruction to `/build-feature`; every expected outcome is checked for the first time in `/test-phase F07-delete-bookmark`.

## 1. Design Overview

F07 adds the soft-delete/restore sequence `hld.md` §6.4 already specifies, plus the confirmation dialog and undo toast `spec.md` U4 requires. On the `api` side this is two new service functions (`softDelete`, `restore`) and three new repository functions (`softDelete`, `findDeletedById`, `restore`) behind two new routes (`DELETE /api/bookmarks/:id`, `POST /api/bookmarks/:id/restore`) — no new table, column, or index, since `data-model.md` v3's `deleted_at` column and partial unique index (`ux_bookmark_url_live`) already exist for exactly this purpose.

On the `web` side, F07 adds one new dialog component (`features/delete-confirm/`), wires the already-rendered-but-unhandled Delete button on each card (F03 built it, unwired, by design), and generalizes `BookmarksStore`'s toast into a reusable `showToast(message, onUndo?)` with a 6-second auto-dismiss timer — which is also how F07-RK1 (the shared `Toast` component has no auto-dismiss at all today) and F07-RK2 (C-F07-05: every toast, not only this one, gets the 6-second behavior) are both resolved in one place, per the spec's own direction.

**A note on `hld.md`'s own two descriptions of the restore-race message.** §8's rolled-up error table gives `DUPLICATE_URL` one generic sentence ("You already saved this address.") and lists "the restore race in 6.4" as one of three cases that produce it. §6.4's own sequence diagram, for that exact case, already specifies a different, more specific sentence: *"That address has been saved again since. Nothing was restored."* — which is also the literal text `spec.md` F07-AC7 requires. This is not a disagreement needing an AMD: §8 is a summary row naming which codes exist, not a claim that every flow producing a code shares identical wording (the existing `duplicateUrlError()` function already varies its `details` payload per caller, e.g., F06's edit flow adds `tags`/`updatedAt`). §4 and §9 below follow §6.4 and `spec.md` exactly, using a second, restore-specific message constructor so the two call sites can never drift onto each other's wording by accident.

**Out of scope, unchanged from `spec.md` §5:** the Delete/Edit buttons' own rendering (F03, shipped); the tag rail's re-render and active-filter fallback once a tag's count reaches zero (F04-AC10 — F07 only has to produce the triggering zero-live-bookmark condition, and it does so automatically, because the post-delete list reload already calls the existing `refreshTagRail()`); the empty-state rendering (F03-AC2, same automatic reuse); edit-side concurrency (F06); hard delete or a purge/empty-trash feature (C-F07-04).

## 2. Alternatives Considered

All four decisions were presented to dev-1 as option tables on 2026-10-01; dev-1 replied "Go with all recommendations."

### LD-01 Delete confirmation dialog: new component or inline in the list?

| Option | Pros | Cons |
|---|---|---|
| **A: A new `features/delete-confirm/` component, a native `<dialog>` + `showModal()`, mirroring `BookmarkForm`'s `open()` pattern exactly** | Matches the project's established one-dialog-per-feature-folder convention (`bookmark-form`, now `delete-confirm`); keeps `BookmarkList` focused on rendering; focus trap, `Esc`, and focus-return all come from the platform, exactly as F01's and F06's dialogs already rely on | One more small component file |
| B: Embed the `<dialog>` markup and its state directly inside `BookmarkList` | Fewer files | Mixes list-rendering concerns with a second, unrelated modal's state and markup; breaks the per-dialog-component pattern this codebase already established twice, for no stated benefit |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off:** one more component file, accepted because it keeps `BookmarkList` as a pure rendering surface and reuses a pattern (`showModal()`, focus-restore-to-opener) already proven correct by F01 and F06, rather than inventing a second shape for the same problem.
**Challenge applied:** *at 1,000 records?* Unaffected — one dialog instance regardless of list size. *On restart?* N/A, client-only state. *Keyboard-only?* This is exactly what F07-AC16's dialog half is written against — a real `<dialog>` gives the focus trap and `Esc` handling for free, the same guarantee F01-AC17 and F06 already rely on.

### LD-02 Where the 6-second toast auto-dismiss and Undo wiring live

| Option | Pros | Cons |
|---|---|---|
| **A: Centralize in `BookmarksStore` — a private `showToast(message, onUndo?)` that cancels any pending timer, sets `toast`/`toastUndo`, and starts a 6 s `setTimeout`; `Toast` only renders `store.toast()` and, when set, `store.toastUndo()`'s button** | The timer is testable with `vi.useFakeTimers()` at the store level — the same place every other store behavior in this codebase is already tested, no `TestBed` render needed; `Toast` stays a thin template, unchanged in shape | `BookmarksStore` takes on one more small responsibility |
| B: Keep `toast` a plain string signal; add the timer and the Undo click handler inside the `Toast` **component** via an effect | The store's signal shape does not change | `save()`'s three existing `toast.set(...)` call sites (the save confirmation, the edit confirmation, and the title-fallback notice) still have to be rewritten to go through whatever triggers the timer — the refactor cost is identical either way, but the result is untestable without rendering a component |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off:** none beyond the store's slightly larger surface, accepted because it keeps the auto-dismiss timing unit-testable without a DOM render, and because it is the one place that can satisfy C-F07-05 (every toast, not only this feature's own) without touching three separate call sites' individual timing logic.
**Challenge applied:** *at 1,000 records?* Unaffected — one timer, one toast at a time, by construction (a new `showToast()` call always cancels the previous timer first, so a flurry of saves or deletes can never stack overlapping timers). *On restart?* N/A, in-memory UI state; `spec.md` §5 already documents that the undo window itself does not survive a restart. *Keyboard-only?* F07-AC16's toast half is written against exactly this shape — a native `<button>` for Undo, reachable by `Tab`, operable by `Enter`/`Space`, inside the existing `aria-live="polite"` region.

### LD-03 Restore's duplicate-URL race check (F07-AC7)

| Option | Pros | Cons |
|---|---|---|
| **A: No pre-check. Attempt the restore `UPDATE` directly; `ux_bookmark_url_live` throws `SQLITE_CONSTRAINT_UNIQUE` if a live row now shares the URL; catch it and build the restore-specific 409 from a lookup — the same catch-as-backstop shape `insert()`/`update()` already use** | One fewer query than a pre-check-then-write shape; restore has no expensive intervening step (no title fetch, unlike create/update) that a pre-check would usefully protect | Diverges slightly from insert/update's "pre-check, then write, then catch as backstop" shape — here there is no pre-check, only the catch |
| B: Mirror insert/update exactly: `findLiveByNormalized()` first, then attempt the `UPDATE`, then still catch as a backstop | Identical shape across all three write paths | The pre-check is pure overhead here (P4) — there is nothing between the check and the write for it to protect against; the catch alone is both necessary and sufficient, since the unique index is the actual source of truth |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off:** one fewer defence layer than insert/update's belt-and-suspenders shape, accepted because restore's race window is identical in kind (a concurrent write between a read and a write) but has no expensive step to protect, so the extra pre-check in option B would add a query that changes no outcome.
**Challenge applied:** *at 1,000 records?* Unaffected — the unique index makes this an O(log n) lookup either way. *On restart?* N/A — the race is between two in-flight requests, not across a restart. *Keyboard-only?* N/A — this is a server-side race, not a UI interaction; F07-AC16 does not touch this path.

### LD-04 Wiring the dialog to "which bookmark"

| Option | Pros | Cons |
|---|---|---|
| **A: `BookmarkList` emits a `deleteRequested` output (`{ item, opener }`); `app.ts` calls `deleteConfirm().open(item, opener)` — identical shape to F06's already-shipped `editRequested` → `openEdit()`** | Zero new shared store signal; the pending bookmark lives only inside `DeleteConfirm`, exactly where it is needed; reuses an established, already-reviewed pattern rather than inventing a second one | None of note |
| B: A shared `store.pendingDelete` signal, mirroring `store.editing` | Centralizes in the store the same way `editing` already does | Nothing else in the application needs to read "which row is pending delete" — promoting it to shared state has no second consumer to justify it (P4) |

**Decision:** A (dev-1, 2026-10-01, "Go with all recommendations").
**Trade-off:** none of note — this is the same shape F06 already shipped for the conceptually identical "which row, which opener" problem.
**Challenge applied:** *at 1,000 records?* Unaffected — the event carries only the one row the user clicked. *On restart?* N/A, client-only wiring. *Keyboard-only?* The `opener` element is what focus returns to on Cancel/Esc (F07-AC2) — carrying it explicitly, rather than guessing from `document.activeElement` at an arbitrary later time, is what makes that focus-return reliable.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web` (both `workspaceRoot: "."`).

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/lib/app-error.js` (changed) | Adds `restoreDuplicateUrlError(existing)` — the ONE place the restore-specific 409 message is constructed (LD-03, F07-AC7), kept separate from `duplicateUrlError()` so the two wordings can never drift onto each other |
| `api` | `app/api` | `src/data/bookmark-repository.js` (changed) | Adds `softDelete(id, deletedAt)`, `findDeletedById(id)`, `restore(id, urlNormalized)` — three prepared statements, no new transaction (each is one `UPDATE`/`SELECT`, so nothing else needs rolling back alongside it) |
| `api` | `app/api` | `src/services/bookmark-service.js` (changed) | Adds `softDelete(id)` and `restore(id)` — the layer Q4 is measured on. Both reject a non-integer `id` before any repository call (F07-AC10) |
| `api` | `app/api` | `src/routes/bookmarks.js` (changed) | Adds `DELETE /bookmarks/:id` and `POST /bookmarks/:id/restore`, grouped with the existing single-resource routes (`POST /bookmarks`, `PUT /bookmarks/:id`), both before the list routes for readability — no ordering constraint applies, since Express matches by method as well as path and neither new route's shape can collide with `GET /bookmarks/count` |
| `api` | `app/api` | `test/delete-bookmark.test.js` (new) | Vitest specs for `softDelete` — F07-AC3, AC6, AC9, AC10, AC14 |
| `api` | `app/api` | `test/restore-bookmark.test.js` (new) | Vitest specs for `restore` — F07-AC4, AC7, AC8, AC10, AC15 |
| `web` | `app/web` | `src/app/core/models.ts` (changed) | Adds `export type RestoreBookmarkResponse = CreateBookmarkResponse;` — restore's success shape is identical to create/update's, named distinctly only so call sites read clearly |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | Adds `deleteBookmark(id): Promise<void>` and `restoreBookmark(id): Promise<RestoreBookmarkResponse>` |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (changed) | Adds a private `showToast(message, onUndo?)` / `clearToast()` pair (LD-02) that `save()`'s three existing `toast.set(...)` call sites are rewritten to use; adds `toastUndo` signal; adds `deleteBookmark(item)` and `restoreBookmark(id)` |
| `web` | `app/web` | `src/app/features/delete-confirm/delete-confirm.ts`, `delete-confirm.html` (new) | The confirmation dialog (F07-AC1, AC2, AC16), ported from `docs/mockup.html`'s `#dd` dialog |
| `web` | `app/web` | `src/app/features/bookmark-list/bookmark-list.ts`, `bookmark-list.html` (changed) | Wires the already-rendered Delete button to a new `deleteRequested` output (LD-04), mirroring the existing `editRequested` wiring exactly |
| `web` | `app/web` | `src/app/features/toast/toast.ts`, `toast.html` (changed) | Renders an `Undo` button when `store.toastUndo()` is set (F07-AC4, AC16) |
| `web` | `app/web` | `src/app/app.ts`, `src/app/app.html` (changed) | Adds `<app-delete-confirm>` and an `onDeleteRequested` handler, mirroring the existing `onEditClick` → `openEdit()` wiring |
| `web` | `app/web` | `src/styles.css` (changed) | Ports `.btn.bad` and `.prev` from `docs/mockup.html` (the dialog's Delete button and the title/URL preview block); adds a rule for `.toast button` (the Undo button), also ported from the mockup |
| `web` | `app/web` | `src/app/state/bookmarks.store.spec.ts`, `src/app/features/delete-confirm/delete-confirm.spec.ts` (new), `src/app/features/bookmark-list/bookmark-list.spec.ts`, `src/app/features/toast/toast.spec.ts` (new) (changed/new) | Vitest + `TestBed` specs — see §11 |

## 4. API / Interface Contract

Error bodies use the shape fixed in `hld.md` §8 (unchanged by F07).

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `DELETE` | `/api/bookmarks/:id` | `:id` — accepted as a raw route-parameter string, coerced with `Number()` in the route, same as the existing `PUT` route | **204**, no body. `deleted_at` is set on the row (F07-AC3) | `404 { error: { code: 'NOT_FOUND', message: 'That bookmark is no longer here.' } }` — already deleted, never existed, or `:id` is not a positive integer (F07-AC6, AC9, AC10) |
| `POST` | `/api/bookmarks/:id/restore` | `:id`, same coercion | **200** `{ bookmark }` — `deleted_at` cleared; tags and `created_at` unchanged (F07-AC4) | `404 { error: { code: 'NOT_FOUND', message: 'That bookmark is no longer here.' } }` — the row is live, already restored, never existed, or `:id` is invalid (F07-AC8, AC10). `409 { error: { code: 'DUPLICATE_URL', message: 'That address has been saved again since. Nothing was restored.', field: 'url', existingId } }` — another live row now shares the URL (F07-AC7, LD-03) |
| function | `bookmark-service.softDelete(id)` | the route's coerced `id` | sets `deleted_at`, returns nothing | throws `AppError('NOT_FOUND', …)` on a non-integer `id` or on 0 rows changed |
| function | `bookmark-service.restore(id)` | the route's coerced `id` | the restored row (no `tags` attached — see §5) | throws `AppError('NOT_FOUND', …)` on a non-integer `id` or when the row is not currently soft-deleted; throws the restore-specific `AppError('DUPLICATE_URL', …)` on the race |
| function | `bookmark-repository.softDelete(id, deletedAt)` → `number` | an id and a captured ISO-8601 timestamp | rows changed (0 or 1) | never throws |
| function | `bookmark-repository.findDeletedById(id)` → `object \| null` | an id | `{ id, url, title, url_normalized }` or `null` | never throws |
| function | `bookmark-repository.restore(id, urlNormalized)` → `object` | an id and its own `url_normalized` (already read by the service) | the restored row, `SELECT_COLUMNS` shape | throws `NOT_FOUND` (0-row race) or the restore-specific `DUPLICATE_URL` |
| method | `ApiService.deleteBookmark(id)` → `Promise<void>` | the row's id | resolves on `204` | rejects with the `HttpErrorResponse`, mapped by the existing `api-error.ts` |
| method | `ApiService.restoreBookmark(id)` → `Promise<RestoreBookmarkResponse>` | the row's id | the parsed `{ bookmark }` body | rejects, same mapping |

**Every acceptance criterion is reachable from this table or from §6:** AC1/AC2/AC16 via §6's dialog states; AC3/AC4/AC5 via the success rows and §6's toast; AC6/AC8/AC9/AC10 via the error rows; AC7 via restore's `DUPLICATE_URL` row; AC11/AC12/AC13 via §8 (the existing `loadList()`/`refreshTagRail()` reuse); AC14/AC15 via §11's restart-check note.

## 5. Data Access

**No entity, field, index, or invariant is added, changed, or removed.** Every table, column and index F07 touches already exists in `data-model.md` v3.

| Entity | F07 use |
|---|---|
| `bookmark` | Write — `deleted_at` is set (`softDelete`) or cleared (`restore`); every other column is read-only in both paths |
| `tag` | Not touched — a soft delete is an `UPDATE`, not a `DELETE`, so the `ON DELETE CASCADE` on `bookmark_tag` never fires (INV-09) |
| `bookmark_tag` | Not touched, for the same reason — links survive the round trip through delete and restore untouched |
| `setting` | Not used |

**Indexes used:**

- `ux_bookmark_url_live (url_normalized) WHERE deleted_at IS NULL` — the partial unique index is exactly what makes `restore`'s `UPDATE` fail with `SQLITE_CONSTRAINT_UNIQUE` when a live row already holds the URL (F07-AC7, LD-03). The same index is also what makes `softDelete` safe to call twice: once `deleted_at` is set, the row drops out of the index's `WHERE` clause, so re-adding the same URL afterward (a separate, legitimate new bookmark) is never blocked by the just-deleted row.
- `ix_bookmark_list (deleted_at, created_at DESC, id DESC)` — not queried directly by F07, but it is what makes the post-delete `loadList()` call (§8) correctly omit the now-deleted row and correctly include a just-restored one, at its original position, with no extra work from this feature.

**Queries** — prepared statements only (S4); no value is ever concatenated into SQL.

| Function | Statement (described) |
|---|---|
| `softDelete(id, deletedAt)` | `UPDATE bookmark SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL` — both values bound. `WHERE … AND deleted_at IS NULL` is what makes a second call against the same id return 0 changes rather than erroring (F07-AC6, AC9) |
| `findDeletedById(id)` | `SELECT id, url, title, url_normalized FROM bookmark WHERE id = ? AND deleted_at IS NOT NULL` — a distinct, narrower column list than the shared `SELECT_COLUMNS` constant, since this call's only purpose is the AC8 existence check and, on success, handing `url_normalized` to `restore()` |
| `restore(id, urlNormalized)` | `UPDATE bookmark SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL` — bound `id` only; `urlNormalized` is never part of this statement's own SQL, it is used only in the catch branch's `findLiveByNormalized(urlNormalized)` lookup, reusing the function `bookmark-repository.js` already exports |

**Service orchestration:**

- `softDelete(id)`: reject a non-integer `id` immediately (see §9) → `repository.softDelete(id, timestamp())` → 0 rows changed throws `NOT_FOUND`.
- `restore(id)`: reject a non-integer `id` immediately → `repository.findDeletedById(id)` → `null` throws `NOT_FOUND` (F07-AC8) → `repository.restore(id, row.url_normalized)`, which itself throws `NOT_FOUND` (race) or the restore-specific `DUPLICATE_URL` (F07-AC7).

Restore's response **does not** attach a `tags` array, unlike `insert()`/`update()`. This is a deliberate asymmetry: the client reloads the full list immediately after a successful restore (`loadList()`, the same pattern `save()` already uses after create/edit), so a second tag-lookup query here would compute a value that is about to be replaced on the next render anyway (P4).

## 6. UI Changes and States

Ported from `docs/mockup.html` (U6): the `#dd` dialog's title, body copy, and button layout (`.prev` block, `.btn.bad` Delete button); the toast's Undo button styling (`.toast button`).

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Delete confirmation dialog** | n/a — the confirm click disables the Delete button immediately (`confirming` flag), preventing a second click from firing a second request while the first is in flight (F07-AC9) | n/a | The row disappeared before the user could confirm (F07-AC6) — handled without a dialog-level error state; see §8 | Opens on *Delete* click, title `Delete this bookmark?`, body names the bookmark's title and URL from the already-held row (no new `GET`, same LD-03-style reuse F06 established); closes and calls the delete on *Delete* confirm | Native `<dialog>` + `showModal()`. **Cancel receives focus on open, not Delete** (F07-AC1) — the Cancel button ref is focused explicitly in `open()`, the same explicit-focus style F01/F06 already use rather than relying on an HTML `autofocus` attribute. `Esc` and *Cancel* both fire the dialog's native `close` event, handled once, which returns focus to the row's Delete button that opened it (F07-AC2). `Tab` reaches Cancel then Delete in visual order (F07-AC16) |
| **Undo toast** | n/a | n/a | A restore that fails (409 or a race 404) replaces the toast's text with the server's own message, with no Undo action attached — there is nothing left to undo a second time (F07-AC7) | `Bookmark deleted` toast, with an `Undo` button, appears on a successful delete (F07-AC3); 6 seconds later it clears itself automatically if untouched (F07-AC5, F07-EC3); activating `Undo` clears it immediately on a successful restore (F07-AC4) | Reuses the existing `aria-live="polite"` region — no new region is introduced (F07-AC16). The `Undo` button is a real `<button>`, reachable by `Tab`, operable by `Enter`/`Space`. It is disabled (its handler removed) the instant it is clicked, the same double-activation guard the confirm dialog uses, so a second rapid click cannot issue a second restore request |
| **Bookmark list / tag rail** | Unchanged from F03/F04 — `listLoading` while `loadList()` is in flight | Unchanged from F03-AC2 — rendered automatically once a delete leaves zero live rows (F07-AC13) | Unchanged from F03-AC11 | A successful delete or restore calls the existing `loadList()`, which re-clamps the page (F03's `clampPage`, satisfying F07-AC11) and re-runs `refreshTagRail()` (F04's existing call, satisfying F07-AC12) — **no new code path**, since both already exist and already run on every list reload | Unaffected — no new control is added to the list or rail by this feature |

**Destructive action (U4):** this is the feature. F07-AC1/AC2 are the confirmation half; F07-AC3/AC4/AC5 are the undo half. Both are satisfied together, as the constitution requires.

### U6 deviations — declared, with reasons

None. The confirmation dialog and the toast's Undo button are both ported verbatim from `docs/mockup.html`'s `#dd` dialog and its `toast(msg, undo)` function. The one behavioral departure from the mockup — every toast uses a single 6-second duration rather than the mockup's 3.5 s/6 s split — was already declared as a U6 deviation in `spec.md` §8 (C-F07-05) and is restated, not re-decided, here.

## 7. Validation Rules

F07 introduces no new user-facing form field. The one rule it adds is a boundary check on the `:id` route parameter, and like F03's pagination clamps, it never surfaces a message of its own — it collapses onto the existing `NOT_FOUND` response.

| Field | Rule | User message |
|---|---|---|
| `:id` route parameter (`DELETE`, `POST …/restore`) | Must be a JavaScript integer (`Number.isInteger(id)`); a non-numeric, fractional, `NaN`, zero, or negative value is rejected **before** any repository call is made | *(none directly — the request returns the existing `404 NOT_FOUND` body, `'That bookmark is no longer here.'`, F07-AC10)* |

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `:id` is not a JS integer (non-numeric, `NaN`, fractional) (F07-AC10) | `bookmark-service.js`, `softDelete`/`restore`, before any repository call | `404 NOT_FOUND` — never a 500. This guard exists specifically so a non-numeric `:id` is never bound into a SQLite parameter as `NaN`, sidestepping any uncertainty in how the driver would handle that value, rather than relying on it to fail safely |
| `:id` is zero, negative, or refers to a row that never existed (F07-AC10) | `bookmark-repository.js`, the `WHERE id = ?` predicate naturally matches no row (ids are `AUTOINCREMENT`, starting above zero) | `404 NOT_FOUND`, same body |
| A bookmark was already soft-deleted (another tab, or a prior request) when `DELETE` is called again (F07-AC6, EC21) | `bookmark-repository.softDelete`'s `WHERE … AND deleted_at IS NULL` matches 0 rows | `404 NOT_FOUND`. **No error banner is shown** — the dialog is already closed by the time this response can return (the confirm click closes it immediately, see §6), and the list is reloaded regardless of outcome, so the row's disappearance is the only visible effect |
| The Confirm *Delete* button is activated twice in rapid succession before the first response returns (F07-AC9, F07-EC1) | `DeleteConfirm`'s `confirming` flag disables the button after the first click, preventing the UI from ever issuing a second request in the common case; if a second request somehow still reaches the server (e.g., a replayed request outside this UI), it hits the same 0-rows-matched path above | Exactly one toast, never a second one and never a visible error — satisfied by construction: the UI only ever issues one request per confirm click, and any further server-side duplicate collapses to the same silent `NOT_FOUND` handling above |
| `restore` is called for a row that is live, already restored, or never existed (F07-AC8, AC10) | `bookmark-service.restore`'s `findDeletedById` check | `404 NOT_FOUND` |
| The URL was saved again as a new live bookmark during the undo window (F07-AC7, EC21) | `bookmark-repository.restore`'s catch of `SQLITE_CONSTRAINT_UNIQUE` | `409 DUPLICATE_URL`, message `'That address has been saved again since. Nothing was restored.'` (the restore-specific constructor, LD-03) — the toast's text is replaced with this message, its `Undo` action removed (there is nothing left to undo) |
| The undo toast's 6-second window elapses with no activation (F07-AC5, F07-EC3) | `BookmarksStore.showToast()`'s internal timer | The toast clears itself; the delete stands; no further user action |
| `Undo` is activated | `BookmarksStore.restoreBookmark()` — the handler is removed from the toast the instant it is clicked, before the request resolves | On success: the toast clears immediately and `loadList()` runs. On failure: see the two rows above |
| A delete succeeds or a restore succeeds | `BookmarksStore.deleteBookmark()` / `restoreBookmark()` | `loadList()` is called, which — with no new code in this feature — re-clamps the page if the deleted row was the last one on its page (F03's existing `clampPage`, F07-AC11) and re-runs `refreshTagRail()` (F04's existing call, F07-AC12), and naturally renders F03's empty state if the list is now empty (F07-AC13) |

## 9. Security Considerations

One row per untrusted input F07 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `:id` route parameter, both routes | Coerced with `Number()` in the route (unchanged pattern from F06's `PUT`); rejected as `NOT_FOUND` in the **service**, before any repository call, unless it is a JS integer. Every bound-parameter use that follows is therefore always a real integer, never a `NaN` or a string — removing any dependency on how the SQLite driver happens to handle an invalid bind value | **S1**, S4 |
| The restore race's duplicate-URL decision | Decided **server-side only**, by attempting the `UPDATE` against the live `ux_bookmark_url_live` index and reacting to the constraint violation — never inferred from, or trusted from, anything the client claims about whether a conflicting bookmark exists (S1) | **S1** |
| The bookmark's title and URL, shown in the confirmation dialog's body | Read from the already-held, already-validated-at-save-time row (the same object `BookmarkList` already renders as a card) and displayed through Angular interpolation only — no new fetch, no `[innerHTML]` | **S3** |

**Not applicable in F07:** search text, tag-filter values, and `page`/`size` query parameters (S6, S1 as applied elsewhere) — F07 adds no new query parameter and writes no `LIKE` pattern.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (bookmark-list + delete-confirm + store)
  participant R as api routes/bookmarks
  participant S as bookmark-service
  participant D as data/bookmark-repository

  U->>W: Click Delete on a card
  W-->>U: Confirmation dialog opens, focus on Cancel (F07-AC1)
  alt Cancel or Esc
    W-->>U: Dialog closes, focus returns to Delete button (F07-AC2)
  else Confirm Delete
    W->>W: disable Delete button (F07-AC9)
    W->>W: close dialog
    W->>R: DELETE /api/bookmarks/:id
    R->>S: softDelete(id)
    S->>S: reject if id is not an integer (F07-AC10)
    S->>D: softDelete(id, now)
    alt 0 rows changed (already deleted, EC21)
      D-->>S: changes = 0
      S-->>R: AppError NOT_FOUND
      R-->>W: 404
      W-->>U: list reloads silently (F07-AC6, AC9)
    else 1 row changed
      D-->>S: ok
      S-->>R: ok
      R-->>W: 204
      W->>W: showToast('Bookmark deleted', onUndo) — 6 s timer starts (F07-AC5)
      W->>W: loadList() -> re-clamps page (F07-AC11), refreshTagRail() (F07-AC12)
    end
  end

  opt User activates Undo before the toast clears
    W->>W: remove the Undo handler immediately
    W->>R: POST /api/bookmarks/:id/restore
    R->>S: restore(id)
    S->>D: findDeletedById(id)
    alt not currently soft-deleted (F07-AC8)
      D-->>S: null
      S-->>R: AppError NOT_FOUND
      R-->>W: 404
      W-->>U: toast text replaced with the message, Undo removed
    else found
      S->>D: restore(id, url_normalized)
      alt URL claimed by a new live bookmark (F07-AC7)
        D-->>S: SQLITE_CONSTRAINT_UNIQUE
        S-->>R: AppError DUPLICATE_URL (restore-specific message)
        R-->>W: 409
        W-->>U: toast text replaced, Undo removed
      else restored
        D-->>S: restored row
        S-->>R: { bookmark }
        R-->>W: 200
        W->>W: clearToast(); loadList() — row reappears at its original position
      end
    end
  end
```

## 11. Test Hooks

- **`bookmark-service.softDelete(id)` / `restore(id)`** are exported as plain functions accepting the same raw, possibly-invalid `id` the route passes through (including non-integers), so their tests call them exactly as the route does, without a running server — matching the existing pattern for `list()`.
- **`bookmark-repository.softDelete` / `findDeletedById` / `restore`** are exported directly, so a repository-level test can assert the 0-rows-changed path, the `SQLITE_CONSTRAINT_UNIQUE` catch, and the restore-specific error message independently of the service, using the existing `createDb({ file: ':memory:' })` harness.
- **`restoreDuplicateUrlError(existing)`** in `app-error.js` is exported and directly assertable, so a test can confirm its message is the restore-specific sentence and is never confused with `duplicateUrlError()`'s.
- **`BookmarksStore.showToast()` / `clearToast()` / the 6-second timer`** are testable with `vi.useFakeTimers()` (no real wait), asserting: a fresh `showToast()` cancels any still-pending timer from a previous toast (no two timers ever race to clear the same signal); the toast clears itself after exactly 6,000 ms if untouched (F07-AC5, F07-EC3); and `restoreBookmark()`'s success path clears it immediately regardless of how much of the 6 s has elapsed.
- **`BookmarksStore.deleteBookmark()` / `restoreBookmark()`** are testable against a faked `ApiService`, the same `provideHttpClientTesting()` pattern F01/F03/F06 already use, covering the success path, the silent-404 path, and the restore 409/404 paths without a real server.
- **`DeleteConfirm`** is testable via `TestBed`, asserting: `open()` focuses Cancel, not Delete (F07-AC1); `Esc`/Cancel restore focus to the opener (F07-AC2); the Delete button becomes disabled on the first click and stays disabled (F07-AC9).
- **Deliberately not automated here, carried to `/test-phase F07-delete-bookmark`** per `spec.md` §6: the F07-AC14/AC15 restart checks (stop/restart the process, confirm a soft-deleted row stays deleted and a restored row comes back with its tags and position intact) remain a documented manual/measured procedure, the same pattern F01's and F03's own restart ACs already use.

## 12. Architecture Impact

**None.** `hld.md` v2 §6.4 already specifies the full soft-delete/restore sequence this LLD implements, including both error codes (`NOT_FOUND`, `DUPLICATE_URL`) F07 uses — both are already members of §8's closed error-code table, so no new code is introduced. `data-model.md` v3's `deleted_at` column and the partial unique index `ux_bookmark_url_live` already exist for this exact purpose; no entity, field, or index is added. `component-map.json` v1 is unchanged.

The only nuance worth restating from §1: §8's rolled-up error table gives `DUPLICATE_URL` a single example sentence, while §6.4's sequence diagram — for the restore race specifically — already specifies the more specific wording `spec.md` F07-AC7 requires. This LLD follows §6.4 and the approved spec; it does not change, reopen, or contradict anything in `hld.md`.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; no F07 code exists yet |
| P2 Human approval gates | pass | LD-01…LD-04 each put to dev-1 as an option table; all four answered "Go with all recommendations" 2026-10-01 |
| P3 Honesty over polish | pass | Nothing here is claimed as verified; `/test-phase F07-delete-bookmark` is where F07-AC14/AC15's restart checks are actually run |
| P4 Simplicity first | pass | No new table, column, index, or transaction wrapper where a single `UPDATE` suffices (LD-03's rejected option B, restore's un-tagged response). No purge/empty-trash feature (C-F07-04, unchanged from `spec.md`) |
| P5 Incremental delivery | pass | Every task in `tasks.md` leaves the app buildable and runnable |
| P6 Single source of truth | pass | The restore-specific 409 message is constructed in exactly one function (`restoreDuplicateUrlError`), the same discipline `duplicateUrlError()` and `editConflictError()` already establish |
| P7 Measurable requirements | pass | §4/§7/§8 give every AC an observable outcome: an HTTP status and JSON shape, an exact UI string, a focus target, or a stored column value |
| Q1 Every AC testable | pass | §11 names the seam for each; F07-EC1, EC2, EC3 all map to a named test hook or to §8's handling |
| Q2 Tests executed | n/a | No test has run yet |
| Q3 Zero lint/build errors | pass (planned) | Each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (unchanged scope from F01/F03/F06) |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | n/a | F07 claims no new NFR measurement; NFR-02's restart check (F07-AC14/AC15) is measured in `/test-phase`, never estimated |
| S1 Validation at the boundary | pass | `:id` is validated in the **service**, independent of the route's `Number()` coercion; the restore race is decided server-side against the live unique index, never trusted from the client |
| S4 Parameterized queries | pass | §5: every value a bound parameter; no value is ever concatenated into SQL text |
| S3 Output escaping | pass | The dialog's title/URL render through Angular interpolation only, reusing the already-validated row F03 already renders as a card |
| U1 Keyboard-operable, visible focus | pass | §6, §11: native `<dialog>`/`<button>` throughout; the existing `:focus-visible` outline applies unchanged |
| U2 Labelled controls, errors as text | pass | The toast's Undo button and the dialog's Cancel/Delete are all native, labelled buttons; feedback is text in the existing `aria-live` regions |
| U3 Empty/loading/error states | pass | F07-AC13's empty state and F07-AC6's silent-refresh case are both covered — the latter deliberately with no new error UI, since no AC asks for one |
| **U4 Destructive actions require confirmation or offer undo** | **primary owner** | F07-AC1/AC2 (confirmation) and F07-AC3/AC4 (undo) together satisfy this clause, matching R07 and R13 |
| U5 Actionable errors | pass | Every error row in §8 states what happened; the restore-specific `DUPLICATE_URL` message additionally says what to do (nothing — it explains why nothing happened), matching F07-AC7's exact wording |
| U6 Approved UX reference | pass, no new deviation | The dialog and the toast's Undo button are ported verbatim from `docs/mockup.html`; C-F07-05's toast-timing deviation was already declared in `spec.md`, not reopened here |
| D1 Synthetic data | pass | No example in this document uses anything but `example.com` |
| A2/A5 Persistence | pass | F07-AC14/AC15 are real stop/restart checks against the existing SQLite file; no new persistence mechanism introduced |
| A4 Component map | pass | Every file in §3 and `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1 |
| E1 Evidence | pass | Material interactions from this session are logged per the `evidence-logging` skill |
| E3 No artifact disagrees | pass | §1 and §12 resolve the one apparent `hld.md` §8/§6.4 wording nuance by following the more specific, already-approved §6.4 text — nothing here contradicts `hld.md` v2, `data-model.md` v3, or `component-map.json` v1 |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, draft. LD-01 (new `delete-confirm` component, mirroring `BookmarkForm`), LD-02 (store-centralized `showToast()` with a 6 s timer, resolving F07-RK1/RK2), LD-03 (no pre-check on restore's duplicate race — catch the unique-constraint violation directly), LD-04 (`deleteRequested` output + opener, mirroring F06's `editRequested`) — all four answered "Go with all recommendations" by dev-1 | `/design-feature F07-delete-bookmark`, CREATE mode | design |
