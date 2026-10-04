---
description: "Use when creating, editing, or rolling up AI interaction evidence records (Evidence E-<phase>-<number>) or the interaction log. Enforces exact template, phase codes, numbering, TODO(human), and anti-fabrication."
applyTo: "docs/**/*.md,specs/**/evidence/**"
---

# Evidence Format Rules

## Location (check this before every write — most common mistake)

There are **two separate logs and two separate evidence folders**. Writing a feature-scope line or record to the app-level location (or vice versa) is a recurring defect in this repo (seen on F01, repeated on F08) — check the scope before every append or create, not just the first time in a session.

| Scope of this interaction | `interaction-log.jsonl` path | Evidence record path |
|---|---|---|
| A single feature (`Fnn-slug`) — including `/plan-phase Fnn`, `/design-feature`, `/build-feature`, `/test-phase Fnn`, `/review-phase Fnn`, and any `/amend-architecture` or `/clarify` run whose `request`/`response` is about that feature | `specs/features/<Fnn-slug>/evidence/interaction-log.jsonl` | `specs/features/<Fnn-slug>/evidence/E-<phase>-<nn*100+seq>.md` |
| App-level (`/constitution`, `/plan-phase app`, `/technology`, `/architecture`, app-level `/test-phase`/`/review-phase`, `/sync-check`, `/status` with no feature argument) | `specs/evidence/interaction-log.jsonl` | `specs/evidence/E-<phase>-<001-099>.md` |

- **Never** append a feature-scope line to `specs/evidence/interaction-log.jsonl` just because that file already exists and is open. Check the `scope` field you are about to write: if it names an `Fnn-slug`, the line belongs in that feature's own folder, which you may need to create.
- Before the first write of a session, confirm the target file path out loud in your own response (or in the Gate Summary) when the scope is a feature — do not assume the app-level file is the default.
- If a misplacement is found (by `/status`, `/sync-check`, or a human report), correct it the same way, every time: create the correct per-feature file if missing, copy the misplaced lines byte-for-byte, renumber `seq` sequentially from 1 in the destination file, remove them from the wrong file, and renumber what remains there sequentially from 1. Do not alter `request`/`response`/timestamps/decisions — only location and `seq`.

## Exact template

Copy it exactly from [evidence-record.template.md](../templates/evidence-record.template.md). All 12 fields, in this order, with a **blank line between fields**:

`SDLC activity`, `Task/feature`, `Context given to AI`, `Prompt/request`, `AI response summary`, `Your decision`, `What you changed and why`, `How you verified it`, `Outcome`, `Iteration`, `Approx. time`, `Learning`.

- Heading: `### Evidence E-<phase>-<number>`. Phase codes are exactly `planning`, `design`, `build`, `testing`, `review`.
- `Your decision` ∈ `Accepted`, `Modified`, `Rejected`.
- `Outcome` ∈ `worked`, `partially worked`, `failed`, `caused rework`.

## Numbering (collision-free across developers)

- App-level work (constitution, product planning, technology, architecture, app-level test and review): `001`–`099`, sequential per phase.
- Feature `Fnn`: `nn × 100 + seq`. For example, F01 → `101, 102…`, and F07 → `701, 702…`.
- Never reuse or renumber an ID after it is published in `docs/`.

## Who fills which field

| AI may fill from the session | Only the human may supply |
|---|---|
| SDLC activity, Task/feature, Context given to AI, Prompt/request, AI response summary, Iteration, and a *draft* Outcome | Your decision, What you changed and why, How you verified it, Approx. time, Learning, and confirmation of Outcome |

- If the human hasn't answered, the field value is exactly `TODO(human)`.
- A record containing `TODO(human)` is **incomplete**. It doesn't count toward minimums, and `/status` lists it.
- The AI may *propose* verification text only when the verification actually happened in-session (for example, "Ran `npm test`: 14 passed, 0 failed"). Quote the real output.

## Materiality (per assignment Section 7)

Promote an interaction to a full record only when it materially influenced a decision, feature, test, fix, or review outcome, **and** it has context, a decision, and verification. Routine completions and one-line answers are logged only in `interaction-log.jsonl`.

## Forbidden

- Invented rejections, failures, timings, test results, or human decisions.
- Pasted conversations or code blocks over 15 lines inside a record.
- Personal data, secrets, internal URLs, or client names.
- Editing a published record's facts silently. Corrections append an `**Iteration:**` note instead.
