<!-- Filled by the evidence-logging skill. -->
### Evidence E-design-801

**SDLC activity:** design

**Task/feature:** Produce the low-level design for F08 Dark Mode — API contract, data access, UI states, security controls, and the design alternatives for where client theme state lives, how the first-paint flash is avoided, how a rapid-toggle race is resolved, and how the toggle icon is rendered.

**Context given to AI:** `specs/features/F08-dark-mode/spec.md` (approved, 10 AC, 6 EC); `specs/constitution.md`; `specs/architecture/hld.md` v3 (§4 project structure naming a `theme` store, §6.5 the theme flow, §7 UI flow, §8 error/security tables, §9 NFRs); `specs/architecture/data-model.md` v3 (`setting` table, `CHECK` constraints, INV-11); `specs/architecture/component-map.json` v1; `docs/mockup.html` (`#th` toggle, `moon`/`sun` icon paths); existing code in `app/api/src` (`app-error.js`, route/service/repository patterns) and `app/web/src/app` (`bookmarks.store.ts`'s request-token idiom, `icons.ts`'s single-`d`-string convention, `app.html`/`app.ts`); `specs/features/F07-delete-bookmark/lld.md` (precedent for AMD-003, applied inline during design).

**Prompt/request:** `/design-feature F08-dark-mode`.

**AI response summary:** Detected CREATE mode (no `lld.md` existed). Verified preconditions (Architecture gate approved, Planning approved, F08's spec components resolve in `component-map.json`). Loaded all required context in parallel. Identified one architecture-impact gap: `hld.md` §8's error table was missing `INVALID_THEME`, which `spec.md` C-F08-03/F08-AC6 already requires — the same situation AMD-003 resolved for `EDIT_CONFLICT`. Presented that as an AMD question (recommended: raise AMD-004, following the AMD-003 precedent) alongside four LD decisions, each with 2 options and a recommendation: LD-01 a new `theme.store.ts` (already named in `hld.md` §4); LD-02 an inline pre-paint `<script>` in `index.html`'s `<head>` to avoid a first-paint flash; LD-03 a monotonic request-token guard mirroring `bookmarks.store.ts`'s existing idiom, to resolve the rapid-toggle race (F08-AC8); LD-04 converting the mockup's `sun` icon into a single `d`-string path, mirroring the `search` icon's existing precedent. Asked for the human's choice on all five questions before writing anything.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** TODO(human)

**Outcome:** TODO(human)

**Iteration:** Single round — the human replied "accept all recommendation," accepting the AMD-004 proposal and LD-01…LD-04 at their recommended options in one reply.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
