---
description: "Ask up to 5 clarifying questions for a scope before assuming, and record the answers in the right spec. Usage: /clarify <app | technology | architecture | Fnn-slug> [topic]"
argument-hint: "<app | technology | architecture | Fnn-slug> [topic]"
agent: planner
---

# /clarify

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | planner |
| SDLC stage | Cross-cutting (any time, any scope) |
| Skills | `requirements-analysis`, `edge-case-discovery`, `evidence-logging` |
| Instructions | `specs-format` |
| Output | Answers recorded in the scope's Clarifications table; downstream artifacts flagged |
| Rolls up to | Through the owning phase's next gate (01 *Risks, Assumptions & Questions* or 02 *Alternatives & Trade-offs*) |
| Next | Return to the workflow that was in progress |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| ASK | Default. No open `Q-` rows for this scope await an answer in the chat. | Find gaps and ask ≤5 prioritized questions |
| RECORD | The user's message answers questions asked in the previous `/clarify` round | Record the answers verbatim and apply their impact |
| FOLLOW-UP | Answers are recorded and more high-impact gaps remain | Ask the next round (≤5) |

## Step 1: Check preconditions and resolve the scope

| Scope argument | Artifacts read | Answers recorded in |
|---|---|---|
| `app` | `specs/product-spec.md`, `specs/backlog.md` | product-spec §7 *Clarifications Log* |
| `technology` | `specs/technology.md` | technology §7 *Clarifications* |
| `architecture` | `specs/architecture/hld.md`, `data-model.md`, `er-diagram.md`, `component-map.json` | hld §12 *Clarifications* |
| `Fnn-slug` | `specs/features/<id>/spec.md` (and `lld.md` if present) | spec §7 *Assumptions and Clarifications* |

| Check | If it fails |
|---|---|
| `specs/constitution.md` exists | Stop: run `/constitution` |
| The scope argument is one of the above | Ask the user to pick a scope |
| The scope's main artifact exists | Stop and name the command that creates it (for example `/plan-phase F03-list-bookmarks`) |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| The scope artifacts (table above) | Yes | Statements, AC, decisions, open `Q-`/`RK-` rows, change log |
| `specs/constitution.md` | Yes | Clauses that bound the possible answers |
| Upstream artifacts (product-spec for a feature; technology for architecture) | Yes | Decisions the answers must stay consistent with |
| `.github/seeds/*.seed.md` | If present | Source wording for requirements and NFR targets |
| Previous clarification rows (all scopes) | Yes | Questions already answered. Never ask them again. |
| The optional `[topic]` in `${input}` | If given | Narrow the search to that topic |

## Step 3: Build the context brief (ambiguity inventory)

List every candidate issue as:

| # | Location (file § / ID) | Type | Impact (H/M/L) | Downstream artifacts affected |
|---|---|---|---|---|

Types: *ambiguous wording*, *missing value* (limit, message, target), *conflict* between two statements, *untestable AC*, *unstated assumption*, *missing edge case*, *scope boundary* (which feature owns a behavior).

Prioritize by impact first, then by how costly the answer is to reverse later. Pick the top 5. Keep the rest as candidates for a FOLLOW-UP round.

## Step 4: Ask (ASK / FOLLOW-UP) or preview (RECORD)

**ASK:** send one message with at most 5 questions:

```
CLARIFICATION ROUND <n>  (scope: <scope>)
Q<nn>. <question>
     Why it matters: <impact and artifacts affected>
     Recommended default: <answer>. If chosen: <what changes>
     Alternative: <answer>. If chosen: <what changes>
...
Reply with answers (for example "Q01: default, Q02: <text>"). Unanswered questions stay open.
```

**RECORD:** show the apply preview and **wait for `GO`** before editing:

```
CLARIFICATION APPLY PREVIEW
- Q01 → answer: "<verbatim>" → edit <file §> (<what changes>)
- Q02 → unanswered → stays open (listed in Risks, Assumptions & Questions)
Approved artifacts that change: <files, or none>. They need re-approval at their next gate, plus /sync-check.
Reply GO to apply.
```

## Step 5: Execute (RECORD)

1. Add each answer to the scope's Clarifications table: Q-ID, question, the human's answer (verbatim, lightly tidied), date, affected artifacts.
2. Update the affected statements (AC, NFR target, decision) to match the answer.
3. If an **approved** artifact changed: add a change-log row, set its status back to `draft` for re-approval, and flag `/sync-check`.
4. Unanswered questions are recorded as open questions, never as assumptions.

## Step 6: Validate

- [ ] ≤5 questions were asked in this round, and none repeated an answered question.
- [ ] Each question named its impact and a recommended default.
- [ ] Every answer is recorded verbatim with a date and Q-ID. Q-IDs are unique within the scope.
- [ ] No answer was strengthened or reinterpreted during recording.
- [ ] Every edited artifact has a change-log row. Approved artifacts that changed are marked for re-approval.
- [ ] Open questions are listed, not assumed.

## Step 7: Log evidence

Log every response with `evidence-logging`. Phase: `planning` for `app` or a feature spec, `design` for `technology` or `architecture`. A round whose answers changed scope, an AC, or a design decision is material: draft a record in the scope's ID range.

## Step 8: Hand back

`/clarify` has no gate of its own. End with: the answers recorded, the artifacts changed, the open questions, and the command to resume (for example "Continue with `/design-feature F01-add-bookmark`").

## Critical rules

- Never invent an answer or a stakeholder statement.
- Never ask more than 5 questions in a round.
- Never edit an approved artifact without `GO` and a change-log row.
