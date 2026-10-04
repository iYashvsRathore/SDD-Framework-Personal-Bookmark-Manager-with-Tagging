# F07: Delete Bookmark (Spec)

**Feature ID:** F07-delete-bookmark
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R07 (full), R13 (full), R08 (partial — delete and restore both survive a restart), R11 (partial — the not-found, empty-list-trigger and tag-rail-trigger states; the states themselves are rendered by F03 and F04)
**Components affected:** `api`, `web`
**Depends on:** F03
**Constitution version:** 1.0.0

## 1. User Stories

- **F07-US1:** As Priya, I want to be asked to confirm before a bookmark is actually removed, so that an accidental click on *Delete* doesn't lose a link.
- **F07-US2:** As Priya, I want a short window to undo a delete right after it happens, so that I can recover instantly if I change my mind or deleted the wrong one.
- **F07-US3:** As Priya, I want a deleted bookmark to stay deleted — and a restored one to come back exactly as it was — even if I stop and restart the app, so that I can trust what the list shows.
- **F07-US4:** As Priya, I want the list, the page I'm on, and the tag filter rail to stay sensible after I delete something, so that I'm never looking at an empty page or a dead filter for no visible reason.
- **F07-US5:** As Priya, I want a double-click or a stale confirmation dialog to never cause a confusing error or a duplicate action, so that deleting feels predictable even if I'm not careful.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F07-AC1 | A live bookmark row is rendered with title `Example` and URL `https://example.com/a` | I activate its *Delete* button | A confirmation dialog opens titled `Delete this bookmark?`, naming the bookmark's title and URL in its body; initial focus is on *Cancel*, not *Delete* (U4) |
| F07-AC2 | The confirmation dialog from F07-AC1 is open | I activate *Cancel*, or press `Esc` | The dialog closes; no request is sent; the row is unchanged; focus returns to the *Delete* button that opened it |
| F07-AC3 | The confirmation dialog from F07-AC1 is open | I activate *Delete* (confirm) | `DELETE /api/bookmarks/:id` returns **204**; the row's `deleted_at` is set to the current time; the dialog closes; a toast reads `Bookmark deleted` and carries an *Undo* action; the list reloads and no longer shows the row |
| F07-AC4 | The toast from F07-AC3 is showing, carrying its *Undo* action | I activate *Undo* before the toast clears | `POST /api/bookmarks/:id/restore` returns **200** `{ bookmark }`; `deleted_at` is cleared; the tag links are unchanged (INV-09); the row reappears in its original newest-first position, `created_at` unchanged (AS02); the toast clears |
| F07-AC5 | The toast from F07-AC3 is showing | 6 seconds elapse without *Undo* being activated | The toast is removed automatically, with no further user action; the bookmark remains deleted |
| F07-AC6 | A bookmark was already deleted (for example, from another browser tab) | `DELETE /api/bookmarks/:id` is called again for the same id | **404** `NOT_FOUND`, message `That bookmark is no longer here.`; no row changes; the list refreshes so the row is not shown (EC21) |
| F07-AC7 | A bookmark was deleted, and before *Undo* is activated its URL is saved again as a new, separate live bookmark | *Undo* is activated on the original toast | `POST /api/bookmarks/:id/restore` returns **409** `DUPLICATE_URL`, message `That address has been saved again since. Nothing was restored.`; the originally deleted row stays deleted; the new bookmark is unaffected (EC21, `hld.md` §6.4) |
| F07-AC8 | A bookmark id refers to a row that is not currently soft-deleted — because it is still live, was already restored, or never existed | `POST /api/bookmarks/:id/restore` is called for that id | **404** `NOT_FOUND`; no row is created or changed |
| F07-AC9 | The confirmation dialog from F07-AC1 is open | *Delete* (confirm) is activated twice in rapid succession (double-activation) before the first response returns | Exactly one soft delete persists; the second `DELETE` request returns **404** `NOT_FOUND` (the same zero-rows-changed path as F07-AC6); the user sees one *Bookmark deleted* toast, never a visible error or a second toast |
| F07-AC10 | No UI is involved | `DELETE /api/bookmarks/:id` or `POST /api/bookmarks/:id/restore` is called directly with a non-numeric, zero, negative, or never-existed `:id` | **404** `NOT_FOUND` in every case — never a 500 or an unhandled exception (S1) |
| F07-AC11 | 25 bookmarks exist at `size=10` (pages of 10, 10, 5); I am viewing page 3, which holds exactly 1 remaining item | I delete that item | The view moves to page 2 rather than rendering an empty page 3 with a page number that no longer exists (EC23, reusing F03-AC6's clamp) |
| F07-AC12 | A tag has exactly one live bookmark | That bookmark is deleted | The next `GET /api/tags` no longer includes the tag (its live-bookmark count is zero). *The tag rail's own re-render and any active-filter fallback are F04's acceptance criteria (F04-AC10); F07 asserts only that the trigger condition — zero live bookmarks for that tag — exists after the delete (EC17)* |
| F07-AC13 | Exactly one live bookmark remains | It is deleted | `GET /api/bookmarks` returns `{ items: [], total: 0 }`. *F03 owns the empty-state rendering (F03-AC2); F07 asserts only that the delete produces the zero-live-rows condition that triggers it* |
| F07-AC14 | A bookmark is deleted and *Undo* is **not** activated | The application is stopped and restarted, then `GET /api/bookmarks` is called | The bookmark does not appear in the list; it remains soft-deleted after the restart (NFR-02) |
| F07-AC15 | A bookmark is deleted, then restored via *Undo* | The application is stopped and restarted, then `GET /api/bookmarks` is called | The bookmark appears, live, with its original tags and its original `created_at` / list position (NFR-02) |
| F07-AC16 | The confirmation dialog is open, and separately, the undo toast is showing | Each is navigated using only the keyboard | Dialog: `Tab` reaches *Cancel* and *Delete* in visual order with a visible focus indicator; `Esc` behaves as F07-AC2. Toast: the *Undo* button is reachable by `Tab` and operable by `Enter`/`Space`; the toast's text is announced through the existing `aria-live="polite"` region (no new region is introduced) |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R07 | F07-AC1, F07-AC2, F07-AC3, F07-AC9, F07-AC10 |
| R08 | F07-AC14, F07-AC15 |
| R11 | F07-AC6, F07-AC8, F07-AC12, F07-AC13 |
| R13 | F07-AC4, F07-AC5, F07-AC7 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` or `human` and are prefixed `F07-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC17 | Deleting the last bookmark that carries a given tag | F07 produces the zero-live-bookmark trigger (F07-AC12); the rail's disappearance and the active-filter fallback are F04-AC10 | AI |
| EC21 | Two browser tabs edit or delete the same bookmark | Covered on the delete/restore side by F07-AC6 (already-deleted → 404) and F07-AC7 (restore race → 409); the edit-side half is F06's | AI |
| EC23 | The last bookmark on the final page is deleted | The view clamps to the previous page rather than showing an empty one (F07-AC11) | AI |
| F07-EC1 | The confirm *Delete* button is activated twice in rapid succession before the first response returns | One soft delete persists; the second request is treated as an ordinary already-deleted case (404), not an error surfaced to the user (F07-AC9) | AI |
| F07-EC2 | `DELETE` or `restore` is called with an id that is non-numeric, zero, negative, or does not exist | 404 in every case, never a 500 or a stack trace reaching the client (F07-AC10) | AI |
| F07-EC3 | The undo toast's window elapses without *Undo* being activated | The toast clears itself automatically after 6 seconds; the delete stands (F07-AC5) | human |

Six edge cases recorded: three inherited (all tagged `AI` in `product-spec.md` §5), three new (two `AI`, one `human` — the auto-close timing was a direct instruction, not discovered by this session).

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-02 | F07-AC14 and F07-AC15 are this NFR's delete/restore checks: a soft-deleted row stays deleted after a restart, and a restored row comes back with its tags and position intact. Both are real stop/restart checks against the embedded SQLite file, exercising `hld.md` §6.4's single transaction per logical write (`deleted_at` update, tag-link preservation, restore). |
| NFR-03 | F07-AC16 is the keyboard and label contract for the confirmation dialog and the undo toast's new *Undo* control — surfaces this feature adds beyond what F03 already covers (F03-AC9). |
| NFR-04 | F07-AC10 asserts the API's own boundary validation of `:id`, independent of whatever the client already filtered (S1); F07-AC7's `DUPLICATE_URL` restore race is decided **server-side** by re-checking `ux_bookmark_url_live` (INV-03), not trusted from the client. |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F07's acceptance criteria.

- **The *Delete* button's rendering, accessible name and presence on the list card** — F03, already shipped (F03-AC8). F07 asserts only what happens once it is activated.
- **The tag rail's re-render once a tag's count reaches zero, and the active-filter fallback to "All bookmarks"** — F04 (F04-AC10). F07 only asserts the triggering condition (F07-AC12).
- **The empty-state rendering (`No bookmarks yet`)** — F03 (F03-AC2). F07 only asserts the triggering condition (F07-AC13).
- **`EDIT_CONFLICT` and any edit-side concurrency behavior** — F06. F07's concurrency concern is delete/restore only (F07-AC6, F07-AC7).
- **Search and tag-filter query behavior toward a deleted or restored bookmark** — F04, F05; the shared predicate builder (`AS-F03-01`) already excludes non-live rows via `deleted_at IS NULL`.
- **Theme toggle (R12)** — F08.
- **Hard delete, an "empty trash" action, or any way to permanently purge a soft-deleted row** — not requested by the source; soft-deleted rows remain in the database indefinitely (C-F07-04). The hard-delete cascade in `data-model.md` exists only for test-data teardown and the NFR-01 seeding reset.
- **Bulk/multi-select delete** — `product-spec` §2, deferred enhancement.
- **Generalizing automatic toast dismissal to F01's `Bookmark saved` and title-fallback-notice toasts** — directed by the human during this planning session (C-F07-05) but not an F07 acceptance criterion; F07-AC5 asserts only this feature's own undo toast. The broader change is carried as F07-RK2 below, to be picked up when the shared `Toast` component is actually touched during `/build-feature F07-delete-bookmark`.

## 6. Effort and Risks

- **Estimate:** **S**, matching `product-spec` §3. No new UI component is introduced — the confirmation dialog and the undo toast both reuse F03's card buttons and the F01-owned toast region (`app/web/src/app/features/toast`); the bulk of the work is the soft-delete/restore service logic and the already-approved `hld.md` §6.4 sequence.

| Risk | Relevance to F07 | Handling |
|---|---|---|
| RK01 (scope vs the 2026-10-05 date) | F07 depends only on F03 (already `done`), so it is unblocked and not on anyone else's critical path | Unchanged from `product-spec` §6 |
| **New — F07-RK1 — accepted by dev-1 at the planning gate, 2026-10-01** | Observed while writing this spec: the shared `Toast` component (`app/web/src/app/features/toast`), built and gate-approved under F01, currently has **no auto-dismiss at all** — `docs/mockup.html`'s `toast(msg, undo)` clears itself after 3500ms (no undo) or 6000ms (with undo), but the shipped Angular component only clears the `toast` signal when the next message overwrites it. This is an undeclared U6 gap in F01's already-reviewed build, discovered here because F07-AC5 is the first acceptance criterion in the project to require a toast to clear itself | F07 fixes the shared component (adds the 6-second auto-dismiss) as part of its own build, since F07-AC5 is what first requires the behavior. The fix is additive to the component's existing contract, not a rewrite |
| **New — F07-RK2 — accepted by dev-1 at the planning gate, 2026-10-01** | C-F07-05 (below) generalizes the 6-second auto-dismiss to **every** toast, including F01's `Bookmark saved` and the title-fallback notice — which currently never auto-dismiss either. Changing their behavior touches a feature (F01) that has already passed Build, Test and Review | Recorded here, not silently applied to F01's `spec.md`. **Recommended follow-up:** a short `/plan-phase F01-add-bookmark` CHANGE-mode run (or a note picked up at `/build-feature F07-delete-bookmark`) to update F01-AC3 and F01-AC5's wording to state the 6-second auto-dismiss, append a change-log row, and re-run F01's existing toast-related tests. F07 does not modify F01's artifacts in this session |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F07-01 | Should the undo window be pinned at an exact, testable duration, or left as an unmeasured "brief window"? | Accepted the recommended default: pin it at **6 seconds**, matching `docs/mockup.html`'s `toast(msg, undo)` timing for a toast carrying an undo action (U6). | 2026-10-01 |
| C-F07-02 | Should rapid double-activation of the confirm *Delete* button get its own acceptance criterion, or is it already covered by the existing not-found contract? | Accepted the recommended default: give it its own AC (F07-AC9) for the same reason EC18 got its own AC under F01 — an easy-to-miss race deserves an explicit, testable assertion rather than an inferred one. | 2026-10-01 |
| C-F07-03 | Should F07 explicitly assert `404 NOT_FOUND` for an invalid `:id` (non-numeric, zero, negative, never-existed) on `DELETE` or `restore`? | Accepted the recommended default: yes (F07-AC10) — the API is reachable directly by `curl`, so boundary validation must not rely on the client ever sending a well-formed id (S1). | 2026-10-01 |
| C-F07-04 | Is "soft-deleted rows stay in the database forever, with no purge or empty-trash feature" an acceptable out-of-scope assumption? | Accepted the recommended default: yes — nothing in the source requests one, and `data-model.md`'s hard-delete cascade exists only for test-data teardown. | 2026-10-01 |
| C-F07-05 | Should the undo toast's 6-second auto-close generalize to *every* toast in the app — including F01's `Bookmark saved` confirmation and its title-fallback notice, which today never auto-dismiss at all? | **Human instruction, not a recommended default:** yes — every toast (not only the undo toast) auto-closes after 6 seconds. This is a deliberate departure from `docs/mockup.html`'s split timing (3.5 s for a plain toast, 6 s only for one carrying undo); here all toasts use the single 6-second duration. Declared as a U6 deviation. Implementation and F01 follow-up tracked as F07-RK1 and F07-RK2. | 2026-10-01 |

**AS-F07-01.** F07-AC4's "tags unchanged" and "original position" assertions follow directly from INV-09 and INV-10/AS02 in `data-model.md` and `product-spec.md`, already confirmed for F01/F03/F06. No new assumption is introduced; this AC exercises the existing invariants on the restore path.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes F07's LLD and any F07-specific code. The `DELETE`/`restore` routes and `softDelete`/`restore` services do not exist yet. |
| P3 Honesty over polish | pass | No AC claims a verified result. F07-RK1 states plainly that the shared `Toast` component's missing auto-dismiss is a gap discovered now, not something already fixed. |
| P4 Simplicity first | pass | No new UI component; the confirmation dialog and toast both reuse existing surfaces (F03's card buttons, F01's toast region). No purge/empty-trash feature (C-F07-04). |
| P7 Measurable requirements | pass | 16 AC, every one Given/When/Then with an observable outcome: an HTTP status and error code, an exact UI string, a focus target, or a stored column value. |
| Q1 Every AC testable | pass | All six edge cases in §3 map to an AC. |
| S1 Validation at the boundary | pass | F07-AC10 asserts the **API's** own id validation, independent of the client; F07-AC7's restore race is decided server-side against `ux_bookmark_url_live`. |
| S4 Parameterized queries | pass | The soft-delete `UPDATE` and the restore `UPDATE` use bound-parameter prepared statements, per `data-model.md` §3, matching the existing `hld.md` §6.4 sequence. |
| A2/A5 Persistence | pass | F07-AC14 and F07-AC15 are real stop/restart checks against the embedded SQLite file. |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1. |
| U1/U2 Keyboard and labels | pass | F07-AC16 covers focus order and visible focus for the confirmation dialog and the undo toast's new control. |
| U3 Empty/loading/error states | pass | F07-AC6, F07-AC8 name the not-found state on the delete/restore path; F07-AC12, F07-AC13 name the triggers for F04's and F03's existing empty states without restating their rendering. |
| **U4 Destructive actions require confirmation or offer undo** | **primary owner** | F07 is this clause's main feature: F07-AC1/AC2 are the confirmation, F07-AC3/AC4 are the undo. Both halves of U4 are satisfied together, matching R07 and R13. |
| U5 Actionable errors | pass | F07-AC6, F07-AC7, F07-AC8, F07-AC10 all state what happened and, where relevant, what to do next (reload, pick a different address). No message exposes an internal identifier beyond the bookmark's own id. |
| **U6 Approved UX reference** | **deviation, declared** | The confirmation dialog's title, body and button layout are ported verbatim from `docs/mockup.html` (F07-AC1). One declared deviation: the mockup auto-dismisses a plain toast after 3.5 s and an undo-carrying toast after 6 s; here, **every** toast — including F01's existing ones — auto-dismisses after a single 6-second duration (C-F07-05). This also corrects an undeclared gap in F01's shipped build, which had no auto-dismiss at all (F07-RK1). |
| D1 Synthetic data | pass | Every example bookmark in this spec uses `example.com`. |
| E1 Evidence | pass | E-planning-701 records this session's material interaction. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F07-delete-bookmark`, FEATURE-CREATE mode. Recorded C-F07-01…C-F07-04 (recommended defaults, all accepted) and C-F07-05 (human-directed: generalize the 6-second toast auto-close to every toast, not only the undo toast). Raised F07-RK1 (undeclared gap: the shipped `Toast` component has no auto-dismiss at all) and F07-RK2 (the generalization touches F01's already-reviewed build; tracked as a follow-up, not applied here). | planning |
| 2026-10-01 | Status set to approved; rolled up into `docs/01-planning.md` | Planning gate approved by dev-1 | planning |
