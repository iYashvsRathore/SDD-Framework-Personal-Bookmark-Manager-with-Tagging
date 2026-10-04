---
description: "Review phase. '/review-phase <Fnn-slug>' = AI review of a feature for correctness, security, validation, maintainability, accessibility, UX and defects with severity, human accept/modify/reject decisions and verified fixes. '/review-phase app' = whole-app review, dependency audit and Final Readiness Check. Rolls up to docs/05-review.md."
argument-hint: "Fnn-slug | app"
agent: reviewer
---

# /review-phase

**Scope:** ${input}

| Item | Value |
|---|---|
| Agent | reviewer |
| SDLC stage | 4e: Feature review (`Fnn-slug`) · 5: App-level review (`app`) |
| Skills | `secure-input-handling`, `accessibility-review`, `component-resolution`, `evidence-logging`, `doc-sync-consistency` (rollup, sync checks) |
| Instructions | `security`, `coding-standards`, `testing-standards` |
| Output | Findings with human decisions and verified fixes; `status.md`; app scope: dependency audit and Final Readiness Check |
| Rolls up to | `docs/05-review.md` (all sections); the status column in `docs/03-build.md` Feature Evidence Matrix |
| Next | Feature: the next backlog feature · App: `/reflect` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| REVIEW | No findings are recorded for this scope yet | Full review → findings → decisions |
| VERIFY | The builder handed back fixes for accepted findings | Re-run the targeted checks; record the verification |
| APP | Scope is `app` | Whole-app review, dependency audit, Final Readiness Check |
| STOP | The testing gate isn't approved | Name the missing step |

## Step 1: Check preconditions

| Check | Scope | If it fails |
|---|---|---|
| `status.md`: Testing approved | Feature | Stop: run `/test-phase <id>` |
| Backlog gate *App-level testing* approved | App | Stop: run `/test-phase app` |
| Component paths and the `audit` command resolve | Both | Stop with the resolver message |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| Code under the resolved component paths (the feature's changed files from `tasks.md`; everything for app) | Yes | The code under review |
| `specs/features/<id>/spec.md`, `lld.md` | Feature | AC, contract, messages, error table, security controls: the review baseline |
| Test Matrix and results for the scope | Yes | What is already verified; gaps worth reviewing harder |
| `specs/constitution.md` | Yes | Q1–Q5, S1–S5, U1–U4, D2–D3 as review criteria |
| `specs/architecture/hld.md` §5, §8 | Yes | Layer rules, error-handling strategy, trust boundaries |
| `specs/technology.md` §5 | App | Dependency register (to compare with the audit and the manifest) |
| `specs/product-spec.md` | App | R01–R11 and NFRs for the Final Readiness Check |
| Earlier findings in `docs/05-review.md` | Yes | Avoid duplicates; check for regressions of fixed findings |

## Step 3: Build the review plan

1. **Files in scope**, with their component and why each is included.
2. **Areas and criteria:** correctness (vs. AC and LLD), security (`secure-input-handling`), validation, maintainability (layering, duplication, naming), accessibility and UX (`accessibility-review`), defects (error paths, edge cases).
3. **Risk focus:** the untested or high-risk areas from the test results.
4. App scope: the audit command, and the readiness mapping approach.

## Step 4: Preview, then decisions

Show the review plan and **wait for `GO`**. After the review, present the findings:

```
FINDINGS   (scope: <scope>)
| ID | Finding | Location (file:line) | Severity | Rationale | Suggested fix |
Severity: Critical | High | Medium | Low. The rationale cites a clause, AC, or LLD section.
```

Ask for a decision on each finding (**≤5 per message**): Accept, Modify (with the human's change), or Reject (with a reason). Record the answers verbatim. Never decide for the human.

## Step 5: Execute

1. **Review** the code against the plan. Every finding has a precise location, and a rationale tied to a clause, AC, or LLD section. No style nitpicks that the linter already covers.
2. **Findings table:** `Fnn-RVxx` or `APP-RVxx`.
3. **Decisions:** record Accept, Modify, or Reject and the reason, in the human's words.
4. **Fixes:** hand the accepted and modified findings to the builder (FIX mode). On return (VERIFY), re-run the relevant tests, commands, or targeted checks, and record the **observed** result in "How verified".
5. **False positives and misses:** findings the human showed to be wrong, and issues found by tests or the human that the review missed.
6. **App scope only:**
   - Run `commands.audit` and quote the actual summary. Compare the manifest with the `technology.md` register.
   - Build the **Final Readiness Check**: every requirement R01–R11 and every NFR → the final solution (feature IDs, test IDs), with status `Done`, `Partial` (with reason), or `Not done`.

## Step 6: Validate

- [ ] Every area in the plan was reviewed, or is marked `Not reviewed` with a reason.
- [ ] Every finding has a location, severity, rationale (with a reference), and suggested fix.
- [ ] Every finding has the human's decision, or is listed as pending.
- [ ] Every accepted or modified fix has an observed verification result. Nothing is marked fixed without it.
- [ ] No Critical or High finding is open (Q5), or the gate is blocked, with the reason stated.
- [ ] *Modified/Rejected Feedback* is honest. If there were none, say so.
- [ ] App scope: the audit output is quoted, and every R-ID and NFR has a readiness row with a status and evidence.
- [ ] The review changed no application code directly.

## Step 7: Log evidence

Log every response. Findings the human accepted, modified, or rejected are usually material: draft `E-review-<nn*100+seq>` or `E-review-00n`, with the verification.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- Feature: in `status.md`, mark Review approved. Set the status to `done` only if the feature Definition of Done holds; otherwise list what is missing. Update the backlog.
- App: mark backlog gate *App-level review* approved.
- Roll up into `docs/05-review.md`: Review Scope, Findings, Accepted Feedback, Modified/Rejected Feedback, False Positives / Misses, AI Interactions, and Final Readiness Check (app).
- Set the Feature Evidence Matrix status in `docs/03-build.md` to `Done`, or `Partial` with the reason.
- Run the `/sync-check` checks for the scope and report the results.
- Next: the next backlog feature (`/plan-phase <Fnn>`), or `/reflect` after app scope.

## Critical rules

- The human decides every finding. The reviewer never edits application code.
- No fix is "done" without an observed verification.
- Report misses honestly, including the review's own.
