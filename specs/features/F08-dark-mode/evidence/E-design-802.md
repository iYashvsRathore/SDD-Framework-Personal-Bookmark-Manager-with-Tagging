<!-- Filled by the evidence-logging skill. -->
### Evidence E-design-802

**SDLC activity:** design

**Task/feature:** Apply AMD-004 and generate the F08 Dark Mode low-level design (`lld.md`) and task list (`tasks.md`), following the human's acceptance of all recommended decisions.

**Context given to AI:** The same sources as E-design-801, plus `.github/templates/amendment.template.md`, `specs/architecture/amendments/AMD-003-edit-conflict-error-code.md` (the inline-apply precedent followed exactly), `.github/templates/lld.template.md`, `.github/templates/task-list.template.md`, and `specs/features/F07-delete-bookmark/lld.md`/`tasks.md` (for section-shape and task-table conventions).

**Prompt/request:** "accept all recomendation" (previous turn), then "GO".

**AI response summary:** Created `specs/architecture/amendments/AMD-004-invalid-theme-error-code.md` (Status: Applied, following the AMD-003 precedent of applying inline during feature design rather than a separate `/amend-architecture` run). Applied the change directly to `hld.md`: bumped it to v4, updated its Status line, and inserted the `INVALID_THEME` row into §8's error-handling table. Updated `specs/backlog.md`'s Architecture gate row to reference `hld.md` v4 and record AMD-004. Generated `specs/features/F08-dark-mode/lld.md` (14 sections: overview; 4 LD decisions with options/trade-offs/challenges; component changes across `api` and `web`; the full `GET`/`PUT /api/settings/theme` contract; data access against the existing `setting` table only; UI states with one declared U6 label deviation; validation rules; error handling; security considerations; a Mermaid sequence diagram; test hooks; architecture impact recording AMD-004; a full constitution check; and a change log) and `specs/features/F08-dark-mode/tasks.md` (9 ordered tasks, F08-T01…T09, covering `api` repository/service/route work before `web` types/store/UI wiring, each with files, covered AC, and a concrete Done-when).

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** TODO(human)

**Outcome:** TODO(human)

**Iteration:** Single round — one preview shown, approved with "GO", generated in full.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
