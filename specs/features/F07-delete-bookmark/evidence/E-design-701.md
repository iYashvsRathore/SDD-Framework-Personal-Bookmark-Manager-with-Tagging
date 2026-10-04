### Evidence E-design-701

**SDLC activity:** design

**Task/feature:** Produce F07-delete-bookmark's low-level design — the soft-delete/restore service and repository functions, the two new routes, the delete-confirmation dialog, and the undo toast's auto-dismiss — with at least two genuine alternatives and a human decision for every significant design choice, against the already-approved `hld.md` §6.4 sequence and `data-model.md` v3's existing `deleted_at` column and partial unique index.

**Context given to AI:** `specs/features/F07-delete-bookmark/spec.md` (approved, 16 AC, 6 edge cases, C-F07-01…C-F07-05, F07-RK1/RK2); `specs/features/F07-delete-bookmark/status.md`; `specs/architecture/hld.md` v2 (§6.4's delete/undo sequence, §8's error-handling and trust-boundary tables, §5's layering rules); `specs/architecture/data-model.md` v3 (`bookmark.deleted_at`, `ux_bookmark_url_live`, INV-09, INV-10); `specs/architecture/component-map.json` v1; `specs/backlog.md`; the existing `api` code (`routes/bookmarks.js`, `services/bookmark-service.js`, `data/bookmark-repository.js`, `lib/app-error.js`) and `web` code (`state/bookmarks.store.ts`, `features/bookmark-list/`, `features/bookmark-form/`, `features/toast/`, `core/api.service.ts`, `core/models.ts`); `docs/mockup.html`'s `#dd` dialog and `toast(msg, undo)` function; F03's and F06's already-approved LLDs, read for established patterns (F06's `editRequested`/`openEdit()` wiring, F03's `loadList()`/`refreshTagRail()` reuse).

**Prompt/request:** Run `/design-feature F07-delete-bookmark` following `.github/prompts/design-feature.prompt.md`; after the preview, "Go with all recommendations."

**AI response summary:** Detected CREATE mode, confirmed Planning was approved and no architecture blocker existed, and read every required source before drafting. Noted one nuance worth flagging rather than silently resolving: `hld.md` §8's rolled-up error table gives `DUPLICATE_URL` a single generic sentence, while §6.4's own sequence diagram already specifies a different, more specific sentence for the restore-race case specifically — which is also the exact text `spec.md` F07-AC7 requires — so no AMD was needed, only a second, dedicated error-message constructor to keep the two wordings from drifting. Presented four LD decisions as option tables: LD-01 (a new `delete-confirm` component, mirroring `BookmarkForm`'s dialog pattern, over embedding the dialog in `BookmarkList`); LD-02 (centralizing a `showToast(message, onUndo?)`/6-second-timer pair in `BookmarksStore`, over an effect inside the `Toast` component — chosen partly because it resolves F07-RK1/RK2 in one place, per the spec's own direction); LD-03 (no pre-check on restore's duplicate-URL race, catching `SQLITE_CONSTRAINT_UNIQUE` directly, over mirroring insert/update's pre-check-then-write shape); LD-04 (a `deleteRequested` output + opener, mirroring F06's already-shipped `editRequested` → `openEdit()`, over a new shared `pendingDelete` store signal). Each option table carried the challenge ("what breaks at 1,000 records, on restart, keyboard-only?"). Showed the execution preview; on "Go with all recommendations," wrote `specs/features/F07-delete-bookmark/lld.md` (14 sections) and `tasks.md` (15 tasks), covering all 16 AC and all 6 edge cases, with no architecture impact (§12: none — `hld.md` v2 and `data-model.md` v3 already approve everything F07 uses).

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** No command was run and no code was written — this is a design-only gate. Agent-side checking was confined to reading every required source, cross-referencing F03's and F06's shipped code and already-approved LLDs for pattern consistency (the `editRequested`/`openEdit()` shape, the `loadList()`/`refreshTagRail()` reuse for EC17/EC23), and self-checking the written LLD and task list against the prompt's Step 6 completion checklist (every AC mapped to a section or task, every file path resolved through `component-map.json`, every LD decision carrying ≥2 options and a human choice).

**Outcome:** TODO(human)

**Iteration:** One round. The four LD option tables and the preview were presented together; the human replied "Go with all recommendations" without requesting any change to an option or a challenge's conclusion.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
