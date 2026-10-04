### Evidence E-planning-701

**SDLC activity:** planning

**Task/feature:** F07-delete-bookmark — turn R07 (Delete) and R13 (Undo Delete) into a testable feature spec.

**Context given to AI:** `specs/product-spec.md` (R07, R08, R11, R13; EC17, EC21, EC23), `specs/backlog.md` F07 row, `specs/architecture/hld.md` §6.4 (delete/undo sequence, already approved) and §8 (error-handling table), `specs/architecture/data-model.md` (INV-03, INV-04, INV-09, INV-10, the partial unique index), `docs/mockup.html`'s delete-confirm dialog and `toast(msg, undo)` timing, sibling specs F03 (card buttons), F04 (tag-rail reaction to EC17), and F06/AMD-003 (confirms no new amendment is needed for F07's concurrency cases).

**Prompt/request:** `/plan-phase F07 Delete Bookmark`, then "GO with all defaults", plus an explicit instruction that the toast should auto-close after 6 seconds for every use case (not only the undo toast) — including the title-fetch-error notice and the bookmark-added-successfully toast from F01.

**AI response summary:** Produced a FEATURE-CREATE preview with 4 clarifying questions (undo window timing, double-delete handling, invalid-id handling, no-purge assumption), each with a recommended default. After "GO", generated `spec.md` (5 stories, 16 AC, 6 edge cases), `status.md`, and this evidence record. Discovered in the process that the shipped `Toast` component (built under F01) has no auto-dismiss at all — an undeclared gap against `docs/mockup.html`'s timed `toast()` — and that generalizing the auto-close to F01's existing toasts would touch a feature that has already passed Build/Test/Review. Recorded both as risks (F07-RK1, F07-RK2) rather than silently editing F01's already-approved artifacts.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Inspected `app/web/src/app/features/toast/toast.ts` and `toast.html` and `bookmarks.store.ts` directly — confirmed the `toast` signal has no `setTimeout`/auto-clear logic anywhere in the current build, matching the human's observation.

**Outcome:** worked

**Iteration:** —

**Approx. time:** TODO(human)

**Learning:** TODO(human)
