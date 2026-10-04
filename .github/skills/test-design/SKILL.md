---
name: test-design
description: 'Design and run tests: map acceptance criteria and edge cases to test cases, build the Test Matrix (expected vs actual), NFR checks (performance at 1,000 records, restart persistence, keyboard/labels accessibility, security probes), and Fail -> Fix -> Retest records. Use in /test-phase.'
user-invocable: false
---

# Test Design and Execution

## Procedure

1. **Inputs:** the feature's `spec.md` (AC and edge cases), `lld.md` (test hooks), `specs/product-spec.md` (NFRs), and `component-map.json` (the `test` and `coverage` commands).
2. **Derive test cases** `Fnn-TCxx`:
   - ≥1 per AC (happy path).
   - Validation: empty, whitespace, malformed, wrong scheme, overlong.
   - Duplicates, including normalized equivalents.
   - Empty states and error states, such as a title-fetch failure (stubbed).
   - Security probes from the `secure-input-handling` skill.
   - Mark each case `AI helped: Yes/No` honestly.
3. **Choose a level:** unit (validators, normalizer, SSRF guard), integration/API (routes with a temp DB), UI (manual or automated keyboard checks). Automate where cheap and document manual checks with precise steps.
4. **Isolation:** use a temp or in-memory store per test, stub the network, and don't depend on test order.
5. **Run** `commands.test` (and `commands.coverage` if defined). Copy the **observed** counts and failure messages.
6. **Fill in the Test Matrix** with ID, requirement, scenario, expected result, actual result, Pass/Fail, and AI helped. A case that hasn't run is `Not run`.
7. **On failure:** record the failure (test ID, observed output) → hand the code fix to the builder (or fix a test *defect* only with human approval) → re-run → record the retest result. That forms one **Fail -> Fix -> Retest** entry. Never invent failures, and if fewer than 2 occurred, say so.

## NFR checks (at least one per target)

| NFR | Suggested check |
|---|---|
| Performance | Seed 1,000 synthetic bookmarks → time N search and filter calls → report the observed max/median vs. the target. |
| Persistence | Create data → stop the process → start → assert the data is present (automated with a file DB, or manual with steps). |
| Accessibility | Keyboard-only walkthrough of add/edit/delete/search/filter. Check that every input has a `<label for>` or `aria-label`, and that focus is visible. Record the observations. |
| Security | Probes: `javascript:` and `file:` URLs rejected; private-IP fetch blocked; `<script>` title rendered as text; `%`/`_` search handled literally. |

## Outputs

`docs/04-testing.md` sections (via rollup), plus `specs/features/<f>/status.md` updated with the Testing phase result.

## Validation checklist

- [ ] Every AC has ≥1 test case, or appears under Known Limitations.
- [ ] Every edge case in the spec has a test case, or a stated reason why not.
- [ ] Every "actual" value was observed. Unrun cases are `Not run`.
- [ ] Tests are isolated: temp store, stubbed network, no order dependence.
- [ ] Every NFR has at least one check with an observed result.
- [ ] Each Fail -> Fix -> Retest entry has the real failure output and the retest result.
- [ ] `AI helped` is marked honestly for every case.

## Common errors

| Error | Correct approach |
|---|---|
| Copying "expected" into "actual" | Record what the run showed |
| Real outbound HTTP in the title-fetch tests | Stub the fetch and test the SSRF guard separately |
| A shared DB file across tests | Use a fresh temp or in-memory store per test |
| Manufacturing a failure to fill the section | Report the real number of failures |
| Changing an assertion to make a test pass | Fix the code, or get approval for a test-defect fix and record it |
