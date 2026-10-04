---
description: "Planning phase. '/plan-phase app' = product-level problem understanding, requirements, feature backlog, NFRs, risks. '/plan-phase <Fnn-slug>' = feature spec with user stories, testable acceptance criteria, edge cases, effort. Ends with a human gate and rollup to docs/01-planning.md."
argument-hint: "app | Fnn-slug"
agent: planner
---

# /plan-phase

**Scope:** ${input}

| Item | Value |
|---|---|
| Agent | planner |
| SDLC stage | 1: Product planning (`app`, once) · 4a: Feature planning (`Fnn-slug`, per feature) |
| Skills | `requirements-analysis`, `edge-case-discovery`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `specs-format`, `docs-format`, `evidence-format` |
| Templates | `product-spec.template.md`, `backlog.template.md` (app) · `feature-spec.template.md`, `feature-status.template.md` (feature) |
| Output | `specs/product-spec.md`, `specs/backlog.md` rows (app) · `specs/features/<id>/spec.md`, `status.md`, `evidence/` (feature) |
| Rolls up to | `docs/01-planning.md` |
| Next | `/technology` (app) · `/design-feature <id>` (feature) |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| APP-CREATE | Scope `app` and `specs/product-spec.md` does not exist | Full product breakdown |
| APP-REVISE | Scope `app` and the product spec is `draft` or has `<!-- REVISE -->` markers | Apply the feedback and re-validate |
| APP-CHANGE | Scope `app`, the product spec is approved, and the user asks for a change | Impact analysis on features, architecture, docs → re-approval |
| FEATURE-CREATE | Scope `Fnn-slug` and `spec.md` does not exist | Feature stories, AC, edge cases |
| FEATURE-REVISE | `spec.md` is `draft` or has REVISE markers | Apply the feedback and re-validate |
| FEATURE-CHANGE | `spec.md` is approved and the user asks for a change | Impact on `lld.md`, `tasks.md`, code, and tests → re-approval |
| STOP | Approved, and no change was requested | Show the status and suggest `/clarify <scope>` or the next command |

## Step 1: Check preconditions

| Check | Applies to | If it fails |
|---|---|---|
| The constitution is ratified | Both | Stop: run `/constitution` |
| The backlog gate *Product planning* is approved | Feature | Stop: run `/plan-phase app` |
| The backlog gate *Architecture* is approved | Feature | Warn. Continue only if the human confirms, and leave *Components affected* as `TBD` |
| The feature ID exists in `specs/backlog.md` | Feature | Stop and list the backlog IDs, or offer APP-CHANGE to add the feature |
| The owner column is filled | Feature | Ask for a pseudonymous handle (for example `dev-2`) and fill it in |
| The feature status is not `blocked-*` | Feature | Stop and show the blocker |

## Step 2: Load context

**App scope**

| Source | Required | What to extract |
|---|---|---|
| `specs/constitution.md` | Yes | Constraints on scope (A1–A4), quality bars (Q1–Q5), UX rules (U1–U4) |
| `.github/seeds/*.seed.md` | If present | Requirements R01–R11, constraints, suggested feature split, seed edge cases, NFR targets, security concerns |
| Requirement source in `docs/` | If readable | Exact requirement wording and section numbers (cite them) |
| `docs/01-planning.md` | Yes | Existing content that must not be lost |
| `specs/product-spec.md` | REVISE, CHANGE | The current version, clarifications, and change log |

**Feature scope**

| Source | Required | What to extract |
|---|---|---|
| `specs/product-spec.md` | Yes | The feature's requirement rows, NFRs, cross-feature edge cases, risks |
| `specs/backlog.md` | Yes | Feature row: requirements, dependencies, owner |
| Dependency features' `spec.md` | If present | Behaviors they already own (avoid overlap), interfaces this feature relies on |
| `specs/architecture/hld.md` §6–7 | If approved | Flows and screens this feature belongs to |
| `specs/architecture/data-model.md` | If approved | Entities and fields, so AC describe realistic stored state |
| `specs/architecture/component-map.json` | If approved | Valid component ids for *Components affected* |
| Other features' `spec.md` | Yes | Scope boundaries; edge cases already claimed |
| `docs/01-planning.md` | Yes | Existing `### Fnn` blocks and the merged edge-case list |

## Step 3: Build the context brief

**App scope**

1. **Requirement inventory:** each R-ID with its source wording and citation.
2. **Constraints:** from the constitution and the source.
3. **Candidate feature split:** features, the requirements each covers, dependencies, effort.
4. **NFR candidates:** category, target, measurement method, and source (seed or proposed).
5. **Known edge cases:** from the seed or source, plus AI-discovered ones (tagged honestly).
6. **Gaps and conflicts** for Step 4.

**Feature scope**

1. **Requirement slice:** the R-IDs this feature covers, fully or partially, for cross-cutting requirements.
2. **Boundaries:** what this feature owns vs. what its neighbors own (for example, is tag entry on the Add form owned by F01 or F02?).
3. **Relevant NFRs and cross-feature edge cases.**
4. **Entities and components touched.**
5. **Gaps and conflicts** for Step 4.

## Step 4: Clarify and preview

**Gap categories:**

- App: target user; ambiguous requirement wording (for example, what happens when an automatic title fetch fails); optional enhancements in or out; NFR target values; feature granularity; owner handles.
- Feature: observable behavior (the messages, limits, and ordering the user sees); scope boundaries with other features; out-of-scope items; behavior on failure.

Ask **≤5 questions** per round, each with a recommended default and its impact. Then show the preview and **wait for `GO`**.

```
PLANNING PREVIEW   (mode: <mode>, scope: <app | Fnn-slug>)
Understanding
- Problem / feature goal: <one line>
- Requirements covered: <R-IDs, each with its source citation>
Planned content
- App: features <F01..Fnn, with deps and effort> · NFRs <IDs and targets> · edge cases <count; source split> · risks/assumptions/questions <counts>
- Feature: stories <IDs, one line each> · AC <IDs, one line each> · edge cases <IDs> · NFRs <IDs> · out of scope <items> · components <ids | TBD> · effort <S/M/L>
- Left as TODO(human) or open questions: <items>
Planned actions
- Create/update: <files>
- Backlog: <rows added or status changes>
Reply GO to generate, or send corrections.
```

## Step 5: Generate

**App scope**

1. Write `specs/product-spec.md` from the template (Version 1, `Status: draft`, constitution version).
2. §1 Problem Understanding: the problem, a synthetic persona, and the value delivered.
3. §2 Functional Requirements: R-IDs with the source wording and citation. Don't add requirements the source lacks; list nice-to-haves as *Optional enhancements (deferred)*.
4. §3 Breakdown: features with covered requirements, dependencies, effort (S/M/L with a one-line reason), and a Mermaid dependency graph.
5. §4 NFRs: each with a category, a number, a data volume, and a measurement method. Cover performance, reliability/persistence, usability/accessibility, and security.
6. §5 Cross-feature edge cases (`edge-case-discovery`), each with its source tag.
7. §6 Risks, assumptions, and questions: impact, mitigation or answer, and status.
8. Fill the `specs/backlog.md` rows: ID, title, requirements, dependencies, owner (if known), status `not-started`, folder. *Components affected* = `TBD`.

**Feature scope**

1. Create `specs/features/<id>/` with `spec.md`, `status.md`, and `evidence/` from the templates.
2. Header: requirements covered, components affected (valid ids, or `TBD`), dependencies, constitution version.
3. §1 User stories: `Fnn-US<n>`, each in the form *As a… I want… so that…*.
4. §2 AC: `Fnn-AC<n>` in Given/When/Then form with an **observable** outcome (UI text, HTTP status, or stored state).
5. §3 Edge cases, each with its expected behavior and an honest source tag.
6. §4 Applicable NFRs by ID, and how each applies.
7. §5 Out of scope, including deferred enhancements and behaviors other features own.
8. §6 Effort and risks. §7 Clarifications (from Step 4). §8 Constitution check.
9. REVISE / CHANGE: apply the markers or the change, and add a change-log row. CHANGE: list the downstream artifacts (`lld.md`, `tasks.md`, code, tests) that must be revisited.

## Step 6: Validate

**App scope**

- [ ] Every requirement maps to ≥1 feature, and every feature maps to ≥1 requirement.
- [ ] Every requirement cites its source. None are invented. Optional enhancements are marked deferred.
- [ ] The feature dependency graph has no cycles, and effort values have reasons.
- [ ] Every NFR has a number, a data volume where relevant, and a measurement method. Performance, reliability, accessibility, and security are covered.
- [ ] Edge cases carry honest source tags (`assignment`, `AI`, `human`).
- [ ] Every risk has an impact and a mitigation. Every assumption is explicit and reversible.
- [ ] The backlog rows match the product-spec features exactly.
- [ ] Constitution check passes. No `<…>` placeholders or GUIDE comments remain.

**Feature scope**

- [ ] ≥1 user story. Every story has ≥1 AC.
- [ ] Every AC is Given/When/Then with an observable outcome. No vague words ("works", "fast", "properly", "user-friendly").
- [ ] Every covered requirement has ≥1 AC. AC IDs are unique.
- [ ] Every edge case has an expected behavior and a source tag, and maps to an AC or is marked "to test".
- [ ] Applicable NFRs are referenced by ID.
- [ ] *Components affected* ids exist in `component-map.json` (or are `TBD` with human consent).
- [ ] No overlap with another feature's AC (boundaries are stated in Out of Scope).
- [ ] Constitution check table filled. No placeholders remain.
- [ ] Report the running app-wide totals: user stories (target ≥4) and edge cases (target ≥6).

## Step 7: Log evidence

Log every response (`evidence-logging`). App scope uses IDs `E-planning-001..099`; feature scope uses `E-planning-<nn*100+seq>`. Breaking down requirements, finding edge cases, and settling NFR targets are usually material. Ask the human for their fields in one message per record.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- **App:** set the product spec to `approved`, and mark backlog gate *Product planning* as approved with the date. Roll up into `docs/01-planning.md`: Problem Understanding, Requirement Breakdown, Edge Cases (app-level), Non-Functional Requirements, Risks, Assumptions & Questions, and AI Interactions. Next: `/technology`.
- **Feature:** in `status.md`, mark Planning approved; set the backlog status to `planned`. Roll up into `docs/01-planning.md`: a `### Fnn <Title>` block in User Stories & Acceptance Criteria; merge the edge cases (deduplicated); AI Interactions; and a line in Planning Outcome saying what changed after AI input. Offer the handoff to the architect (`/design-feature <id>`).

## Critical rules

- Plan only. No design decisions, technology choices, or code.
- Never invent requirements, stakeholder statements, or targets. Unknowns become questions.
- Never edit another developer's feature folder.
- Ask ≤5 questions per round. Write nothing before `GO`.
