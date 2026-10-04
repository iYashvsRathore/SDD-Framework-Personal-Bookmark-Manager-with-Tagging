---
description: "Initialize the SDD framework and create or amend the project constitution (non-negotiable principles, quality, security, UX/a11y, architectural and licensing rules). Usage: /constitution  or  /constitution amend <change>"
argument-hint: "[amend <proposed change>]"
agent: planner
---

# /constitution

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | planner |
| SDLC stage | 0: Initialization (once; later changes only through `amend`) |
| Skills | `evidence-logging` |
| Instructions | `specs-format`, `docs-format`, `evidence-format` |
| Templates | `constitution.template.md`, `backlog.template.md`, `01..06-*.template.md` |
| Output | `specs/constitution.md`, scaffolded `specs/` and `docs/`, `specs/backlog.md` (after approval) |
| Rolls up to | Nothing directly. Every later gate checks its output against the clauses. |
| Next | `/plan-phase app` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| INIT | `specs/constitution.md` does not exist | Scaffold folders and docs, clarify, draft v0.1.0 |
| REVISE | The file exists with `Status: draft`, or contains `<!-- REVISE: … -->` markers | Apply the human's markers and feedback to the draft, then re-validate |
| AMEND | Input starts with `amend` and the file has `Status: ratified` | Change-controlled amendment (Step 5B) |
| STOP | The file is ratified and there is no `amend` argument | Show version and ratified date, suggest `/constitution amend <change>`, end |

State the detected mode in the first line of the response.

## Step 1: Check preconditions

| Check | How to verify | If it fails |
|---|---|---|
| Running at the orchestrator root | `.github/copilot-instructions.md` exists at the workspace root | Stop: "Open the folder that contains `.github/` as the workspace root." |
| Templates present | `constitution.template.md`, `backlog.template.md`, and all six `0X-*.template.md` exist | Stop and list the missing templates |
| AMEND only: constitution is ratified | Header shows `Status: ratified` and version ≥ 1.0.0 | Tell the user the draft can be edited directly (REVISE) |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `.github/templates/constitution.template.md` | Yes | Clause groups and IDs (P, Q, S, U, A, D, E), governance table, compliance checklist |
| `.github/copilot-instructions.md` | Yes | Hard rules 1–9. The constitution restates them and must never contradict them. |
| `.github/seeds/*.seed.md` | If present | Fixed constraints (local, web, free/OSS, no external DB), NFR targets, security concerns, submission checklist |
| Requirement source in `docs/` (for example the assignment PDF) | If readable | Non-negotiables stated by the source, with section numbers |
| `specs/constitution.md` | REVISE, AMEND | Current clauses, version, amendment log, `<!-- REVISE -->` markers |
| `specs/**`, `docs/**` | AMEND | Every artifact that cites an affected clause ID (for impact analysis) |
| `${input}` | Yes | Stated preferences, constraints, or the amendment text |

If the requirement source can't be read, say so and continue with the seed. Never infer content from files you did not open.

## Step 3: Build the context brief

Compile these and show them in the preview:

1. **Fixed constraints:** from the source and seed, each with a citation.
2. **Default clauses:** template clauses that apply unchanged.
3. **Project-specific candidates:** clauses the seed implies but the template lacks (for example an SSRF rule for server-side title fetch). Each is marked *proposed*.
4. **Gaps:** values only the human can decide (see Step 4).
5. **Conflicts:** any request that contradicts a hard rule or a source constraint. Quote both sides and never resolve them silently.

## Step 4: Clarify and preview

**Gap categories** (ask only about real gaps):

- **Identity:** project name, one-line purpose, developer handle(s).
- **Quality bar:** coverage target and how it is measured; when a manual check is allowed instead of an automated test.
- **Security and privacy:** any additions beyond S1–S5.
- **UX and accessibility:** the target standard (for example WCAG 2.1 AA where practical).
- **Operating constraints:** OS, offline use, time box, availability during evaluation.
- **Governance:** who approves amendments (handle).

Ask **≤5 questions** in one message. Number them, and give each a recommended default and what the answer changes. Anything unanswered becomes `TODO(human)`; never assume it.

Then show the preview and **wait for `GO`**:

```
CONSTITUTION PREVIEW   (mode: INIT | REVISE | AMEND)
Understanding
- Project: <name> - <purpose>
- Fixed constraints: <list, each with its source citation>
Clauses
- Core principles: P1–P6 [+ proposed P7 <text>]
- Quality: Q4 coverage = <value>, measured by the tool chosen later in /technology
- Security additions: <none | S6 <text>>
- UX/a11y standard: <value>
- Architecture/operating additions: <none | A5 <text>>
- Left as TODO(human): <fields>
Planned actions
- Create missing folders: specs/, specs/evidence/, specs/features/, specs/architecture/amendments/, docs/assets/
- Create missing docs/01..06 from templates (existing docs untouched)
- Write specs/constitution.md  v0.1.0, Status: draft
- Append the interaction log; draft E-planning-00n if material
Reply GO to generate, or send corrections.
```

If the user sends corrections, update the brief and show the preview again.

## Step 5A: Generate (INIT or REVISE)

1. Create missing folders and docs. Never overwrite an existing doc.
2. Copy the template to `specs/constitution.md`. Set the project name, `Version: 0.1.0`, and `Status: draft`.
3. Keep P1–P6, Q1–Q5, S1–S5, U1–U4, A1–A4, D1–D3, and E1–E3. You may make them **stricter**, never weaker.
4. Add each approved project-specific clause with the next free ID in its group, and say how it is checked (test, review, or inspection).
5. Fill Q4 with the agreed value. Replace every `<…>` placeholder with a value or `TODO(human)`.
6. **Name no technologies** (languages, frameworks, databases, tools). If a constraint needs one, phrase it as a property (for example "embedded, file-based persistence") and leave the choice to `/technology`.
7. REVISE: apply each `<!-- REVISE: … -->` marker, remove it, and list what changed.
8. Remove the template's `<!-- GUIDE -->` comments once each section is filled.

## Step 5B: Amend (AMEND)

1. Show the current clause and the proposed text side by side.
2. Classify the change: MAJOR (a principle is removed or redefined), MINOR (a clause is added), or PATCH (wording only).
3. Impact analysis: search `specs/**`, `docs/**`, and the code for the clause ID. List each affected artifact and the change it needs.
4. Show the amendment preview and wait for `APPROVE`. Then apply it, bump the version, add a row to the amendment log, and list the `/sync-check` checks to run.

## Step 6: Validate

- [ ] Every clause has a unique ID and a stated way to check it (test, review, or inspection).
- [ ] No clause contradicts hard rules 1–9 or a source constraint.
- [ ] No technology product names appear.
- [ ] Q4 contains a number and a measurement method.
- [ ] A1–A4 and D1–D3 are present and no weaker than the template.
- [ ] The compliance checklist (section 9) covers every clause group, including new clauses.
- [ ] No `<…>` placeholders or GUIDE comments remain; unknowns are `TODO(human)`.
- [ ] The governance table has the initial row (INIT) or a new row (AMEND).
- [ ] All six `docs/0X-*.md` exist and have the exact mandatory headings (check C1).
- [ ] Only synthetic data: no real names, emails, or internal URLs.

Fix any failure before the gate. List anything you can't fix under *Open questions* in the Gate Summary.

## Step 7: Log evidence

Follow `evidence-logging` with scope `app`, phase `planning`, and IDs 001–099. Log every response. The exchange that shaped the non-negotiables is usually material: draft `E-planning-00n` and ask the human for their fields in one message.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- **INIT / REVISE:** set `Version: 1.0.0`, `Status: ratified`, and today's `Ratified` date. Create `specs/backlog.md` from the template and set its gate row *Constitution* to approved, with the date.
- **AMEND:** confirm the new version and the amendment-log row, and list the artifacts that still need updating.
- Suggest `/plan-phase app`.

## Critical rules

- The constitution holds principles and constraints only. Technology is decided in `/technology`.
- Never weaken a hard rule. If the user asks for that, quote the rule and ask.
- Never overwrite an existing doc, and never change a ratified constitution outside AMEND.
- Ask ≤5 questions per round. Write nothing before `GO`.

## Failure handling

| Situation | Action |
|---|---|
| Requirement source is unreadable | Continue with the seed and note the gap in the brief |
| User wants a technology choice in the constitution | Explain why it belongs elsewhere, offer a property-style clause, and note the preference for `/technology` |
| A request conflicts with a hard rule | Quote both, stop, and ask |
| The user answers only some questions | Proceed with `TODO(human)` for the rest, and list them in the Gate Summary |
