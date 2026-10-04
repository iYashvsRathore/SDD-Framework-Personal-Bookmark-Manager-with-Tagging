---
name: build-verify-loop
description: 'After each implementation task, run format, lint (auto-fix), build/type-check, start the app, smoke-check endpoints, and run existing tests using commands from component-map.json; fix errors with a hard limit of 3 attempts, then stop and report. Use in /build-feature and when applying accepted review/test fixes.'
user-invocable: false
---

# Build-Verify Loop (max 3 fix attempts)

## Inputs

| Input | Used for |
|---|---|
| The task row in `tasks.md` | Scope, the AC it covers, and its done-check |
| `component-map.json` via `component-resolution` | Commands, working folder, smoke checks |
| `lld.md` | Expected routes and status codes for extra smoke checks |
| The current attempt count in the *Build-Verify Log* | Enforcing the 3-attempt limit across resumes |

## Procedure (per task `Fnn-Txx`, per affected component)

Resolve commands with the `component-resolution` skill. Run each step in the terminal and **capture the real output**.

1. **Format:** run `commands.format`.
2. **Lint:** run `commands.lint`. Auto-fix where the tool supports it, then fix the remaining violations manually.
3. **Build / type-check:** run `commands.build`. Skip only if the value is `null`, and note "interpreted, no build step".
4. **Start:** run `commands.start` as a **background** process. Wait for readiness up to `smoke.startupTimeoutSeconds`, polling `smoke.baseUrl`.
5. **Smoke check:** for each `smoke.checks[]` entry, and for any new route the task added, send the request and compare the status with `expectStatus`. Use synthetic input only.
6. **Tests:** run `commands.test`. Record passed/failed/skipped counts.
7. **Stop the background server**, unless the human asked to keep it running for manual verification.

## Failure handling

- If any step fails, diagnose from the actual error output, make the **smallest** fix, and restart from step 1. This counts as **one attempt**.
- **After the 3rd failed attempt, stop.** Don't try a 4th. Report to the human:
  - the task, the failing step, and the exact command
  - the key error lines (≤ 15 lines)
  - what each of the 3 attempts changed
  - your best hypothesis, plus 1–2 options for the human
  - set the feature `status.md` to `blocked-on-human`
- Never "fix" a failure by deleting tests, disabling lint rules, adding `// @ts-ignore` or `eslint-disable`, or catching and ignoring errors, unless the human explicitly approves and the reason is recorded.

## Recording (actual results only)

- Append each attempt to `tasks.md` → *Build-Verify Log*: task, attempt, step, command, observed result, action.
- A problem that needed ≥1 fix attempt is a **Troubleshooting** candidate for `docs/03-build.md` (what happened, diagnosis, resolution) and usually a material evidence record (`E-build-nnn`).
- Mark the task `done` only when all steps pass in a single run.

## Validation checklist

- [ ] Every step ran, or was skipped for a recorded reason (`null` command).
- [ ] Every recorded result was copied from real output.
- [ ] Attempts ≤ 3. After the 3rd failure, the status is `blocked-on-human`.
- [ ] No suppressions (disabled rules, ignored errors, deleted tests) without recorded approval.
- [ ] The background server was stopped (or kept at the human's request).

## Common errors

| Error | Correct approach |
|---|---|
| Reporting "build passes" without running it | Run the command and quote the result |
| Resetting the attempt count after a resume | Continue counting from the log |
| Fixing lint by disabling the rule | Fix the code, or ask for approval and record the reason |
| Leaving the dev server running and blocking the next run | Stop it at step 7 |
| Several unrelated changes in one attempt | Make the smallest fix for the observed error |
