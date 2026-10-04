---
name: edge-case-discovery
description: 'Systematically discover edge cases and negative scenarios (invalid input, duplicates, empty states, external failures, boundaries, concurrency, security probes). Use in planning (spec edge cases) and testing (AI-discovered edge cases).'
user-invocable: false
---

# Edge-Case Discovery

## Inputs

| Input | Used for |
|---|---|
| The spec's AC and inputs (or the product spec for app scope) | What to walk through the lenses |
| The seed or assignment edge-case list | Source tagging (`assignment`) and the "new" comparison |
| `lld.md` (testing phase) | Real validation limits and error paths |
| Existing edge cases in other specs and `docs/01` | Avoiding duplicates |

## Procedure

Walk each input and each state through these lenses. Record each case as `EC<nn>`, with the scenario, expected behavior, and **source** (`assignment` if the source text names it, `AI` if you raised it, `human` if the user raised it). Be honest about the source.

| Lens | Questions to ask |
|---|---|
| Empty / missing | Empty string? Whitespace only? Field omitted? |
| Format | Malformed? Missing scheme? Unsupported scheme? Unicode/IDN? |
| Boundaries | Max length? Min length? Exactly at the limit? 0, 1, or many items? 1,000 items? |
| Duplicates / equivalence | Same value differing by case, trailing slash, fragment, or whitespace? Duplicate tags? |
| External dependency failure | Timeout? 4xx/5xx? Non-HTML? Huge response? Redirect loop? DNS failure? Offline? |
| State | No data yet? Last item removed? Filter or search yielding nothing? Item edited or deleted while viewed? |
| Concurrency / repetition | Double submit? Two tabs? Restart mid-write? |
| Security | Script or HTML in text? `%`/`_`/quotes in search? `javascript:` URL? Private-IP or localhost URL? |
| Accessibility | Keyboard-only path? Screen-reader labels? Error announced as text? |

## Output

- A table (see the spec template section 3) plus a short note of which cases were **new** compared with the seed or assignment list. Those new cases feed `docs/04-testing.md` → *AI-Discovered Edge Cases* after they're tested.
- Every edge case must map to an AC or test later. Mark untested ones for *Known Limitations*.

## Validation checklist

- [ ] Every input was walked through every lens that applies.
- [ ] Every case has an expected behavior, not just a scenario.
- [ ] Source tags are honest. Cases from the source text aren't tagged `AI`.
- [ ] No duplicates of cases already recorded elsewhere (reference them instead).
- [ ] Every case maps to an AC or a test, or is headed for Known Limitations.

## Common errors

| Error | Correct approach |
|---|---|
| Tagging every case `AI` | Tag `assignment` when the source names it |
| A scenario with no expected result | Add the observable behavior (message, status, stored state) |
| Only happy-path variants | Cover the failure, boundary, security, and a11y lenses |
| Implausible cases that inflate the count | Keep only cases a real user or attacker could trigger |
