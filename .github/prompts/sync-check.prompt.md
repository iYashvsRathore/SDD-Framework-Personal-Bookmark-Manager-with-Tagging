---
description: "Consistency check across specs/ and docs/: exact headings, data model vs ER vs docs, technology, component ids vs component-map.json, requirement status, AC-to-test coverage, evidence copies and IDs, changed-decision notes, confidentiality scan, applied amendments. Proposes fixes; applies only after approval. Usage: /sync-check [app | Fnn-slug]"
argument-hint: "[app | Fnn-slug]"
agent: agent
---

# /sync-check

**Scope:** ${input} (default: everything)

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | Cross-cutting (before every docs commit, after every amendment, at review gates) |
| Skills | `doc-sync-consistency`, `component-resolution` (validation mode), `evidence-logging` |
| Instructions | `docs-format`, `specs-format`, `evidence-format` |
| Output | A drift report; approved fixes applied to earlier artifacts, with `> Changed` notes |
| Next | Return to the workflow; `/status` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| CHECK | Default | Run the checks and report. No edits. |
| FIX | The user approved fixes by check number, or said "all" | Apply only the approved fixes, then re-run those checks |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| `specs/constitution.md` exists | Stop: run `/constitution` |
| Scope is `app`, a feature id that exists, or empty | List the valid scopes |

Checks whose inputs don't exist yet (for example C6 before any tests) are reported `N/A` with the reason, never `OK`.

## Step 2: Load context

| Source | Used by checks |
|---|---|
| `docs/01..06-*.md` and the templates' heading lists | C1, C3, C7, C9, C10, C11 |
| `specs/architecture/data-model.md`, `er-diagram.md` | C2 |
| `specs/technology.md` | C3 |
| `specs/architecture/component-map.json`, `hld.md` §3, all `spec.md`/`lld.md` | C4 |
| `specs/backlog.md`, all `status.md`, the 03 matrix, the 05 readiness table | C5 |
| All `spec.md` AC, the 04 Test Matrix, Known Limitations | C6 |
| All `specs/**/evidence/E-*.md` | C7 |
| Spec, LLD, 02, code, and tests for the duplicate, validation, delete, and title-fetch policies | C8 |
| All change logs and `> Changed` notes | C9 |
| All `specs/**` and `docs/**` text | C11 |
| `specs/architecture/amendments/AMD-*.md` | C12 |

## Step 3: Run the checks

Run C1–C12 from `doc-sync-consistency` §B for the scope. For each check, record the exact evidence (file and section, the conflicting values quoted).

## Step 4: Report and ask

```
SYNC REPORT   (scope: <scope>)
| Check | Result (OK / DRIFT / N/A) | Files | Detail (quoted values) | Proposed fix |
```

For each DRIFT, propose the minimal fix: update the **earlier** artifact to the final position, and add `> Changed <date>: <what> (because <why>)` in the doc of the phase where the change came up. If it isn't clear which side is correct, ask (≤5 questions); never guess.

Ask the human to approve the fixes: all, by check number, or none.

## Step 5: Execute (FIX)

Apply only the approved fixes. Shared architecture files change only through `/amend-architecture`, so for them, propose that command instead of editing. Then re-run the affected checks.

## Step 6: Validate

- [ ] All 12 checks were reported for the scope (OK, DRIFT, or N/A with a reason).
- [ ] Every DRIFT quotes both conflicting values and their files.
- [ ] Only approved fixes were applied. Shared architecture files were not edited directly.
- [ ] Each applied fix has its `> Changed` note, and the re-run result is shown.

## Step 7: Log evidence

Log every response. A sync that corrected a real inconsistency is usually material: phase `review`, in the scope's ID range.

## Step 8: Close

End with `Sync status: CLEAN` or `Sync status: <n> open drift(s)`.
