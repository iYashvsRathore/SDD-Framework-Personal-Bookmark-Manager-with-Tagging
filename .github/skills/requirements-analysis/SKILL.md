---
name: requirements-analysis
description: 'Break requirements into features, user stories (As a… I want… so that…), testable Given/When/Then acceptance criteria, dependencies, effort estimates, measurable NFRs, risks, assumptions and questions. Use during /plan-phase (app or feature scope) and /clarify.'
user-invocable: false
---

# Requirements Analysis

## When to use

- `/plan-phase app`: product-level breakdown, NFRs, risks, and the feature backlog.
- `/plan-phase <feature-id>`: feature user stories and acceptance criteria.
- `/clarify`: when requirements are ambiguous.

## Inputs

| Input | Scope | Used for |
|---|---|---|
| `specs/constitution.md` | Both | Scope limits, quality and UX bars |
| `.github/seeds/*.seed.md`, the requirement source | App | Requirement wording and citations; NFR targets |
| `specs/product-spec.md` | Feature | The requirement slice, NFRs, cross-feature edge cases |
| `specs/backlog.md` row and dependency specs | Feature | Dependencies, boundaries with other features |
| `data-model.md`, `component-map.json` | Feature (if approved) | Realistic stored state in AC; valid component ids |

## Procedure

1. **Read the sources:** `specs/constitution.md`, `.github/seeds/*.seed.md` (if present), `specs/product-spec.md`, and for a feature, its row in `specs/backlog.md`.
2. **Restate the problem** in plain words: the problem, the target user (synthetic persona), and the value delivered.
3. **Enumerate requirements** as `R01…`. Keep the source wording in the acceptance summary. Don't add requirements the source doesn't state. Put nice-to-haves under *Optional enhancements (deferred)*.
4. **Group into features** (`Fnn-<slug>`). Each feature is independently buildable and testable. Record *covers requirements* and *depends on*. Cross-cutting requirements (persistence, validation, duplicates, empty/error states) are mapped to every feature that contributes to them.
5. **Estimate effort** (S/M/L) with a one-line rationale. Flag anything L as a risk.
6. **Write user stories** as `As a <user>, I want <capability>, so that <benefit>`. Every story needs ≥1 acceptance criterion in `Given / When / Then` form with an observable outcome (UI text, HTTP status, stored state). Reject vague AC such as "works correctly" and "is fast".
7. **Write NFRs** with a number, a data volume, and a measurement method. For example: "Search returns < 500 ms at 1,000 bookmarks, measured by a timed test over seeded data." Cover performance, reliability/persistence, usability/accessibility, and security at minimum.
8. **Risks, assumptions, and questions.** A risk has an impact and a mitigation. An assumption is explicit and reversible. Questions go to the human, **at most 5 at a time**, through the `/clarify` pattern.
9. **Run the edge-case-discovery skill** and attach its results.
10. **Run the constitution check.** Tick every clause that applies. If there's a conflict, stop and report it.

## Output quality bar

- ≥4 user stories app-wide, each with testable AC.
- ≥6 edge cases, each tagged `assignment`, `AI`, or `human` as its source.
- Every requirement maps to ≥1 feature, and every feature maps to ≥1 requirement (traceability).
- No invented stakeholder statements.

## Validation checklist

- [ ] Every requirement cites its source. Optional enhancements are marked deferred.
- [ ] Traceability both ways: requirement → feature and feature → requirement.
- [ ] No dependency cycles between features. Every effort value has a reason.
- [ ] Every AC is Given/When/Then with an observable outcome.
- [ ] Every NFR has a number, a volume where relevant, and a measurement method.
- [ ] Every risk has an impact and a mitigation. Every assumption is reversible.
- [ ] At most 5 open questions are raised per round.

## Common errors

| Error | Correct approach |
|---|---|
| "The system should work correctly" | State the observable result: message text, status code, stored row |
| "Search is fast" | "< 500 ms median at 1,000 bookmarks, measured by a timed test" |
| A feature that covers every requirement | Split it into independently testable features |
| An AC describing implementation ("uses an index") | Describe behavior. The implementation belongs in the LLD. |
| Filling a gap with a plausible assumption | Ask a question, or record an explicit, reversible assumption |
| Two features owning the same behavior | State the boundary in each spec's Out of Scope |
