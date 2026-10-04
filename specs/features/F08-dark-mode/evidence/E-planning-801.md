<!-- Filled by the evidence-logging skill. -->
### Evidence E-planning-801

**SDLC activity:** planning

**Task/feature:** Produce the feature specification for F08 Dark Mode (R12) — user stories, Given/When/Then acceptance criteria for the theme toggle and its server-backed persistence, edge cases, applicable NFRs, and scope boundaries — ahead of its design (LLD).

**Context given to AI:** `specs/product-spec.md` (R12 wording and citation, EC26, NFR-02/03/04); `specs/backlog.md` (F08 row: requirements R12, components `api`/`web`, depends on F03, owner `dev-1`, status `not-started`); `specs/architecture/hld.md` §6.5/§7 (AD-05: `setting` row as the authoritative value, `GET`/`PUT /api/settings/theme`, non-authoritative `localStorage` render mirror) and `specs/architecture/data-model.md` (`setting` table, `CHECK (key IN ('theme'))`, `CHECK` on `value` restricted to `'light'`/`'dark'`); `docs/mockup.html` (the `#th` toggle button, `aria-pressed`, `data-theme` attribute); `docs/01-planning.md` (existing `### Fnn` blocks for F01–F07, for format consistency); `.github/templates/feature-spec.template.md` and `feature-status.template.md`.

**Prompt/request:** Run `/plan-phase F08-Dark-Theme`, then "Go with all recommendation" in response to 5 clarifying questions about the first-run default, OS theme auto-detection, invalid-PUT-body handling, the toggle's accessible label, and cross-tab sync.

**AI response summary:** Detected FEATURE-CREATE mode for `F08-dark-mode` (the backlog's canonical slug). Verified preconditions (constitution ratified, Product planning and Architecture gates approved, F08 present in the backlog with an owner and a non-blocked status). Asked 5 clarifying questions, each with a recommended default: (1) `GET` returns `200`/`"light"` when no row exists yet, never 404; (2) no OS `prefers-color-scheme` auto-default, always start `light`; (3) invalid `PUT` body → `400 INVALID_THEME`; (4) the toggle's accessible label is state-aware rather than the mockup's static text (a declared U6 deviation); (5) live cross-tab sync is out of scope. The human accepted all five defaults. Generated `specs/features/F08-dark-mode/spec.md` (3 user stories, 10 acceptance criteria, 6 edge cases — EC26 plus 5 new AI-found cases, 3 applicable NFRs, 5 out-of-scope items, a Constitution Check table flagging the U6 label deviation, and a Clarifications log recording C-F08-01..05) and `status.md`.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** TODO(human)

**Outcome:** TODO(human)

**Iteration:** Single round — all 5 clarifying questions were accepted at their recommended default in one reply ("Go with all recommendation").

**Approx. time:** TODO(human)

**Learning:** TODO(human)
