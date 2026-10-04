---
description: "Build phase for one feature: implement tasks one at a time into component-map paths, then format, lint, build, start, smoke-check and run tests after each task, auto-fixing up to 3 attempts before stopping. Records plan vs actual, troubleshooting, Feature Evidence Matrix. Usage: /build-feature <Fnn-slug> [Fnn-Txx]"
argument-hint: "Fnn-slug [Fnn-Txx to start from]"
agent: builder
---

# /build-feature

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | builder |
| SDLC stage | 4c: Build, per feature |
| Skills | `component-resolution`, `build-verify-loop`, `secure-input-handling`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `coding-standards`, `security`, `testing-standards` (for any tests touched) |
| Template | `task-list.template.md` (logs inside `tasks.md`) |
| Output | Source code under component-map paths; `tasks.md` (status, Build-Verify Log, Plan vs. Actual); `status.md` |
| Rolls up to | `docs/03-build.md` → Implementation Plan vs. Actual, Feature Evidence Matrix, Troubleshooting, Significant Human Changes, AI Interactions, Local Run Evidence |
| Next | `/test-phase <id>` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| START | No task is `done` or `in-progress` | Begin at the first task (the scaffold task if component folders don't exist) |
| RESUME | Some tasks are `done`, or a task ID was given | Continue from the given task, or the first one that isn't done |
| FIX | Invoked by a handoff from the tester or reviewer with finding or test IDs | Apply only the accepted fixes, then run the build-verify loop |
| UNBLOCK | `status.md` is `blocked-on-human` and the human gave direction | Apply the direction to the blocked task and restart its loop (the attempt counter resets) |
| STOP | Planning or Design isn't approved, or status is `blocked-on-AMD-*` | Refuse and name the missing step |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| `status.md`: Planning and Design approved | Stop: run the missing command |
| Status isn't `blocked-on-AMD-*` | Stop and show the AMD |
| Every affected component resolves through `component-map.json` (`component-resolution`) | Stop with the resolver's message |
| Multi-repo: each `workspaceRoot` is open as a workspace folder | Stop: "Open `<repo>` as workspace folder `<name>`." |
| The runtime needed by the commands exists (run a version command, such as `node --version`) | Stop and ask the human to install it; name the version from `technology.md` |
| The dependencies of the feature (per the backlog) are at least `built` | Warn and list them; continue only if the human confirms |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/features/<id>/tasks.md` | Yes | Ordered tasks, files, AC covered, *Done when*, current states and logs |
| `specs/features/<id>/lld.md` | Yes | Contract, validation messages, error table, UI states, security controls, test hooks |
| `specs/features/<id>/spec.md` | Yes | AC wording (the expected observable behavior) |
| `specs/architecture/component-map.json` | Yes | Paths, commands, smoke checks, data store |
| `specs/architecture/hld.md` §4–5, §8 | Yes | Project structure, layer rules, error shape |
| `specs/architecture/data-model.md` | Yes | Tables, fields, constraints (to create or query exactly) |
| `specs/technology.md` | Yes | Chosen libraries (no new dependencies outside the register without approval) |
| `specs/constitution.md` | Yes | S1–S5, U1–U4, Q3, P5, D2 |
| Existing code under the resolved paths | Yes | Current structure, naming, patterns to follow |
| Findings or test IDs from the handoff | FIX | Exactly what to change and how it will be verified |

## Step 3: Build the task brief (per task)

Before writing code, announce:

```
TASK Fnn-Txx: <description>
Covers: <AC IDs>. Done when: <criterion>
Files: <resolved path → new | changed>
Constraints: <clauses and LLD sections that apply, e.g. S2 SSRF guard, LLD §7 messages>
Reuse: <existing functions and modules>
New dependency: none | <package, license, why> → needs human approval
```

## Step 4: Clarify and confirm

- Before the **first** task of a run, show the task plan (tasks remaining, the order, the commands the loop will run) and **wait for `GO`**.
- Stop and ask (≤5 questions) only when: the LLD is silent or contradictory on something the task needs; a new dependency is needed; or the task can't be done inside the resolved paths. If the LLD is wrong, don't improvise. Propose an LLD change, with a note for the architect.
- A `GO` covers the whole run of tasks, unless a stop condition above occurs.

## Step 5: Execute (per task, in order)

1. Implement the **minimum** code for this task only, following `coding-standards` and `secure-input-handling`. Use exactly the messages and responses from the LLD.
2. Run the `build-verify-loop` skill: format → lint → build → start → smoke → tests. Capture the real output. Allow **at most 3 fix attempts**. After the third failure, stop, report, and set `status.md` to `blocked-on-human`.
3. Update `tasks.md`: the task status, a Build-Verify Log row for every attempt (observed results only), and the Plan vs. Actual row with any deviation and its reason.
4. Log the interaction and draft evidence (Step 7) before moving on.

**After the last task**

1. Run the full build-verify loop once more across all affected components.
2. Start the app, give the human the URL, and ask them to check the feature in the browser against the AC. Ask them to save 1–3 screenshots with synthetic data to `docs/assets/Fnn-<slug>-<n>.png` and to tell you what they observed. Record their words; don't describe what you didn't see.

## Step 6: Validate

- [ ] Every task is `done`, or `blocked` with a reason.
- [ ] Every changed file sits under a resolved component path.
- [ ] The final loop run is clean: format, lint (0 errors), build, start, smoke, tests. Record the observed output.
- [ ] No lint rule disabled, no test deleted or skipped, and no error suppressed without recorded human approval.
- [ ] Every new dependency is in `technology.md` §5 with a license, and was approved.
- [ ] User messages, status codes, and routes match the LLD exactly.
- [ ] Every untrusted input goes through the control listed in LLD §9 (a spot check of each).
- [ ] Only synthetic data in code, fixtures, and screenshots. No secrets.
- [ ] Every AC has code that satisfies it (cite the file and function per AC).
- [ ] The Build-Verify Log and Plan vs. Actual are complete for every task.
- [ ] The human's manual check is recorded in their words, or marked `TODO(human)`.

## Step 7: Log evidence

Log every response. Code generation for a requirement, and any fix of a build or test failure, is usually material: draft `E-build-<nn*100+seq>`, with the commands and observed results as verification. Ask the human for their fields in one message per record. Problems that needed ≥1 fix attempt are Troubleshooting candidates.

## Step 8: Gate and handoff

Show the Gate Summary: tasks done, commands with observed results, troubleshooting items, human changes to AI output, and pending `TODO(human)` items. On `APPROVE`:

- In `status.md`, mark Build approved; set the backlog status to `built`.
- Roll up into `docs/03-build.md`:
  - Implementation Plan vs. Actual (`### Fnn`).
  - Feature Evidence Matrix rows for every requirement this feature covers. For cross-cutting rows (Persistence, Validation, Duplicate Handling, Empty/Error States), add only this feature's contribution, and keep the status `In progress` until every contributing feature is done.
  - Troubleshooting, Significant Human Changes, AI Interactions.
  - Local Run Evidence: screenshot links and the human's observations.
- Offer the handoff to the tester (`/test-phase <id>`).
- FIX mode: hand back to the tester or reviewer that asked for the fix, with the verification results.

## Critical rules

- Code only in component-map paths, and only for the current task.
- Never exceed 3 fix attempts. Never suppress errors to pass.
- Never add a dependency without approval and a license check.
- Never claim the feature works without an observed command result or the human's confirmation.
