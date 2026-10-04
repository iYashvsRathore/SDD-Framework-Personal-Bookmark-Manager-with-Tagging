---
description: "Architecture phase (once, app-level). Produces HLD (structure, flows, UI flow, error-handling and security design, NFR approach), data model, Mermaid ER diagram and machine-readable component-map.json (monorepo or multi-repo), with at least 2 alternatives per key decision. Usage: /architecture"
argument-hint: "(no arguments)"
agent: architect
---

# /architecture

| Item | Value |
|---|---|
| Agent | architect |
| SDLC stage | 3: Architecture (once; later changes only through `/amend-architecture`) |
| Skills | `design-alternatives`, `secure-input-handling`, `accessibility-review`, `component-resolution`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `specs-format`, `security` |
| Templates | `hld.template.md`, `data-model.template.md`, `er-diagram.template.md`, `component-map.template.json` |
| Output | `specs/architecture/hld.md`, `data-model.md`, `er-diagram.md`, `component-map.json`; backlog *Components affected* |
| Rolls up to | `docs/02-design.md` → Proposed Solution, Data Model, UI / User Flow, Error Handling, Security Design, Meeting the Non-Functional Requirements, Alternatives & Trade-offs |
| Next | Parallel feature work: `/plan-phase <Fnn-slug>` per developer |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| CREATE | `specs/architecture/hld.md` does not exist | Full architecture |
| REVISE | The artifacts are `draft` or contain `<!-- REVISE -->` markers | Apply the feedback to every affected artifact and keep all four consistent |
| STOP | `hld.md` is approved | Explain that shared artifacts now change only through `/amend-architecture propose …`, and end |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| Constitution ratified; backlog gates *Product planning* and *Technology* approved | Stop and name the missing command |
| `specs/technology.md` §3 has the tooling commands | Stop: complete `/technology` |
| All four templates exist | Stop and list the missing ones |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/constitution.md` | Yes | A1–A4 (local, persistence, availability, component-map authority), S1–S5, U1–U4 |
| `specs/product-spec.md` | Yes | Requirements, features, NFR targets, cross-feature edge cases, risks |
| `specs/backlog.md` | Yes | Features and their dependencies (to map components) |
| `specs/technology.md` | Yes | Chosen stack, framework conventions (project layout, template engine escaping), tooling commands |
| `.github/seeds/*.seed.md` | If present | Security concerns (SSRF, XSS, injection), NFR details |
| The four templates | Yes | Required sections and fields |
| VS Code workspace folders and existing code folders | Yes | Monorepo vs. multi-root; existing paths the component map must respect |
| `specs/architecture/*` | REVISE | Current drafts and markers |

## Step 3: Build the context brief

1. **Candidate components:** id, type, responsibility, and which features touch each.
2. **Candidate entities:** from the requirement nouns (for example bookmark, tag, bookmark–tag link), with fields implied by the AC in the product spec.
3. **Flows to design:** one per requirement group (add with title fetch, list newest first, filter, search, edit, delete).
4. **Trust boundaries:** every untrusted input (submitted URL, fetched title, user title, tags, search text) and where it enters.
5. **NFR design levers:** indexes, pagination, write durability, keyboard and label strategy.
6. **Decisions that need alternatives:** `AD-01` style/layering, `AD-02` tag storage, `AD-03` title-fetch strategy, plus any others (duplicate policy, delete safeguard, search approach).
7. **Gaps and conflicts** for Step 4.

## Step 4: Clarify, present alternatives, preview

**Round 1: context questions (≤5).** Gap categories:

- Repository layout: monorepo, or multi-repo in a multi-root workspace (names of the workspace folders).
- Component granularity: one full-stack component, or separate UI and API.
- Local port, and where the data file lives.
- UI rendering, if `technology.md` leaves it open.
- Expected list size per page, if pagination is needed for NFR targets.

**Rounds 2+: alternatives (≤5 decisions per round), following `design-alternatives`:**

```
AD-0n <decision>
| Option | Complexity | Fit (req/NFR IDs) | Security | Testability | Change cost | Constitution |
|---|---|---|---|---|---|---|
| A | … | … | … | … | … | … |
| B | … | … | … | … | … | … |
Challenge: what breaks at 1,000 records, on fetch failure, on restart, with keyboard-only use?
Recommendation: <option>, because <ID>. Your choice?
```

**Preview**, then **wait for `GO`**:

```
ARCHITECTURE PREVIEW   (mode: <mode>)
Style: <style>; layout: <monorepo | multi-repo>
Components: <id (type) → workspaceRoot/path: responsibility>
Entities: <entity: key fields; unique and index constraints>
Decisions (human-selected): AD-01 <choice>, AD-02 <choice>, AD-03 <choice>, …
Trust boundaries: <input → controls>
NFR approach: <NFR ID → lever>
Planned actions
- Write hld.md, data-model.md, er-diagram.md (v1, draft); component-map.json (version 1)
- Update backlog "Components affected" for <feature ids>
Reply GO to generate, or send corrections.
```

## Step 5: Generate

1. **`hld.md`**
   - §1 context and quality goals (NFR IDs); §2 style with a Mermaid context diagram.
   - §3 component table (a copy of the JSON); §4 project structure tree per component.
   - §5 layers with responsibilities and *must not* rules.
   - §6 sequence diagrams for the key flows, including the guarded title fetch.
   - §7 UI flow (Mermaid) covering every screen, plus the empty, error, and confirmation states.
   - §8 validation strategy, error-handling strategy (error shape, user messages, logging), trust-boundary table (`secure-input-handling`), dependency safety.
   - §9 NFR approach per NFR ID; §10 AD decisions; §11 constitution compliance; §12 clarifications; §13 change log.
2. **`data-model.md`:** entities, fields with types and constraints, relationships, indexes (each tied to a feature or NFR), invariants (for example a unique normalized URL), restart survival (medium, location, durability, schema creation on startup, backup), and synthetic seed data.
3. **`er-diagram.md`:** a Mermaid `erDiagram` with exactly the entities, fields, keys, and cardinalities of `data-model.md`, and the same version number.
4. **`component-map.json`:** from the template. Set `repoLayout`, and for every component `id`, `name`, `type`, `workspaceRoot`, `path`, `repo` (`null` for monorepo; a synthetic placeholder URL for multi-repo), `language`, `framework`, `dependsOn`, `dataStore`, `commands` (copied **exactly** from `technology.md` §3), and `smoke` (`baseUrl`, ≥1 check, `startupTimeoutSeconds`).
5. **Backlog:** fill *Components affected* for every feature with ids only.
6. REVISE: apply each marker in every artifact it touches, keep all four consistent, and list what changed.

## Step 6: Validate

**HLD**
- [ ] Every requirement maps to ≥1 flow or component. Every NFR has a design approach in §9.
- [ ] The trust-boundary table covers the submitted URL, fetched title, user title, tags, and search text.
- [ ] The error-handling strategy covers invalid or empty URL, duplicate URL, title-fetch failure, not found, storage failure, and empty states.
- [ ] The UI flow covers every screen, with empty, error, and confirmation states.
- [ ] ≥2 AD decisions, each with ≥2 options, a human selection, and the accepted trade-off.

**Data model and ER diagram**
- [ ] Every field has a type and constraints. Uniqueness on the normalized URL is enforced at the data level.
- [ ] The indexes support the performance NFR (search, filter, newest-first sort).
- [ ] The restart-survival section is complete.
- [ ] The ER diagram matches the data model exactly (entities, fields, keys, cardinalities), with the same version.

**Component map**
- [ ] Valid JSON. Every component has `id`, `type`, `workspaceRoot`, `path`, and `commands`.
- [ ] The commands equal `technology.md` §3 exactly. `smoke` has a `baseUrl` and ≥1 check.
- [ ] No overlapping paths within one workspace root. Every `dependsOn` id exists.
- [ ] Multi-repo: each `workspaceRoot` names a workspace folder, and each repo URL is a synthetic placeholder.
- [ ] The hld §3 table equals the JSON (`component-resolution`, validation mode).

**Cross-artifact**
- [ ] Backlog *Components affected* ids all exist in the JSON.
- [ ] The constitution compliance table covers A1–A4, S1–S5, and U1–U4.
- [ ] No placeholders or GUIDE comments remain. Only synthetic URLs and data.

## Step 7: Log evidence

Log every response. Each alternatives round that led to a human choice (AD-nn), and each security or NFR design that changed after a challenge, is usually material: draft `E-design-00n` and ask the human for their fields.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- Set all four artifacts to `approved`, and mark backlog gate *Architecture* as approved with the date.
- Roll up into `docs/02-design.md`: Proposed Solution (architecture, project structure, components), Data Model (with the ER diagram and restart survival), UI / User Flow, Error Handling, Security Design, Meeting the Non-Functional Requirements, Alternatives & Trade-offs (AD decisions), and AI Interactions.
- Announce that **features can now be developed in parallel**. Each developer claims a backlog row and runs `/plan-phase <Fnn-slug>`.

## Critical rules

- The human chooses every AD decision. Never skip the alternatives step.
- `component-map.json` is authoritative. The HLD table is a copy of it.
- After approval, these files change only through `/amend-architecture`.
- Write nothing before `GO`.
