---
description: "Testing phase. '/test-phase <Fnn-slug>' = derive, write and RUN tests for a feature, record actual results, Fail -> Fix -> Retest. '/test-phase app' = full regression plus NFR checks (1,000-record performance, restart persistence, accessibility, security probes). Rolls up to docs/04-testing.md."
argument-hint: "Fnn-slug | app"
agent: tester
---

# /test-phase

**Scope:** ${input}

| Item | Value |
|---|---|
| Agent | tester |
| SDLC stage | 4d: Feature testing (`Fnn-slug`) · 5: App-level testing (`app`) |
| Skills | `test-design`, `edge-case-discovery`, `secure-input-handling` (probes), `accessibility-review` (keyboard walkthrough), `component-resolution`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `testing-standards`, `security` |
| Output | Test files under the component's test location; results in `status.md`; test data for the docs rollup |
| Rolls up to | `docs/04-testing.md` (all sections); the "How I verified" column in `docs/03-build.md` |
| Next | `/review-phase <scope>` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| FEATURE | Scope is `Fnn-slug` and there are no previous test results | Derive, write, and run tests for the feature |
| RETEST | Scope is `Fnn-slug` and the builder handed back fixes for failing tests | Re-run the failing tests and the full suite; complete the Fail -> Fix -> Retest entries |
| APP | Scope is `app` | Full regression plus NFR checks |
| STOP | Build isn't approved (feature), or features aren't `built` (app) and the human declines to continue | Name the missing steps |

## Step 1: Check preconditions

| Check | Scope | If it fails |
|---|---|---|
| `status.md`: Build approved | Feature | Stop: run `/build-feature <id>` |
| Every backlog feature is ≥ `built` | App | List the ones that aren't, and ask whether to proceed with a partial scope (recorded in Known Limitations) |
| Commands `test` (and `coverage` if Q4 sets a target) resolve through `component-map.json` | Both | Stop: `/amend-architecture` or `/technology change` |
| The app starts (smoke check) | Both | Stop and hand off to the builder |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/features/<id>/spec.md` | Feature | AC and edge cases (the expected behavior) |
| `specs/features/<id>/lld.md` | Feature | Contract, validation messages, error table, test hooks (stubbing seams) |
| `specs/features/<id>/tasks.md` | Feature | Build-Verify Log (tests that already exist), files changed |
| `specs/product-spec.md` | Both | NFR targets and measurement methods |
| `specs/constitution.md` | Both | Q1, Q2, Q4 (coverage), U1–U2 |
| `specs/technology.md` | Both | Test framework and coverage tool |
| `component-map.json` | Both | Test location, commands, smoke settings |
| Existing tests under the component | Both | What is already covered (avoid duplication), and naming conventions |
| All features' `spec.md` and test results | App | The full AC set for the regression, and the known limitations so far |
| The builder's handoff | RETEST | Which failures were fixed, and how |

## Step 3: Build the context brief (test plan)

1. **Coverage map:** every AC and edge case → planned test IDs `Fnn-TCxx` (or `APP-TCxx`), level (unit, integration/API, UI-manual), and whether AI proposed it.
2. **Security probes** from `secure-input-handling` that apply to this scope.
3. **AI-discovered edge cases:** new cases from `edge-case-discovery` that aren't in the spec, tagged `AI`.
4. **NFR checks** (app scope, or feature scope when an NFR applies): method, data volume, target.
5. **Manual checks** with exact steps (such as the keyboard walkthrough), assigned to the human.
6. **Not testable now:** items, with reasons, headed for Known Limitations.

## Step 4: Clarify and preview

Ask **≤5 questions** only where the expected behavior is unclear (never guess an expected result). Then show the plan and **wait for `GO`**:

```
TEST PLAN PREVIEW   (mode: <mode>, scope: <scope>)
Cases: <count> (unit <n>, integration <n>, manual <n>); AI-proposed <n>
AC coverage: <AC → TC IDs>; uncovered: <none | IDs + reason>
Security probes: <list>
NFR checks: <NFR ID → method, volume, target>
Manual steps for you: <list>
Commands to run: <test>, <coverage>
Planned files: <test file paths under the component>
Reply GO to write and run the tests.
```

## Step 5: Execute

1. Write the tests in the component's test location, following `testing-standards`: isolated temp store, stubbed network, synthetic data, no order dependence.
2. **Run** `commands.test` (and `commands.coverage`). Copy the observed counts and the failure lines.
3. Fill the Test Matrix: ID, requirement, scenario, expected result, **actual result (observed)**, Pass / Fail / Not run, AI helped.
4. **Failures:** record the failure → hand off to the builder in FIX mode with the test IDs and the observed output. On return (RETEST), re-run and record the result as one Fail -> Fix -> Retest entry. Fix a *test* defect yourself only with human approval, and record that.
5. **Manual checks:** give the human the exact steps and record their reported observations verbatim.
6. **App scope NFR checks:** seed 1,000 synthetic bookmarks and time search and filter (report the median and max against the target); restart persistence; the keyboard and label walkthrough (by the human); security probes. Record the observed numbers.
7. Record the AI-discovered edge cases with their results, and the Known Limitations.

## Step 6: Validate

- [ ] Every AC has ≥1 test with a result, or is listed in Known Limitations with a reason.
- [ ] Every edge case in `spec.md` is tested or listed as a limitation.
- [ ] Every Pass and Fail has an observed actual result. Cases that didn't run are `Not run`, never Pass.
- [ ] The test command output (counts) is quoted in the Gate Summary.
- [ ] At least one security probe on untrusted input ran with an observed result.
- [ ] App scope: every NFR has ≥1 check with an observed number or observation against its target.
- [ ] Coverage is reported if Q4 sets a target (observed %, vs. target).
- [ ] Fail -> Fix -> Retest entries are real. If there were fewer than 2 failures, say so plainly.
- [ ] "AI helped?" is marked honestly per case.
- [ ] No test was weakened, skipped, or deleted to get a pass.
- [ ] Only synthetic data in tests and fixtures.

## Step 7: Log evidence

Log every response. Test generation, a discovered edge case, and a found or fixed failure are usually material: draft `E-testing-<nn*100+seq>` (feature) or `E-testing-00n` (app), with the command and the observed output as verification.

## Step 8: Gate and handoff

Show the Gate Summary: tests run, passed / failed / not run, failures fixed, coverage, open limitations. On `APPROVE`:

- Feature: in `status.md`, mark Testing approved; set the backlog status to `tested`. App: mark the backlog gate *App-level testing* approved.
- Roll up into `docs/04-testing.md`: Test Strategy, Test Matrix, AI-Discovered Edge Cases, Fail -> Fix -> Retest, AI Interactions, Known Limitations.
- Update the "How I verified" column of the `docs/03-build.md` Feature Evidence Matrix with the test IDs.
- Offer the handoff to the reviewer (`/review-phase <scope>`).

## Critical rules

- A test that didn't run is never a Pass. Never invent failures or results.
- The expected result comes from the spec or LLD, never from what the code happens to do.
- Code fixes go to the builder. The tester doesn't change application code.
