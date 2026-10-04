---
description: "Answer questions about the application being built: how a feature works, what a piece of code does, which requirement / spec / acceptance criterion covers a behavior, and which spec, LLD, task and code build a functionality. Traces both ways between specs and code. Read-only. Usage: /ask-project <question>"
argument-hint: "<question, e.g. 'how does duplicate detection work?' or 'which spec covers this file?'>"
agent: agent
tools: [read, search, edit, todo]
---

# /ask-project

**Question:** ${input}

| Item | Value |
|---|---|
| Agent | default |
| SDLC stage | Cross-cutting (read-only Q&A) |
| Skills | `component-resolution` (locate code), `doc-sync-consistency` (only to notice spec/code drift) |
| Answers from | `specs/**` (intended behavior), component code and tests (implemented behavior), `docs/04`/`docs/05` (observed results) |
| Output | An answer in chat. The only file written is one interaction-log line. |
| Not for | Progress and process questions (use `/ask-framework`). Changing behavior (use the feature's workflow or `/clarify`). |

---

## Step 0: Detect the mode

Classify the question. State the mode in the first line, for example `Mode: TRACE-TO-CODE (R05 search)`. If the chat has an active selection or open file and the question says "this", use it as the subject.

| Mode | Detected when the question asks… | Example |
|---|---|---|
| HOW-IT-WORKS | how a feature or behavior works end to end | "How does adding a bookmark work?", "What happens when the title fetch fails?" |
| CODE-EXPLAIN | what a file, function, route, or query does | "What does `normalizeUrl` do?", "Explain this file." |
| TRACE-TO-SPEC | which requirement, feature, AC, or decision covers some code or behavior | "Which spec covers this function?", "Why is `%` escaped in search?" |
| TRACE-TO-CODE | which LLD, task, code, and tests build a requirement, AC, or feature | "Which code implements F04-AC2?", "Where is tag filtering built?" |
| DATA | entities, fields, relationships, persistence | "Where are tags stored?", "What makes a URL a duplicate?" |
| DESIGN-WHY | why something was designed or chosen a certain way | "Why SQLite?", "Why is the title fetched on the server?" |
| NOT-PLANNED | `specs/product-spec.md` doesn't exist | Answer only from the seed. Say it isn't planned yet and recommend `/ask-framework` for next steps. |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| The question is about the application, not framework progress | Say so in one line and suggest `/ask-framework <question>` |
| A named id (`R..`, `Fnn`, `Fnn-ACn`, `NFR-..`, `TD/AD/LD-..`, `Fnn-Txx`, `Fnn-TCxx`) exists | List the closest matching ids and ask which one was meant |
| Code questions: `specs/architecture/component-map.json` exists | Answer from specs only, and say code locations aren't declared yet (architecture not approved) |
| Code questions: the component's workspace root is open | Say which folder to open. Answer from specs in the meantime. |
| The subject file sits under a component path | Say the file is outside every declared component (a possible drift finding) and still explain it |

## Step 2: Load context (follow the trace chain; read only what the mode needs)

The trace chain links every layer. Enter it at whatever the question names and walk both directions as far as the question needs.

```
R-ID (product-spec §2) → feature (backlog, product-spec §3) → story / AC / edge case (spec.md)
  → LLD section, component, file (lld.md §3–§9) → task (tasks.md) → code (component path)
  → test case (docs/04 Test Matrix, test files) → review finding (docs/05) → evidence (E-*.md)
```

| Source | Modes | What to extract |
|---|---|---|
| `specs/product-spec.md` | All | R-IDs, NFRs, cross-feature edge cases |
| `specs/backlog.md` | TRACE-*, HOW-IT-WORKS | Feature ↔ R-ID mapping, components affected |
| `specs/features/<id>/spec.md` | All except DATA | Stories, AC, edge cases, out-of-scope (who owns a behavior) |
| `specs/features/<id>/lld.md` | HOW-IT-WORKS, TRACE-*, CODE-EXPLAIN | Interface contract, validation messages, error handling, security controls, sequence, files |
| `specs/features/<id>/tasks.md` | TRACE-* | Task → files → AC. Plan vs. actual deviations. |
| `specs/architecture/hld.md` | HOW-IT-WORKS, DESIGN-WHY | Flows, layers, trust boundaries, AD decisions |
| `specs/architecture/data-model.md`, `er-diagram.md` | DATA | Entities, constraints, indexes, persistence |
| `specs/technology.md` | DESIGN-WHY | TD decisions and trade-offs |
| `component-map.json` → component code (via `component-resolution`) | CODE-EXPLAIN, HOW-IT-WORKS, TRACE-* | The actual implementation. Search by the names in the LLD and task files. |
| Test files, `docs/04-testing.md` | TRACE-TO-CODE, HOW-IT-WORKS | Which tests cover it, and their **recorded** results |
| `docs/05-review.md` | HOW-IT-WORKS, CODE-EXPLAIN | Known findings on this code |
| `specs/architecture/amendments/AMD-*.md` | DATA, DESIGN-WHY | Changes to the original design |

Never read or quote secrets (`.env`, key files, tokens). If the code reads a secret, say that it does without showing the value.

## Step 3: Build the answer brief

Sort every fact into one of three kinds, and keep them apart in the answer:

| Kind | Tag | Source |
|---|---|---|
| Intended behavior | `[spec]` | spec.md, lld.md, hld.md, data-model.md |
| Implemented behavior | `[code]` | Source files, **as read**. The app was not run. |
| Observed behavior | `[observed]` | A recorded test result or a smoke-check log line, with its ID and date |

Then check:

- **Spec vs. code mismatch:** the code does something the spec doesn't say, or the reverse (for example a different error message, a missing validation, an extra field). Report each one with both locations. Don't decide which is right.
- **Untraced code:** code with no task or AC behind it.
- **Unimplemented spec:** an AC or LLD row with no code yet. Report the feature's rung (see `/ask-framework`) instead of calling it a bug.
- **Owner:** when two features could own a behavior, use the Out of Scope sections to say which one does.

## Step 4: Clarify (only if needed)

Ask only when the subject is ambiguous (for example, "the form" could mean add or edit). Ask ≤2 questions, each with a recommended default. There's no execution preview and no `GO`, because nothing is written except the log line.

## Step 5: Answer

```
Mode: <mode>

**Answer:** <2–5 sentences in plain words, with [spec] / [code] / [observed] tags>

**Trace:**
| Requirement | Feature | AC / edge case | Design | Code | Tests (result) |
|---|---|---|---|---|---|
| R.. | Fnn | Fnn-ACn | lld §n / AD-nn | [file](path#Lnn) `symbol` | Fnn-TCnn (Pass, date) or none |

<Mode-specific detail, only as much as the question needs:
 HOW-IT-WORKS: numbered steps of the flow, each linked to its code, plus the failure paths
 CODE-EXPLAIN: purpose, inputs and outputs, side effects (DB writes, network), error paths, security controls
 DATA: fields and constraints, the enforcing index or constraint, where it's stored
 DESIGN-WHY: the decision block, the options that were rejected, and the accepted trade-off>

**Mismatches:** <none | each spec-vs-code difference with both links, and the suggested command:
 /sync-check for doc drift, /review-phase Fnn for a code defect, /clarify Fnn if the spec itself is unclear>
**Not covered:** <parts of the question the specs and code don't answer>
```

Link every file with a workspace-relative path and line numbers. Quote at most a few lines of code, only where it helps the explanation.

## Step 6: Validate

- [ ] The mode is stated on the first line.
- [ ] Every claim carries a tag, and `[observed]` is used only with a recorded result.
- [ ] Every code link points to a file under a component path that was actually read.
- [ ] The trace table has no invented ids. Empty links say "none", not a guess.
- [ ] Mismatches are reported with both sides, not resolved.
- [ ] No runtime claim ("it returns 409") is stated as fact without a test result or a clear "from reading the code".
- [ ] No secrets or personal data were quoted. No file was changed except the log.

## Step 7: Log

Append one line with `"command":"/ask-project"` and `"material": false`: to the feature's `evidence/interaction-log.jsonl` if the question is about a single feature, otherwise to `specs/evidence/interaction-log.jsonl`. If `specs/` doesn't exist, don't create it.

If the answer led the human to make a decision (for example, to raise a finding or change a spec), suggest `/log-evidence <phase> <scope> <summary>` so it can become an evidence record. Don't create one automatically.

## Critical rules

- Read-only. Never edit code, specs, or docs, and never run the app, tests, or other commands to answer a question.
- Specs say what should happen. Code says what was written. Recorded results say what was observed. Keep all three apart.
- Resolve code locations only through `component-map.json`. Don't search outside the declared components except to report a file that sits outside them.
- If the specs don't cover something, say so. Don't fill the gap with a plausible design.
