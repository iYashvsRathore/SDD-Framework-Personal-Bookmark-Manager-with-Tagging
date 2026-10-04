---
description: "Reflection phase (once, at the end): builds docs/06-reflection.md from actual evidence and interaction logs plus human-only facts (time per phase, judgments, self-assessment, demo video, declaration). Usage: /reflect"
argument-hint: "(no arguments)"
agent: agent
---

# /reflect

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | 6: Reflection (once, at the end) |
| Skills | `evidence-logging`, `doc-sync-consistency` |
| Instructions | `docs-format` |
| Template | `06-reflection.template.md` |
| Output | `docs/06-reflection.md` |
| Next | `/sync-check`, then `/status` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| CREATE | `docs/06-reflection.md` still has `_Pending` sections | Fact sheet → question rounds → write |
| RESUME | Some sections are filled, and `TODO(human)` remains | Ask only for the missing items |
| REVISE | The human asks for changes or adds `<!-- REVISE -->` markers | Apply them; never change the human's words without being asked |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| Backlog gate *App-level review* approved | Warn and ask whether to continue with a draft. The Gate Summary shows it as a draft. |

## Step 2: Load context

| Source | What to extract |
|---|---|
| Every `interaction-log.jsonl` | Interactions per phase; material vs. log-only counts |
| Every `E-*.md` record | Decisions per phase (Accepted / Modified / Rejected); outcomes `failed` or `caused rework`; the human's time and learning fields |
| Every `tasks.md` Build-Verify Log | Attempts that needed fixes; blocked tasks |
| `docs/04-testing.md` | Fail -> Fix -> Retest entries |
| `docs/05-review.md` | Rejected findings, false positives, misses |
| `docs/03-build.md` | Significant Human Changes |
| `docs/06-reflection.md` | What is already filled |

## Step 3: Build the fact sheet

Show a short fact sheet: counts per phase, decision split, rework items (with evidence IDs), and the sum of `Approx. time` per phase from complete records, labelled "from records, partial". This is the basis for *AI Usage Summary* and *Rework*. It contains facts only, no judgments.

## Step 4: Ask (rounds of ≤5 questions)

- **Round 1:** approximate time per phase (planning, design, build, testing, review); where AI was most and least useful, with examples (suggest evidence IDs).
- **Round 2:** three decisions where the human's judgment mattered, and what would have happened otherwise; where AI saved time and where it created work.
- **Round 3:** what they would do differently (prompts, context, process); strongest phase, weakest phase, confidence.
- **Round 4:** the demo video filename or link and duration (must be 5–8 min; warn if it's outside that range); whether reviewers can access the link.
- **Round 5:** a declaration **in their own words**, or explicit confirmation of the standard sentence.

Before writing, show a preview of each section with the human's answers mapped in, and **wait for `GO`**.

## Step 5: Execute

Write `docs/06-reflection.md` under the exact headings. Use the human's answers (lightly tidied, never embellished), referencing evidence IDs. Unanswered items stay `TODO(human)`. **Never** write the Declaration without explicit human confirmation.

## Step 6: Validate

- [ ] The exact 06 headings, in order (C1).
- [ ] Every judgment, time, and opinion statement comes from the human's answers. The AI supplied only counts and IDs.
- [ ] Evidence IDs cited in the text exist.
- [ ] The time table has the human's values or `TODO(human)`.
- [ ] The demo video has a link and a duration, and the duration is within 5–8 min, or the warning is shown.
- [ ] The Declaration is the human's words or their explicit confirmation.

## Step 7: Log evidence

Log every response (phase `review`, app scope). Reflection is normally log-only.

## Step 8: Gate

Show the Gate Summary. On `APPROVE`, mark backlog gate *Reflection* approved, then recommend `/sync-check` and `/status` as the final check.
