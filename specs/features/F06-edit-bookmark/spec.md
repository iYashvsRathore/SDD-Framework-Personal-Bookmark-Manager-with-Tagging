# F06: Edit Bookmark (Spec)

**Feature ID:** F06-edit-bookmark
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R06 (full), R08 (partial — an edited bookmark survives restart with its values intact), R09 (partial — reuses F01's URL validation and F02's tag validation on the edit path), R10 (partial — the duplicate check excludes the record being edited, EC16)
**Components affected:** `api`, `web`
**Depends on:** F01, F03
**Constitution version:** 1.0.0

## 1. User Stories

- **F06-US1:** As Priya, I want to open an existing bookmark pre-filled in the same form I used to add it, so that I can correct a mistake without retyping everything.
- **F06-US2:** As Priya, I want my edit blocked if it would duplicate another bookmark I already have, so that editing can't create the exact problem duplicate detection prevents on add.
- **F06-US3:** As Priya, I want an edited bookmark to keep its place in the newest-first order, so that fixing a typo doesn't make it look like I just added it.
- **F06-US4:** As Priya, I want to be told clearly if the bookmark I'm editing has changed elsewhere or is gone, so that I don't silently overwrite a more recent change or edit something that no longer exists.
- **F06-US5:** As Priya, I want *Edit existing* on the duplicate warning to take me straight to fixing the bookmark that's already there, so that I'm not left stuck when adding something I already saved.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F06-AC1 | A live bookmark exists: `https://example.com/a`, title `Example`, tags `docs`, `research` | I activate its *Edit* button | The dialog opens titled `Edit bookmark`; *Web address* holds `https://example.com/a`; *Title* holds `Example`; the tag chips show `docs` and `research`; the submit control reads `Save changes` |
| F06-AC2 | The edit dialog is open as in F06-AC1 | I change *Web address* to `https://example.com/b`, *Title* to `Example B`, replace the tags with `design`, and activate *Save changes* | `PUT /api/bookmarks/:id` returns **200**; the row has `url='https://example.com/b'`, `title='Example B'`, `title_source='user'`, `tags=['design']`; `updated_at` advances; `created_at` is unchanged; the dialog closes and a toast reads `Changes saved` |
| F06-AC3 | A live bookmark owns `url_normalized` for `https://example.com/a` as its **own** stored row | I resave it with only the title or tags changed, URL unchanged | `PUT` returns **200**, not 409 — the duplicate lookup excludes the record's own id (`AND id <> ?`, INV-04) |
| F06-AC4 | Two live bookmarks exist: A at `https://example.com/a`, B at `https://example.com/c` | I edit B's *Web address* to `https://EXAMPLE.com/a/` | `PUT` returns **409** `DUPLICATE_URL` with `error.existingId` equal to A's id; the same banner contract as F01-AC11 (`View existing` / `Edit existing`) appears; B's stored row is unchanged |
| F06-AC5 | The edit dialog is open | I clear *Web address* and activate *Save changes* | `PUT` returns **400** `INVALID_URL`, `field='url'`, the identical inline message, `aria-invalid` and focus contract as F01-AC7; no row is modified. *(Representative AC — F01's remaining URL-validation messages (scheme, length, EC02–EC04) apply identically on `PUT` and are not re-enumerated here.)* |
| F06-AC6 | No UI is involved | `PUT /api/bookmarks/:id` is called directly with 9 distinct valid tag strings | **400** `INVALID_TAG`, `field='tags'`, identical message to F02-AC6; the row is unchanged. *(Representative AC — F02's remaining tag-validation messages apply identically on `PUT`.)* |
| F06-AC7 | Bookmark X was created before bookmark Y | X is edited (title changed only) | `GET /api/bookmarks` still lists Y before X — X's position in the newest-first order is unchanged even though its `updated_at` is now later than Y's `created_at` (AS02, AS03, INV-10) |
| F06-AC8 | The edit dialog is open for a bookmark with a populated *Title* | I clear *Title*, leave or change *Web address*, and activate *Save changes* | The same fetch-or-hostname-fallback path as F01-AC4/AC5 runs against the current *Web address*. On success, `title_source='fetched'` with the new title. On failure, `title_source='hostname'`, and the F01-AC5 toast notice appears **in place of** `Changes saved` |
| F06-AC9 | A bookmark was edited (new url, title and tags) | The application is stopped and restarted, then `GET /api/bookmarks` is called | The edited values are returned — not the pre-edit ones — with `created_at` unchanged from before the edit |
| F06-AC10 | A bookmark was soft-deleted (for example, from another browser tab) after the edit dialog opened with its data | I activate *Save changes* | `PUT` returns **404** `NOT_FOUND`, message `That bookmark is no longer here.`, shown in a live region; no row is created or resurrected |
| F06-AC11 | The edit dialog loaded a bookmark whose `updated_at` was `T1`; before I save, another tab edits the same bookmark, advancing it to `T2` | I activate *Save changes*, submitting the edit carrying `T1` | `PUT` returns **409** `EDIT_CONFLICT` — not a silent overwrite; the message explains the bookmark changed elsewhere and offers to reload; the stored row keeps the other tab's `T2` values |
| F06-AC12 | The add dialog's duplicate banner is showing for an existing bookmark D (F01-AC11) | I activate *Edit existing* | The add dialog closes; the edit dialog opens pre-filled with D's current url/title/tags, exactly as F06-AC1; whatever was typed into the abandoned add attempt is discarded |
| F06-AC13 | The edit dialog is open | Navigated using only the keyboard | `Tab` reaches every control in visual order with a visible focus indicator; the same commit/remove keys as F02-AC10 operate the tag chips; `Esc` closes the dialog and returns focus to the *Edit* button that opened it (not the *Add bookmark* button); every input has an associated `<label for>` |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R06 | F06-AC1, F06-AC2, F06-AC7, F06-AC8, F06-AC12 |
| R08 | F06-AC9 |
| R09 | F06-AC5, F06-AC6 |
| R10 | F06-AC3, F06-AC4 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F06-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC16 | Editing a URL so that it matches another existing bookmark | Blocked with the duplicate banner; the record being edited is excluded from its own duplicate check (F06-AC3, F06-AC4) | assignment |
| EC20 | Host is an internationalized or unicode domain, e.g. `münchen.example` | Normalized identically to the add path (INV-02), reusing F01's logic unchanged — no new AC; closed by F01-AC12's normalization rule applying equally to `PUT` | AI |
| EC21 | Two browser tabs edit or delete the same bookmark | The second action does not resurrect a deleted record (F06-AC10) or silently overwrite without the user noticing (F06-AC11) | AI |
| F06-EC1 | Editing a bookmark's tags down to zero | Succeeds; `tags=[]` is a valid stored state, consistent with C-F02-05 (tags are optional) — **to test** in `/test-phase` | AI |
| F06-EC2 | Editing only the title or tags, resubmitting the *same* URL the record already owns | Must not trip the duplicate check against its own `url_normalized` (closed by F06-AC3; this is the "nothing changed on the URL" variant of EC16) | AI |
| F06-EC3 | Activating *Edit existing* from the duplicate banner raised while adding a new bookmark | Discards the abandoned add attempt rather than merging any of its typed values into the edit (F06-AC12) | AI |

Six cases recorded: two inherited (`assignment`-sourced EC16; `AI`-sourced EC20, EC21 as found in `product-spec.md` §5), three new (`F06-EC1`–`F06-EC3`, all `AI`).

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-02 | F06-AC9 is the persistence check for the edit path: an edited row's new values, and its unchanged `created_at`, survive a stop/restart. The edit (URL validate + tag-set replace) is one transaction, per `hld.md` §6.3, so EC19's "no partial write" guarantee extends to edits. |
| NFR-03 | F06-AC13 is the keyboard and label contract for the edit dialog — the same contract F01-AC17 and F02-AC10 establish for the add dialog, reused rather than redefined, plus the detail that `Esc` must return focus to the row's *Edit* button, not the global *Add bookmark* control. |
| NFR-04 | F06-AC5 and F06-AC6 assert that F01's and F02's server-side validation applies identically on `PUT`, independent of whatever the client already filtered (S1). F06-AC11's `EDIT_CONFLICT` check is also enforced **server-side**, comparing the stored `updated_at` against what the client submitted — the client cannot assert a conflict was resolved; the API decides. |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F06's acceptance criteria.

- **The wording of F01's URL-validation messages and F02's tag-validation messages.** F06 asserts that the same codes and messages apply on `PUT` (F06-AC5, F06-AC6 are representative), but does not restate or re-derive them — F01 and F02 own that wording.
- **The *Edit* button's rendering, accessible name and presence on the list card** — F03, already shipped (F03-AC8). F06 only asserts what happens once that button is activated.
- **The tag chip input's commit/remove keys, silent truncation, 8-tag cap and autocomplete suggestions** — F02. F06 asserts only that the same component is reused and pre-filled with the bookmark's existing tags (F06-AC1); it does not restate F02's interaction rules.
- **Delete, its confirmation dialog, and undo (R07, R13)** — F07.
- **What *View existing* does from the duplicate banner** — F03 (specified under F01 §5).
- **Search and tag-filter behavior toward an edited bookmark** — F04, F05. The shared query builder (AS-F03-01) already covers whichever fields change; F06 does not restate it.
- **Theme toggle (R12)** — F08.
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture, full-text search of page contents.

## 6. Effort and Risks

- **Estimate:** **M**, matching `product-spec` §3. The validation and duplicate-check logic is reused from F01 and F02; the new surface is the pre-fill, the self-exclusion parameter, the title-cleared re-fetch path (F06-AC8), and the two new failure modes this feature introduces: `NOT_FOUND` (already in `hld.md`'s error table) and `EDIT_CONFLICT` (not yet — see F06-RK1 below).

| Risk | Relevance to F06 | Handling |
|---|---|---|
| **New — F06-RK1** | F06-AC11's `EDIT_CONFLICT` response is a **new error code** not yet in `hld.md` §8's error-handling table or its trust-boundary table. `data-model.md`'s `updated_at` column already documents "EC21 conflict detection" as its purpose, so the *field* is architecturally anticipated — but the *response contract* (status 409, code `EDIT_CONFLICT`, the comparison rule) is not yet written into the shared HLD. | This is a planning-level intention, not an approved architecture decision. Recorded as **C-F06-01** below. `/design-feature F06-edit-bookmark` must raise an amendment adding `EDIT_CONFLICT` to `hld.md` §8 (following the AMD-001 precedent: proposed during feature work, applied before the LLD is finalized) before F06-AC11 can be built against an approved contract. |
| RK01 (scope vs the 2026-10-05 date) | F06 depends on both F01 and F03, so it can only start once both are in a stable-enough state; it is on the critical path toward F07/F08 only indirectly (they depend on F03, not F06). | Unchanged from `product-spec` §6 — F06 reuses F01/F02 logic rather than rebuilding it, which keeps its own scope to the items in §2. |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F06-01 | How should a concurrent edit to the same live bookmark from two tabs (EC21) be handled — silently overwrite (last-write-wins), or detect and refuse the conflict? | Accepted the recommended default: **optimistic concurrency.** The edit form carries the `updated_at` value it loaded; if the stored row's `updated_at` has since changed, `PUT` returns `409 EDIT_CONFLICT` instead of overwriting silently. Requires an `hld.md` §8 amendment (F06-RK1) before `/design-feature` finalizes the LLD. | 2026-10-01 |
| C-F06-02 | Does clearing *Title* during an edit re-trigger the title fetch (mirroring the add flow), or does it leave the title blank, or reuse the hostname immediately? | Accepted the recommended default: adopt `docs/mockup.html`'s behavior as-is (U6) — the edit submit handler re-runs the identical fetch-or-hostname-fallback logic whenever *Title* is empty, regardless of whether the URL changed. | 2026-10-01 |
| C-F06-03 | What happens when *Edit existing* is activated from the add dialog's duplicate banner (F01-AC11), given the add attempt already has typed-but-unsaved values? | Accepted the recommended default: the add dialog closes, the edit dialog opens pre-filled with the **existing** bookmark's stored data, and the abandoned add attempt's values are discarded — matching `docs/mockup.html`'s `openForm(d)`. | 2026-10-01 |
| C-F06-04 | What is the response shape of a successful `PUT`? | Accepted the recommended default: `200` with the same `{ bookmark: {...} }` shape `POST` returns on `201`, so no second response contract needs to be designed. | 2026-10-01 |
| C-F06-05 | Does resaving an edit with no actual changes to any field take a different path than a normal update? | Accepted the recommended default: no — it is treated as an ordinary update (`updated_at` advances, toast reads `Changes saved`); no diff-detection or no-op path is built, matching `docs/mockup.html`'s unconditional `Object.assign`. | 2026-10-01 |

**AS-F06-01.** F06-AC7's assertion that an edit never changes ordering follows directly from AS02/AS03 in `product-spec.md` §6, already confirmed by the human for F01/F03. No new assumption is introduced; this AC exercises an existing one on a path (`PUT`) those features' AC did not reach.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes F06's LLD and any F06 code. No `PUT` handler exists yet. |
| P3 Honesty over polish | pass | No AC claims a verified result. F06-RK1 states plainly that `EDIT_CONFLICT` is not yet an approved architecture decision, rather than assuming the amendment will be trivial. |
| P4 Simplicity first | pass | No diff-detection, no separate "nothing changed" path (C-F06-05), no new UI component — the same add/edit dialog and chip input are reused (U6). |
| P7 Measurable requirements | pass | 13 AC, every one Given/When/Then with an observable outcome: an HTTP status and error code, an exact UI string, or a stored column value. |
| Q1 Every AC testable | pass | All six edge cases in §3 map to an AC, or are explicitly named as reusing an existing one (EC20) without a new AC being needed. |
| S1 Validation at the boundary | pass | F06-AC5, F06-AC6 assert the **API's** rejection on `PUT`, independent of the client; F06-AC11 asserts the conflict check is server-side, comparing stored vs. submitted `updated_at`. |
| S3 Output escaping | pass | Reused unchanged from F01/F02 — no new rendering surface for untrusted text is introduced by editing. |
| S4 Parameterized queries | pass | The `PUT` update and the tag-set replacement use bound-parameter prepared statements, per `data-model.md` §3, same as the F01 insert path. |
| A2/A5 Persistence | pass | F06-AC9 is a real stop/restart check against the embedded SQLite file. |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1. |
| U1/U2 Keyboard and labels | pass | F06-AC13 covers focus order, visible focus, the chip input's keyboard contract (reused from F02-AC10), and `Esc` returning focus to the originating *Edit* button. |
| U3 Empty/loading/error states | pass | F06-AC5, F06-AC10, F06-AC11 name the invalid-input, not-found and conflict error states on the edit path; no loading state is new (it reuses F01's "Fetching title…" busy note per F06-AC8). |
| U5 Actionable errors | pass | Every message in §2 says what happened and what to do (reload, pick a different address). No message exposes `updated_at` timestamps, a stack trace or an internal identifier beyond the bookmark's own id. |
| **U6 Approved UX reference** | **addition, declared** | `docs/mockup.html`'s single add/edit form and its `openForm(b)` prefill are ported verbatim (F06-AC1, F06-AC2, F06-AC8, F06-AC12) — no deviation there. Two additions the reference does not cover: **(a)** the `NOT_FOUND` state when the row is deleted mid-edit (F06-AC10) — the mockup's in-memory array can never have this race; **(b)** the `EDIT_CONFLICT` state (F06-AC11) — the mockup has no multi-tab concept at all. Neither changes the reference's existing layout or copy for the success path. |
| D1 Synthetic data | pass | Every URL in this spec is under `example.com`. |
| E1 Evidence | pass | E-planning-601 records this session's material interaction. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F06-edit-bookmark`, FEATURE-CREATE mode. Recorded C-F06-01…C-F06-05; dev-1 accepted all five recommended defaults in one round. Raised F06-RK1: `EDIT_CONFLICT` needs an `hld.md` §8 amendment before `/design-feature` can finalize the LLD, following the AMD-001 precedent. | planning |
| 2026-10-01 | Status set to approved; backlog row set to `planned`; rolled up into `docs/01-planning.md` | Planning gate approved by dev-1 | planning |
