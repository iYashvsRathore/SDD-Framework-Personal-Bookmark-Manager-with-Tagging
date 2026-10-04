---
description: "Capture an AI interaction as an Evidence E-<phase>-<number> record (asks the human for decision, verification, time, learning), log it to interaction-log.jsonl, or complete TODO(human) fields of an existing record. Usage: /log-evidence <phase> <Fnn-slug|app> <what happened>  |  /log-evidence complete E-<phase>-<n>"
argument-hint: "<planning|design|build|testing|review> <Fnn-slug|app> <summary>  |  complete E-<phase>-<n>"
agent: agent
---

# /log-evidence

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | Cross-cutting (any time; also used inside every workflow at step 7) |
| Skills | `evidence-logging`, `doc-sync-consistency` (publish) |
| Instructions | `evidence-format` |
| Template | `evidence-record.template.md` |
| Output | `specs/<scope path>/evidence/E-<phase>-<n>.md`; a line in `interaction-log.jsonl`; the docs copy if the gate is already approved |
| Next | Return to the running workflow; `/status` shows the remaining gaps |

---

## Step 0: Detect the mode

| Mode | Input | What happens |
|---|---|---|
| NEW | `<phase> <scope> <summary>` | Identify the interaction → log → materiality → draft → ask the human |
| COMPLETE | `complete E-<phase>-<n>` | Ask only for that record's `TODO(human)` fields |
| LIST | `list [scope]` | Read-only: show every record with its complete or incomplete state and missing fields |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| The phase is one of `planning`, `design`, `build`, `testing`, `review` | Show the valid codes |
| The scope is `app` or a feature folder that exists | List the valid scopes |
| COMPLETE: the record file exists | Stop and list the records in that scope |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| The scope's `interaction-log.jsonl` | Yes | Existing lines, the next `seq`, whether this interaction was already logged |
| The scope's `evidence/E-*.md` | Yes | Used IDs, to allocate the next free number in the scope's range |
| Current chat history | NEW | The actual request, response, files changed, commands run, and results |
| The relevant spec, LLD, tasks, or test files | NEW | IDs to cite in *Context given to AI* (requirement, AC, task, test IDs) |
| `evidence-record.template.md`, `evidence-format.instructions.md` | Yes | The exact field list and rules |
| The matching `docs/0X-*.md` | If gate approved | Where to publish the record |

## Step 3: Build the interaction brief

Session facts only: date, command, the request (≤200 characters), the AI response (≤200 characters), files changed, commands run with observed results, and IDs involved. If the interaction can't be identified from the real session or the human's description, **ask**. Never invent one.

Materiality test (from `evidence-logging`): did it shape a requirement, a design choice, code, a fix, a test, or a review finding, **and** is there a decision and a verification (or a pending one)?

## Step 4: Preview and ask

```
EVIDENCE PREVIEW
Log line: seq <n>, <phase>, <scope>, material: <yes|no>
Record: E-<phase>-<n> (range <app 001–099 | Fnn nn×100+>)
AI-filled: activity, task, context, prompt, response summary, iteration, draft outcome
Verification observed in-session: <command + result | none>
Needs you: decision, what changed and why, verification (if none observed), minutes, learning
```

Then ask the ≤5 evidence questions in **one** message (see `evidence-logging` §4). Wait for the answers. Unanswered fields become `TODO(human)`.

## Step 5: Execute

1. Append the log line (or confirm that it exists).
2. Not material → say so, keep it log-only, and stop.
3. Material → create the record with the exact 12 fields, in order. Write the human's answers verbatim (lightly tidied).
4. If the phase gate is already approved, copy the record verbatim into `docs/0X-*.md` → `## AI Interactions`, sorted by ID.
5. COMPLETE: fill only the answered `TODO(human)` fields; re-copy to the docs if the record is already published.

## Step 6: Validate

- [ ] The heading is exactly `### Evidence E-<phase>-<n>`, and the ID is unique in the scope and inside the scope's range.
- [ ] All 12 fields are present, in template order, with exact labels.
- [ ] *Your decision* is one of Accepted, Modified, Rejected, or `TODO(human)`.
- [ ] *Outcome* is one of worked, partially worked, failed, caused rework (or a draft awaiting confirmation).
- [ ] Human-only fields contain the human's words or `TODO(human)`. Nothing was inferred.
- [ ] *How you verified it* quotes a real command and result, or the human's statement, or `TODO(human)`.
- [ ] The docs copy (if any) is byte-identical to the specs file.
- [ ] No personal data, secrets, or internal URLs.

## Step 7: Output

Show the final record and state **complete** (counts toward the minimum) or **incomplete** (list the missing fields). Report the scope's counts against the docs minimums.

## Critical rules

- Never create a record for an interaction that didn't happen.
- Never fill human-only fields, even if asked to "just fill it in". Explain the rule and offer `TODO(human)`.
