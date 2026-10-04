---
description: "Project status and readiness dashboard: app gates, feature x phase matrix, evidence counts per doc vs minimums (complete records only), heading compliance, TODO(human) list, Feature Evidence Matrix, and the assignment Submission checklist, plus the next recommended command. Usage: /status [Fnn-slug]"
argument-hint: "[Fnn-slug]"
agent: agent
---

# /status

**Scope:** ${input} (default: whole project)

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | Cross-cutting (read-only) |
| Skills | `doc-sync-consistency` (checks C1, C5, C7, C10) |
| Output | A dashboard in chat only. The only file written is the interaction-log line. |
| Next | The command(s) it recommends |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| PROJECT | No argument | Full dashboard and readiness verdict |
| FEATURE | `Fnn-slug` | Phase detail, tasks, tests, findings, and TODOs for one feature |
| NOT-STARTED | `specs/constitution.md` is missing | Say so and recommend `/constitution` |

## Step 1: Check preconditions

Only that the scope exists. `/status` never stops for a missing artifact; it reports it.

## Step 2: Load context (read only)

| Source | For section |
|---|---|
| `specs/backlog.md` | App gates, the feature list |
| `specs/features/*/status.md`, `tasks.md` | Feature × phase matrix, blockers, task progress |
| `specs/**/evidence/E-*.md` | Evidence counts (complete vs. incomplete) and the TODO(human) list |
| `docs/01..06-*.md` | Heading compliance, section minimums, matrix, test results, demo video, declaration |
| `specs/architecture/amendments/AMD-*.md` | Open amendments |
| The latest Build-Verify Log smoke results | "Runs locally" evidence and its date |

## Step 3: Compute

1. **App gates** from the backlog gate table.
2. **Feature × phase matrix:** Owner, Plan, Design, Build, Test, Review, Status, Blockers.
3. **Evidence counts:** complete records only (any `TODO(human)` makes a record incomplete).

| Doc | Required | Complete | Incomplete | Gap |
|---|---|---|---|---|
| 01-planning | 3 | | | |
| 02-design | 3 | | | |
| 03-build | 5 | | | |
| 04-testing | 3 | | | |
| 05-review | 3 | | | |

4. **Heading compliance** (C1) per doc.
5. **Section minimums:** ≥4 user stories · ≥6 edge cases · NFRs cover performance, reliability, a11y, and security · ≥2 design alternatives · 11 matrix rows · ≥2 troubleshooting items · the Test Matrix has actual results · a Findings table exists · 06 Demo Video duration is 5–8 min · the Declaration is human-confirmed.
6. **TODO(human) list:** file, record or section, field.
7. **Submission checklist** (assignment §12), each ✅ / ⚠️ / ❌ with its reason:
   - all mandatory requirements implemented, or the incomplete ones identified
   - the app runs locally (last observed smoke result and date)
   - docs 01–06 complete, including the 03 matrix and the 04 actual outcomes
   - the standard evidence format is used
   - the demo video is recorded and accessible
   - no fabricated content (every `Pass` has an observed result)
   - the project is kept available
8. **Next recommended command(s)**, derived from the first incomplete gate for each owner.

## Step 4: Report

Show the sections above in order. Finish with the readiness verdict: `READY` only if every checklist item is ✅ and the last `/sync-check` was clean. Otherwise `NOT READY: <top 3 gaps>`.

## Step 5: Validate

- [ ] Every number comes from a file that was read. Nothing is estimated.
- [ ] Incomplete records are not counted as complete.
- [ ] Every ❌ or ⚠️ has a reason and a fix command.
- [ ] No files were modified other than the interaction log.

## Step 6: Log

Append one line to `specs/evidence/interaction-log.jsonl` (`material: false`).
