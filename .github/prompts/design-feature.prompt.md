---
description: "Feature design phase: low-level design (LLD) for one feature with at least 2 alternatives, API contract, validation, error handling, UI states, security controls, sequence diagram, and an incremental task list. Never edits shared architecture; proposes AMD instead. Usage: /design-feature <Fnn-slug>"
argument-hint: "Fnn-slug"
agent: architect
---

# /design-feature

**Feature:** ${input}

| Item | Value |
|---|---|
| Agent | architect |
| SDLC stage | 4b: Feature design (LLD), per feature |
| Skills | `design-alternatives`, `component-resolution`, `secure-input-handling`, `accessibility-review`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `specs-format`, `security` |
| Templates | `lld.template.md`, `task-list.template.md`, `amendment.template.md` (only if needed) |
| Output | `specs/features/<id>/lld.md`, `tasks.md` (or an AMD proposal and a blocked status) |
| Rolls up to | `docs/02-design.md` → `### Fnn` blocks in UI / User Flow, Error Handling, Security Design, Alternatives & Trade-offs; a Design Verification line |
| Next | `/build-feature <id>` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| CREATE | `lld.md` does not exist | Full LLD and task list |
| REVISE | `lld.md` is `draft` or contains `<!-- REVISE -->` markers | Apply the feedback; regenerate the affected tasks |
| RESUME-AFTER-AMD | `status.md` was `blocked-on-AMD-<nnn>` and that AMD is now `Applied` or `Rejected` | Re-read the architecture; update the LLD to the new (or unchanged) position |
| CHANGE | `lld.md` is approved and the spec changed or the user asks for a change | Impact on tasks, code, and tests → re-approval |
| STOP | `status.md` is `blocked-on-AMD-<nnn>` and the AMD is still `Proposed` | Show the AMD and wait for its decision |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| Backlog gate *Architecture* is approved | Stop: run `/architecture` |
| `status.md` shows Planning approved | Stop: run `/plan-phase <id>` |
| Every *Components affected* id in `spec.md` exists in `component-map.json` | Stop: fix the spec with `/clarify <id>`, or propose an AMD |
| Dependency features are at least `designed` (for interfaces this feature consumes) | Warn and list them; continue only if the human confirms |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/features/<id>/spec.md` | Yes | Stories, AC, edge cases, NFR IDs, out-of-scope items, clarifications |
| `specs/constitution.md` | Yes | S1–S5, U1–U4, P4, P5 |
| `specs/technology.md` | Yes | Framework conventions, template-engine escaping, test tooling (for test hooks) |
| `specs/architecture/hld.md` | Yes | Layers and *must not* rules, the flows and screens this feature extends, error-handling strategy, trust boundaries |
| `specs/architecture/data-model.md` | Yes | Entities, fields, constraints, and indexes the feature may use (the LLD may not invent new ones) |
| `specs/architecture/component-map.json` | Yes | Resolved paths and commands for the affected components |
| Dependency features' `lld.md` | If present | Interfaces and functions to reuse; routes and names already taken |
| Existing code under the resolved paths | If present | Current files, functions, and patterns to extend instead of duplicating |
| `specs/features/<id>/lld.md`, `tasks.md` | REVISE, RESUME, CHANGE | The current design and task states |

## Step 3: Build the context brief

1. **AC-to-design map:** each AC and edge case → the layer and component that will satisfy it.
2. **Reuse:** existing functions, routes, and views to extend.
3. **Data use:** entities and fields read or written. Anything missing → an **architecture-impact candidate**.
4. **Untrusted inputs** in this feature, and the controls the HLD requires for each.
5. **UI states** needed: loading, empty, error, success, and confirmation.
6. **Key decisions** needing alternatives (`LD-nn`). For example: the duplicate-URL behavior, the delete safeguard, synchronous vs. background title fetch, where tag parsing lives.
7. **Gaps** for Step 4.

## Step 4: Clarify, present alternatives, preview

Ask **≤5 questions** about real gaps (user messages, limits, routes, focus behavior). Present each `LD-nn` with ≥2 options (`design-alternatives` table and challenge). The human chooses.

If the brief found an architecture-impact candidate, say so first. Offer "solve inside the feature" vs. "propose AMD". Continue into `/amend-architecture propose` only if the human chooses the AMD.

Then show the preview and **wait for `GO`**:

```
LLD PREVIEW   (mode: <mode>, feature: <id>)
Decisions (human-selected): LD-01 <choice>, LD-02 <choice>
Component changes: <component id → resolved path/file (new|changed): responsibility>
Contract: <method route/function → input → success → errors>
Validation: <field: rule → message> · Errors: <condition → user feedback>
UI states: <view: loading / empty / error / success; a11y notes>
Security: <input → control (clause)>
Tasks: Fnn-T01 <…> (covers AC…) … Fnn-Tnn
Architecture impact: none | AMD proposed
Planned actions: write lld.md and tasks.md (draft); update status.md
Reply GO to generate, or send corrections.
```

## Step 5: Generate

1. **`lld.md`**, from the template:
   - header versions (spec, HLD, data model, component map) and components affected
   - §1 overview; §2 LD decisions (≥2 options, human decision, trade-off)
   - §3 component changes with **resolved** paths and files
   - §4 the API or interface contract, with every error response
   - §5 data access: existing entities only; parameterized queries described
   - §6 UI states with a11y notes (`accessibility-review`)
   - §7 validation rules with the exact user messages; §8 the error-handling table
   - §9 security controls (`secure-input-handling`), each with its clause ID
   - §10 a Mermaid sequence diagram; §11 test hooks (seams for stubbing, such as the title fetcher)
   - §12 architecture impact; §13 constitution check; §14 change log
2. **`tasks.md`**, from the template: ordered, small tasks `Fnn-T01…`. Each names one component, its files, the AC it covers, and a concrete *Done when*. Each task leaves the app buildable and runnable (P5). The first task of the project's first feature is the scaffold task, if component folders don't exist yet.
3. **Architecture impact:** if an AMD was chosen, run the propose flow, set `status.md` to `blocked-on-AMD-<nnn>`, save the LLD as a draft, and stop at the gate.
4. REVISE, RESUME, CHANGE: update the affected sections and tasks, add change-log rows, and list the code or tests to revisit.

## Step 6: Validate

- [ ] Every AC and every edge case in `spec.md` maps to an LLD section **and** to ≥1 task.
- [ ] ≥1 LD decision with ≥2 options, a human selection, and the accepted trade-off.
- [ ] Every file in §3 and `tasks.md` sits under a path resolved from `component-map.json`.
- [ ] §5 uses only entities and fields that exist in `data-model.md`. Anything new has gone through an AMD.
- [ ] The contract lists the success and error responses for every operation.
- [ ] Every validation rule has an exact user-facing message.
- [ ] Every untrusted input has a control that cites a constitution clause.
- [ ] UI states cover loading, empty, error, and success, with keyboard and label notes. A destructive action has a confirmation or undo (U4).
- [ ] The sequence diagram matches the contract.
- [ ] Every task has a component, files, AC, and a *Done when*; tasks are ordered by dependency.
- [ ] Header versions match the current shared artifacts. No placeholders or GUIDE comments remain.

## Step 7: Log evidence

Log every response in the feature scope. Choosing between alternatives, and challenges that changed the design, are usually material: draft `E-design-<nn*100+seq>` and ask the human for their fields.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- In `status.md`, mark Design approved; set the backlog status to `designed`.
- Roll up into `docs/02-design.md`: `### Fnn <Title>` blocks in UI / User Flow, Error Handling, Security Design, and Alternatives & Trade-offs; a coverage line in Design Verification (Fnn AC → LLD sections); AI Interactions.
- Offer the handoff to the builder (`/build-feature <id>`).

## Critical rules

- Never edit shared architecture files. Changes to them go through an AMD.
- Never write application code.
- The human chooses every LD decision.
- Write nothing before `GO`.
