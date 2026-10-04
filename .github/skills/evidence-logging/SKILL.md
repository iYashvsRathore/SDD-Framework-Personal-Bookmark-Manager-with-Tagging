---
name: evidence-logging
description: 'Log every Copilot interaction to interaction-log.jsonl and promote material ones to Evidence E-<phase>-<number> records using the exact assignment template; ask the human for decision, verification, time and learning; never fabricate; use TODO(human) for unknowns. Use at the end of every SDD workflow response and in /log-evidence.'
user-invocable: false
---

# Evidence Logging

## Inputs

| Input | Used for |
|---|---|
| The current session (request, response, files changed, commands run and their output) | Log line and record facts |
| The existing `interaction-log.jsonl` and `E-*.md` in the scope | Next `seq` and next free ID |
| [evidence-record.template.md](../../templates/evidence-record.template.md) | The exact record shape |
| The human's answers | Decision, changes, verification, time, learning |

## 1. Log every interaction (always)

After every response inside an SDD workflow, append **one JSON line** to:

- a feature: `specs/features/<Fnn-slug>/evidence/interaction-log.jsonl`
- app level: `specs/evidence/interaction-log.jsonl`

```json
{"seq":12,"date":"YYYY-MM-DD","phase":"build","scope":"F01-add-bookmark","command":"/build-feature","request":"<≤200 chars summary of what the human asked>","response":"<≤200 chars summary of what AI did/suggested>","filesChanged":["src/…"],"commandsRun":["npm run lint"],"material":true,"evidenceId":"E-build-103"}
```

- `seq` = previous max + 1 in that file. Use today's date from context.
- Record facts only. Never put secrets or personal data in the log.

## 2. Materiality test

Promote to a full record if **any** of these hold, **and** there is context, a decision, and verification (or a pending verification):

- It shaped a requirement, story, edge case, NFR, risk, or plan.
- It chose between design alternatives, or changed the data model or architecture.
- It produced or changed feature code, fixed an error, or resolved a build or test failure.
- It created tests, found a failure, or discovered an edge case.
- It produced a review finding the human accepted, modified, or rejected.

Routine completions, formatting-only edits, and one-line answers stay log-only (`"material": false`).

## 3. Draft the record

1. Allocate the ID with the numbering rule: app level `001–099`, feature `Fnn` → `nn*100 + seq`. Scan existing `E-<phase>-*.md` files in the scope's evidence folder and take the next free number.
2. Create `…/evidence/E-<phase>-<number>.md` from [evidence-record.template.md](../../templates/evidence-record.template.md). Fill these from session facts:
   - **SDLC activity**, **Task/feature**, **Context given to AI** (the requirement IDs, files, errors, and constraints actually provided), **Prompt/request** (a faithful summary), **AI response summary**, **Iteration**, and a *draft* **Outcome**.
   - **How you verified it:** fill only with verification that really happened in-session (quote the command and result). Otherwise, use `TODO(human)`.
3. Leave `Your decision`, `What you changed and why`, `Approx. time`, and `Learning` as `TODO(human)` until the human answers.

## 4. Ask the human (≤5 questions, one message)

> For **E-<phase>-<n>** (<one-line summary>):
> 1. Decision: Accepted, Modified, or Rejected?
> 2. What did you change, and why? (Say "nothing" if accepted as-is.)
> 3. How did you verify it? (I observed: <in-session verification or "nothing yet">.)
> 4. Approximately how many minutes did this take?
> 5. One-line learning? (Also confirm or correct the Outcome: <draft>.)

Write the answers verbatim (lightly tidied). If the human skips a question, leave `TODO(human)`. Never guess.

## 5. Publish

At the phase gate rollup, copy complete **and** incomplete records verbatim into the matching `docs/0X-*.md` → `## AI Interactions`, sorted by ID. Only complete records count toward the minimums, and `/status` reports the ones that are incomplete.

## Honesty guardrails

- Don't create a record for an interaction that didn't happen in this workspace's sessions.
- Don't label a suggestion "Rejected" unless the human rejected it.
- If the human asks you to "just fill it in", explain that the rule forbids it, and offer to leave `TODO(human)`.

## Validation checklist

- [ ] One log line per response, valid JSON, with sequential `seq`.
- [ ] Every material interaction has a record. Non-material ones are marked `"material": false`.
- [ ] Record IDs are unique, follow the numbering rule, and the phase code matches the SDLC stage.
- [ ] All template fields are present, in order, with the exact labels.
- [ ] Human-only fields hold the human's words or `TODO(human)`.
- [ ] Verification quotes a real command and result, or the human's statement.

## Common errors

| Error | Correct approach |
|---|---|
| Guessing the time spent | Ask, or leave `TODO(human)` |
| "Verified: tests pass" with no run | Quote the command and its observed result |
| Reusing an ID after deleting a record | Always take the next free number |
| Renaming or reordering template fields | Copy the template exactly |
| Logging secrets or real personal data in `request` | Summarize, and use synthetic values |
