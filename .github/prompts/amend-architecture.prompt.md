---
description: "Propose or apply a change to shared architecture artifacts (hld.md, data-model.md, er-diagram.md, component-map.json) with impact analysis and human approval. Usage: /amend-architecture propose <Fnn-slug> <summary>  |  /amend-architecture apply AMD-<nnn>  |  /amend-architecture reject AMD-<nnn>"
argument-hint: "propose <Fnn-slug> <summary> | apply AMD-nnn | reject AMD-nnn"
agent: architect
---

# /amend-architecture

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | architect |
| SDLC stage | Cross-cutting (only after the Architecture gate is approved) |
| Skills | `design-alternatives`, `component-resolution`, `evidence-logging`, `doc-sync-consistency` |
| Instructions | `specs-format`, `security` |
| Template | `amendment.template.md` |
| Output | `specs/architecture/amendments/AMD-<nnn>-<slug>.md`; on apply, updated `hld.md`, `data-model.md`, `er-diagram.md`, `component-map.json` |
| Rolls up to | `docs/02-design.md` (final position plus a `> Changed` note) |
| Next | Unblocked features resume `/design-feature` or `/build-feature` |

---

## Step 0: Detect the mode

| Mode | Input | What happens |
|---|---|---|
| PROPOSE | `propose <Fnn-slug> <summary>` | Draft the AMD, block the affected features, ask for a decision |
| APPLY | `apply AMD-<nnn>` | Update every listed shared artifact, then unblock |
| REJECT | `reject AMD-<nnn>` | Record the reason, unblock, the owner redesigns |
| STOP | Anything else | Show the usage and the list of open AMDs |

## Step 1: Check preconditions

| Check | Mode | If it fails |
|---|---|---|
| Backlog gate *Architecture* is approved | All | Stop: while architecture is a draft, edit it with `/architecture` (REVISE) |
| The raising feature exists and has an approved spec | PROPOSE | Stop and name the missing step |
| No open AMD already covers the same change | PROPOSE | Show the existing AMD and offer to extend it |
| The AMD exists with status `Proposed` and the human decision recorded as *Approve* (or *Modify* with the final text) | APPLY | Stop and ask for the decision |
| The AMD exists with status `Proposed` | REJECT | Stop and show its status |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/constitution.md` | Yes | Clauses the change could affect (A1–A4, S1–S5, P4) |
| `specs/architecture/hld.md`, `data-model.md`, `er-diagram.md`, `component-map.json` | Yes | Current versions and the exact sections that would change |
| The raising feature's `spec.md` and draft `lld.md` | PROPOSE | The need: the AC that the current architecture can't satisfy |
| Every `specs/features/*/spec.md`, `lld.md`, `tasks.md`, `status.md` | Yes | Features that use the affected entity, component, or command (impact) |
| Code under the affected component paths | If built | Code and stored data that would need to change or migrate |
| `docs/02-design.md` | APPLY | Sections to update to the final position |
| The AMD file | APPLY, REJECT | The proposal, alternatives, decision, and listed artifacts |

## Step 3: Build the context brief

1. **Need:** the requirement or AC, quoted, and why the current design can't meet it.
2. **Minimal change:** the smallest change per artifact.
3. **Impact:** each feature affected (spec, LLD, code, tests), existing data (migration), and commands.
4. **Alternatives:** at least the amendment and "solve inside the feature without an amendment".
5. **Constitution risk:** the clauses touched.

## Step 4: Clarify and preview

Ask **≤5 questions** only where the need or migration is unclear (for example "Should existing rows get a default value?"). Then show the preview and **wait for `GO`**:

```
AMENDMENT PREVIEW   (mode: PROPOSE | APPLY | REJECT)
AMD-<nnn>: <title>, raised by <Fnn> (<owner>)
Need: <quoted AC> is not possible because <reason>
Change per artifact: data-model <v→v+1: …> · er-diagram <…> · component-map <…> · hld <…>
Alternatives: A amend <pros/cons> · B within the feature <pros/cons>. Recommendation: <…>
Impact: features <ids: what changes> · data migration <…> · commands <…>
Planned actions: <files created or updated; features blocked or unblocked>
Reply GO to proceed.
```

## Step 5: Execute

**PROPOSE**
1. Create `AMD-<next nnn>-<slug>.md` from the template: problem, change per artifact (current → proposed), ≥2 alternatives, impact analysis, constitution check. Leave *Decision* as `TODO(human)`.
2. Set every blocked feature's `status.md` (and backlog row) to `blocked-on-AMD-<nnn>`.
3. Ask the human to decide: Approve, Reject, or Modify, with a reason. Record it verbatim.

**APPLY**
1. Update each listed artifact exactly as decided. Bump the version headers (`hld.md`, `data-model.md`, and `er-diagram.md` stays equal to the data model) and the `version` in `component-map.json`. Add change-log rows that reference the AMD.
2. Fill in the AMD *Application Record* and set the status to `Applied`.
3. Unblock the features (restore their previous status) and tell each owner which `lld.md`, `tasks.md`, code, or tests must change.
4. Update `docs/02-design.md` to the final position and add `> Changed <date>: <what> (see AMD-<nnn>)`.

**REJECT**
1. Record the human's reason, and set the status to `Rejected`.
2. Return the blocked features to their previous status. The owner redesigns within the current architecture.

## Step 6: Validate

- [ ] PROPOSE: the AMD has a quoted need, ≥2 alternatives, impact per feature, a migration note, and a constitution check.
- [ ] PROPOSE: every impacted feature is `blocked-on-AMD-<nnn>` in both `status.md` and the backlog.
- [ ] APPLY: every artifact listed in the AMD §2 was changed, and nothing else was.
- [ ] APPLY: versions are bumped; data-model and ER diagram versions match; the JSON is valid.
- [ ] APPLY: `/sync-check` C2, C4, C8, and C12 pass (report the actual results).
- [ ] APPLY: `docs/02-design.md` shows the final position and has the `> Changed` note.
- [ ] REJECT: the reason is recorded verbatim, and features are unblocked.
- [ ] The human's decision is recorded verbatim; nothing was inferred.

## Step 7: Log evidence

Log every response in the raising feature's scope. The proposal and the decision are usually material: draft `E-design-<nn*100+seq>`.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE` of APPLY or REJECT, notify the owners and suggest their next command (`/design-feature <id>` to update the LLD).

## Critical rules

- Never edit shared architecture artifacts outside APPLY.
- Never apply an AMD without the human's recorded decision.
- Solving inside the feature without an amendment is always one of the alternatives.
