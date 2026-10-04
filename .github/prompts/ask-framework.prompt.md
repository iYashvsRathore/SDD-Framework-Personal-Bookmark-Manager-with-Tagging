---
description: "Answer questions about the SDD framework and your progress in it: where am I, what should I run next, how does a phase or command work, which features are implemented, and how far a feature has got (spec drafted, LLD approved, tasks in build, tested, reviewed). Read-only. Usage: /ask-framework <question>"
argument-hint: "<question, e.g. 'where is F02?' or 'what do I run next?' or 'how does /design-feature work?'>"
agent: agent
tools: [read, search, edit, todo]
---

# /ask-framework

**Question:** ${input}

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | Cross-cutting (read-only Q&A) |
| Skills | `doc-sync-consistency` (only to notice drift, never to fix it) |
| Answers from | `.github/**` (how the framework works) and `specs/**`, `docs/**` (where you are) |
| Output | An answer in chat. The only file written is one interaction-log line. |
| Not for | Questions about the application's behavior or code (use `/ask-project`). For the full readiness dashboard, use `/status`. |

---

## Step 0: Detect the mode

Classify the question. State the mode in the first line of the response, for example `Mode: FEATURE-PROGRESS (F02-tags)`. If one question spans two modes, answer both, in the order below.

| Mode | Detected when the question asks… | Example |
|---|---|---|
| WHERE-AM-I | the overall position of the project | "Where are we?", "What's done so far?" |
| NEXT | which command to run next, for me or for a feature | "What should I run next?", "What's next for F03?" |
| FEATURE-PROGRESS | how far one feature has got | "Is the F02 spec created?", "Has F01's LLD been approved?" |
| INVENTORY | which features are in which state | "Which features are implemented?", "What's blocked?" |
| HOW | how a phase, command, gate, artifact, or rule works | "How does /build-feature work?", "What's the difference between GO and APPROVE?" |
| NOT-STARTED | `specs/constitution.md` doesn't exist | Answer HOW questions normally. For progress questions, say nothing has started and recommend `/constitution`. |

If the question is empty, answer as WHERE-AM-I plus NEXT.

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| The question is about the framework or progress, not the app | Say so in one line and suggest `/ask-project <question>`. Answer any framework part. |
| A named feature id (`Fnn` or `Fnn-slug`) matches a row in `specs/backlog.md` or a folder under `specs/features/` | List the known feature ids and ask which one was meant |
| A named command matches a file in `.github/prompts/` | List the available commands and ask which one was meant |

A missing artifact never stops this workflow. It is part of the answer ("no LLD yet").

## Step 2: Load context (read only what the mode needs)

| Source | Modes | What to extract |
|---|---|---|
| `.github/copilot-instructions.md` | HOW, NEXT | Workflow order, step anatomy, gate format, hard rules, Definition of Done |
| `.github/prompts/<command>.prompt.md` | HOW | Modes, preconditions, inputs, outputs, validation, next command |
| `.github/agents/*.agent.md`, `.github/skills/*/SKILL.md`, `.github/instructions/*` | HOW (when asked) | Who does what, what's enforced, and where |
| `README.md` | HOW | The overview and the worked example (illustrative only, never progress) |
| `specs/backlog.md` | All progress modes | App gate table; feature rows (owner, status, dependencies) |
| `specs/features/<id>/status.md` | FEATURE-PROGRESS, INVENTORY, NEXT | Phase rows, gate dates, blockers, open TODO(human) |
| The existence and header `Status:` of `spec.md`, `lld.md`, `tasks.md` | FEATURE-PROGRESS | Draft vs. approved artifacts. Unresolved `<!-- REVISE -->` markers. |
| `tasks.md` task table and Build-Verify Log | FEATURE-PROGRESS | Tasks done / total, the current task, attempts on a blocked task |
| `docs/04-testing.md` Test Matrix, `docs/05-review.md` Findings (feature rows) | FEATURE-PROGRESS, INVENTORY | Pass / fail / not-run counts; open findings |
| `docs/03-build.md` Feature Evidence Matrix | INVENTORY | Requirement-level status |
| `specs/architecture/amendments/AMD-*.md` | All progress modes | Open amendments that block features |

Never treat the existence of source code as proof that a feature is implemented. Progress comes from gates and status files.

## Step 3: Build the answer brief

Place each feature in scope on this ladder. Use the **highest rung whose evidence exists**. Where two sources disagree, note the conflict (for example "`status.md` says designed, but `lld.md` is still `Status: draft`").

| Rung | Label | Evidence |
|---|---|---|
| 0 | Not planned | Backlog row only, or no folder under `specs/features/` |
| 1 | Spec drafted | `spec.md` exists with `Status: draft` |
| 2 | Spec approved | `status.md` Planning row is approved with a date |
| 3 | LLD drafted | `lld.md` exists with `Status: draft`, or `blocked-on-AMD-nnn` |
| 4 | Design approved | Design row approved. `tasks.md` has a task table. |
| 5 | Build in progress | At least 1 task is `done` or `in-progress` (report n / m) |
| 6 | Built | Build row approved. Every task is `done`. |
| 7 | Tested | Testing row approved (report pass / fail / not-run) |
| 8 | Reviewed | Review row approved (report open findings) |
| 9 | Done | `status.md` current status is `done` |

A blocker (`blocked-on-AMD-nnn`, `blocked-on-human`) is reported next to the rung, with its reason.

**NEXT rules** (the first rule that matches wins):

| Condition | Recommend |
|---|---|
| No constitution | `/constitution` |
| An app gate before Architecture is pending | That gate's command (`/plan-phase app`, `/technology`, `/architecture`) |
| A draft artifact has `<!-- REVISE -->` markers or is waiting for APPROVE | Re-run the owning command to finish the gate |
| The feature is `blocked-on-AMD-nnn` | `/amend-architecture apply AMD-nnn` or `reject AMD-nnn` (a human decision) |
| The feature is `blocked-on-human` | The decision named in the Build-Verify Log, then `/build-feature Fnn-slug Fnn-Txx` |
| The feature is at rung 0–8 | The command for the next rung. Check dependencies first: a feature whose dependencies aren't at rung 6 or higher should wait. |
| Evidence has `TODO(human)` | `/log-evidence complete E-<phase>-<n>` (mention it; don't let it block the next phase) |
| Every feature is done and the app gates are pending | `/test-phase app` → `/review-phase app` → `/sync-check` → `/reflect` |

For HOW questions, collect: the purpose, when to run it, its preconditions, the modes, what it reads, what it writes, the gate, and the next command. Take them from the prompt file itself, not from memory.

## Step 4: Clarify (only if needed)

Ask only when the question can't be answered without a choice (for example, two features match "tags"). Ask ≤2 questions, each with a recommended default. There is no execution preview and no `GO`, because nothing is written except the log line.

## Step 5: Answer

Use this shape. Keep it short, and link every fact to its file.

```
Mode: <mode>

**Answer:** <1–3 sentences that directly answer the question>

<Only when useful: a short table, for example the feature × rung table for INVENTORY,
or Purpose / Reads / Writes / Gate / Next for HOW>

**Based on:** <file links with line numbers>
**Conflicts noticed:** <none | each conflict, and "run /sync-check">
**Next:** <command(s) with arguments, and who runs them if owners differ>
```

For long HOW questions, answer the question asked and point to the prompt file for the full procedure. Don't repeat the whole prompt.

## Step 6: Validate

- [ ] The mode is stated on the first line.
- [ ] Every progress claim cites a status, spec, or doc file that was read in this run.
- [ ] Rungs follow the ladder. Code alone was never counted as "implemented".
- [ ] Every HOW answer matches the current prompt, agent, or skill file, not an earlier version.
- [ ] The Next command exists in `.github/prompts/` and its preconditions are met, or the unmet ones are named.
- [ ] Conflicts are reported, not resolved. No file was changed except the log.
- [ ] The README worked example was not presented as real progress.

## Step 7: Log

If `specs/evidence/` exists, append one line to `specs/evidence/interaction-log.jsonl` with `"command":"/ask-framework"` and `"material": false`. If `specs/` doesn't exist yet (NOT-STARTED), don't create it. Say that logging starts after `/constitution`.

## Critical rules

- Read-only. Never approve a gate, change a status, fix drift, or run build or test commands.
- Never guess progress. If the file that would prove a state doesn't exist, say it doesn't exist.
- `status.md` and `backlog.md` are the progress records. Where they disagree with artifact headers, report both.
- Keep the answer about the framework and progress. Route questions about the application to `/ask-project`.
