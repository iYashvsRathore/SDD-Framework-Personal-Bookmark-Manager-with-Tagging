---
name: doc-sync-consistency
description: 'Detect and fix disagreements between specs/ artifacts and docs/ files (data model, requirement status, decisions, component ids, evidence copies, headings, counts), and perform the gate rollup from specs into the six docs without duplication. Use in /sync-check, /status and at every gate rollup.'
user-invocable: false
---

# Doc Sync and Consistency

## Inputs

| Input | Used for |
|---|---|
| Every approved artifact under `specs/` | The source of truth for rollup and checks |
| `docs/0X-*.md` and `.github/templates/0X-*.template.md` | The target files and the exact heading lists |
| `specs/**/evidence/E-*.md` | Verbatim copies and ID checks |
| `component-map.json`, `specs/architecture/amendments/AMD-*.md` | Checks C4 and C12 |
| Code and test output (when present) | Check C8 (behavior matches the policy) |

## A. Rollup procedure (runs after a gate is APPROVED)

| Approved artifact | Rolls up into |
|---|---|
| constitution.md (NFR-relevant standards, principles) | 01 Non-Functional Requirements (reference only), 02 Security Design (principles) |
| product-spec.md | 01 Problem Understanding, Requirement Breakdown, Non-Functional Requirements, Risks, Assumptions & Questions, Edge Cases (app-level) |
| features/*/spec.md | 01 User Stories & Acceptance Criteria (`### Fnn`), Edge Cases (merged, deduplicated), Planning Outcome |
| technology.md | 02 Proposed Solution (technology choices and reasons), Alternatives & Trade-offs |
| architecture/hld.md | 02 Proposed Solution, UI / User Flow, Error Handling, Security Design, Meeting the Non-Functional Requirements, Alternatives & Trade-offs |
| architecture/data-model.md + er-diagram.md | 02 Data Model |
| features/*/lld.md | 02 UI / User Flow, Error Handling, Security Design, Alternatives & Trade-offs (`### Fnn`), Design Verification |
| features/*/tasks.md + build results | 03 Implementation Plan vs. Actual, Feature Evidence Matrix, Troubleshooting, Significant Human Changes, Local Run Evidence |
| test results | 04 all sections |
| review results | 05 all sections |
| evidence/E-*.md | the `## AI Interactions` section of the phase's doc, copied verbatim and sorted by ID |

Steps:

1. Create any missing `docs/0X-*.md` from `.github/templates/0X-*.template.md`.
2. Replace the `_Pending…_` placeholder in a section, together with that section's `<!-- GUIDE -->` comment, or merge into the existing content. Never delete another feature's `### Fnn` block. Remove the closing *Completion checklist* comment only when every item passes.
3. Deduplicate the edge cases, risks, and NFR statements.
4. Keep the headings exact (see docs-format instructions).

## B. Consistency checks (/sync-check)

| # | Check |
|---|---|
| C1 | Each docs file has exactly the mandatory `##` headings in order. No extra `##` headings. |
| C2 | The `02 Data Model` content matches `data-model.md` and `er-diagram.md` (entities, fields, relationships, version). |
| C3 | Technology named anywhere in docs matches `technology.md`. |
| C4 | Every component id referenced in specs exists in `component-map.json`. The `hld.md` table matches the JSON. |
| C5 | Requirement status agrees across `backlog.md`, feature `status.md`, the 03 Feature Evidence Matrix, and the 05 Final Readiness Check. |
| C6 | Every AC has ≥1 test in the 04 Test Matrix, or appears under Known Limitations. |
| C7 | Evidence copies in docs are byte-identical to `specs/**/evidence/E-*.md`. IDs are unique, and phase codes match their docs file. |
| C8 | Duplicate-handling, validation, delete-safeguard, and title-fetch policies are described identically in spec, LLD, 02, code behavior, and tests. |
| C9 | Changed decisions have a `> Changed` note in the doc where the change arose, and the earlier doc shows the final position. |
| C10 | No `Pass` in the Test Matrix without an observed actual result. No `Done` without verification. |
| C11 | No personal data, secrets, or internal URLs in docs or specs (pattern scan: emails, phone numbers, tokens, `password=`). |
| C12 | Any `AMD-*` with status `Applied` is reflected in every artifact listed in its section 6. |

## C. Report format

| Check | Result (OK/DRIFT) | Files | Detail | Proposed fix |
|---|---|---|---|---|

Apply fixes **only after the human approves** them. For each fix, update the earlier artifact to the final position and add the `> Changed` note in the phase where the change came up.

## Validation checklist

- [ ] Rollup touched only the sections mapped for the approved artifact.
- [ ] No other feature's `### Fnn` block was removed or changed.
- [ ] Headings still match the template exactly, in order.
- [ ] All 12 checks were run. Each one reports OK, DRIFT, or N/A with a reason.
- [ ] Every DRIFT names both files and proposes a single fix.

## Common errors

| Error | Correct approach |
|---|---|
| Rewriting evidence text while rolling it up | Copy it verbatim |
| Fixing drift in `docs/` only | Fix the source artifact first, then roll up again |
| Adding a helpful extra `##` heading | Use `###` under a mandatory heading |
| Reporting OK for a check that wasn't possible | Report N/A with the reason |
