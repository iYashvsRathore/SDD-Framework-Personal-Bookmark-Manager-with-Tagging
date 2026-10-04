---
description: "Use when writing or editing the six assignment docs (docs/01-planning.md ... docs/06-reflection.md): mandatory ## headings, order, minimum evidence counts, Feature Evidence Matrix, Test Matrix, Findings table, rollup rules."
applyTo: "docs/**/*.md"
---

# Docs Format Rules (graded submission)

The `docs/` files are a **rollup** of approved content from `specs/`. Workflows update them at gates. Never invent content here that doesn't exist in `specs/` or in the session.

## Mandatory `##` headings: exact spelling, exact order

A single `#` title line at the top is allowed. Use `###` sub-headings inside a section, for example `### F01 Add Bookmark`. If a section doesn't apply yet, keep the heading and write one line saying why, for example `_Not applicable yet: no failures observed so far._`. HTML comments (`<!-- GUIDE -->` and the closing *Completion checklist*) come from the templates. Remove each one when its section is filled. They are not headings.

**docs/01-planning.md** (min **3** evidence)
1. `## Problem Understanding`
2. `## Requirement Breakdown`
3. `## User Stories & Acceptance Criteria` (≥4 stories, "As a… I want… so that…", testable AC)
4. `## Edge Cases` (≥6, note where AI helped find each)
5. `## Non-Functional Requirements` (measurable: performance at volume, reliability/persistence, usability/accessibility, security)
6. `## Risks, Assumptions & Questions`
7. `## AI Interactions`
8. `## Planning Outcome`

**docs/02-design.md** (min **3** evidence)
1. `## Proposed Solution`
2. `## Data Model`
3. `## UI / User Flow`
4. `## Error Handling`
5. `## Security Design`
6. `## Meeting the Non-Functional Requirements`
7. `## Alternatives & Trade-offs` (≥2 decisions, each with options, the decision, and trade-offs)
8. `## AI Interactions`
9. `## Design Verification`

**docs/03-build.md** (min **5** evidence, covering different features and problems)
1. `## Implementation Plan vs. Actual`
2. `## Feature Evidence Matrix`
3. `## Troubleshooting` (≥2 real problems)
4. `## Significant Human Changes`
5. `## AI Interactions`
6. `## Local Run Evidence` (screenshots in `docs/assets/`, no large code blocks)

**docs/04-testing.md** (min **3** evidence)
1. `## Test Strategy`
2. `## Test Matrix`
3. `## AI-Discovered Edge Cases`
4. `## Fail -> Fix -> Retest`
5. `## AI Interactions`
6. `## Known Limitations`

**docs/05-review.md** (min **3** evidence)
1. `## Review Scope`
2. `## Findings`
3. `## Accepted Feedback`
4. `## Modified/Rejected Feedback`
5. `## False Positives / Misses`
6. `## AI Interactions`
7. `## Final Readiness Check`

**docs/06-reflection.md** (no evidence minimum)
1. `## AI Usage Summary`
2. `## Approximate SDLC Time`
3. `## Rework`
4. `## Human Judgment` (3 decisions)
5. `## What You Would Do Differently`
6. `## Self-Assessment`
7. `## Demo Video` (filename or link, duration 5–8 min)
8. `## Declaration`

## Required tables

**Feature Evidence Matrix** (03-build.md). Keep exactly these 11 rows in this order, even when the status is `Not started`:

| Requirement | Status | How AI helped | What I changed/decided | How I verified |
|---|---|---|---|---|
| Add Bookmark | | | | |
| Tags | | | | |
| List/Newest First | | | | |
| Filter by Tag | | | | |
| Search | | | | |
| Edit | | | | |
| Delete | | | | |
| Persistence | | | | |
| Validation | | | | |
| Duplicate Handling | | | | |
| Empty/Error States | | | | |

Allowed Status values: `Not started`, `In progress`, `Done`, `Partial`, `Not done`. "How I verified" must reference a real command, test ID, or screenshot.

**Test Matrix** (04-testing.md) columns: `ID | Requirement | Scenario | Expected result | Actual result | Pass/Fail | AI helped?`. The Actual result column holds only observed output. If a test hasn't run, write `Not run`, never `Pass`.

**Findings** (05-review.md) columns: `ID | Finding | Severity | My assessment | Action taken | How verified`. Severity values: `Critical`, `High`, `Medium`, `Low`, `Info`.

## Rollup rules

- Aggregate across features without duplication. Merge identical edge cases and cite every feature they apply to, for example `(F01, F06)`.
- Put feature-specific content under `### Fnn <Title>` sub-headings inside the correct `##` section.
- When a later phase changes an earlier decision, update the earlier doc to the final position and add a `> Changed <date>: <what> (because <why>; see <doc/section or AMD-id>)` note in the doc where the change came up.
- Don't paste large code blocks (> 15 lines) or entire AI conversations. Summarize the interaction and its impact.
- Screenshots go in `docs/assets/` and must contain synthetic data only.
- Copy evidence records verbatim from `specs/**/evidence/E-*.md`. Sort them by ID under `## AI Interactions`.
