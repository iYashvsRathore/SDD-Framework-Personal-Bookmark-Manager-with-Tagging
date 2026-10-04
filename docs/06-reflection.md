# 06 · Reflection

## AI Usage Summary

AI was most useful for catching architecture deviations and surfacing the need for amendments during feature planning and design — for example, identifying where a feature's design would deviate from the currently approved architecture, which led to AMD-001 through AMD-004 (see `specs/architecture/amendments/`, `E-design-101`, `E-design-801`, `E-design-802`). AI was least useful when it re-ran the full test suite after every incremental change during build, rather than waiting until a task's changes were complete before verifying (see the Build-Verify Log pattern across `E-build-1xx`–`E-build-8xx` records).

## Approximate SDLC Time

| Phase | Approx. time (human-supplied) |
|---|---|
| Planning | 30 min |
| Design | 30 min |
| Build | 3 h |
| Testing | 2 h |
| Review | 1 h |

## Rework

One environment-level test worker crash occurred during the F03 build (not a test content defect; the immediate retry passed clean). One test-authoring defect was found during app-level testing — the new `app-journey.test.js` assumed the wrong response shape, fixed in the test only (`docs/04-testing.md` App-level testing gate). F08 had one Fail -> Fix -> Retest for an ambiguous `expectOne` match, fixed by matching on `method` as well as `url`. Review surfaced 4 High findings across the eight feature reviews — F01-RV01 (missing ESLint config in `app/web`), F02-RV01 (tag input pending text silently discarded on submit), F08-RV01 and F08-RV02 (CSP inline pre-paint script blocked in production, and a duplicated theme string literal) — all Accepted, fixed, and verified. F08-RV01 was explicitly flagged as a miss by the Testing gate: the pre-paint script and the CSP header were never tested together as a combined system until review (`docs/05-review.md`). AI saved time by generating thorough test and edge-case coverage upfront; it created extra work by re-running full suites after every small change instead of batching verification until a task was complete.

## Human Judgment

TODO(human): 3 decisions where your judgment materially mattered, and what would have happened otherwise.

## What You Would Do Differently

TODO(human).

## Self-Assessment

Strongest phases: planning, design, and build (execution) — AI was very strong across all three. Weakest phase: TODO(human). Confidence in the final result: very confident.

## Demo Video

- **Filename/link:** TODO(human) — will be provided once the video is recorded.
- **Duration:** TODO(human) (must be 5–8 minutes)

## Declaration

This documentation reflects my actual work and AI interactions throughout this project (standard sentence, confirmed by dev-1).

