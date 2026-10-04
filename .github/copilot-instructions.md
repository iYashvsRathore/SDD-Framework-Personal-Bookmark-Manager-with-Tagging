# SDD Framework: Global Rules for GitHub Copilot

This repository uses a **Specification-Driven Development (SDD)** framework. Every change moves through specification, design, build, test, and review, with a **human approval gate** between phases. The full guide is in [README.md](../README.md).

## Source-of-truth order

1. `specs/constitution.md`: non-negotiable principles. Nothing may violate it. If a request conflicts with it, stop, quote the clause, and ask the user.
2. `specs/product-spec.md`, `specs/backlog.md`: app-level requirements, NFR targets, and the feature backlog.
3. `specs/technology.md` and `specs/architecture/*` (`hld.md`, `data-model.md`, `er-diagram.md`, `component-map.json`): shared decisions. Change them **only** through `/technology` (re-run with approval) or `/amend-architecture`.
4. `specs/features/<feature-id>/*`: per-feature `spec.md`, `lld.md`, `tasks.md`, `status.md`, `evidence/`.
5. `docs/01..06-*.md`: the published assignment rollup. Only workflow rollup steps update these files. Never edit them free-form.

If `specs/constitution.md` is missing, tell the user to run `/constitution` first. The only exception is when `/constitution` itself is running.

## Hard rules (apply to every workflow, agent, and chat)

1. **Honesty over polish.** Never fabricate AI interactions, test results, failures, rejections, timings, approvals, or verification. Build evidence only from what actually happened in the session. Ask the human for facts only they know (their decision, what they ran, minutes spent, what they learned). If they don't answer, write `TODO(human)`. Never claim something works unless a command you ran, or the human, verified it.
2. **Evidence format.** Every documented AI interaction uses the exact `### Evidence E-<phase>-<number>` template in [.github/templates/evidence-record.template.md](templates/evidence-record.template.md). Phase codes: `planning`, `design`, `build`, `testing`, `review`. See [evidence-format.instructions.md](instructions/evidence-format.instructions.md).
3. **Exact headings.** Each `docs/0X-*.md` uses the mandatory `##` headings, spelled exactly and in order. See [docs-format.instructions.md](instructions/docs-format.instructions.md).
4. **Keep files in sync.** When a later phase changes an earlier decision, update the earlier artifact to the final position. Record *what changed and why* in the phase where the change came up. No two files may disagree. `/sync-check` enforces this.
5. **Confidentiality and licensing.** Use synthetic data only (for example, `https://example.com`, `dev-1`). No personal data, employer or client material, internal URLs, or secrets. Use only free or open-source tools with a compatible license. If a suggestion looks like copied proprietary code, discard it and write an original implementation.
6. **Simple first.** Local, web-based, free, with no external database or paid service. Core requirements come before optional enhancements. Add no features, abstractions, or dependencies the spec doesn't need.
7. **Human gates.** Every phase ends with a Gate Summary and an explicit approval request. Don't start the next phase until the user replies `APPROVE`. Ask clarifying questions before assuming, **no more than 5 at a time**.
8. **Component map.** Resolve every code path through `specs/architecture/component-map.json`. Never write code to a path that file doesn't declare. If a component or its workspace root is missing, stop and ask.
9. **Log every interaction.** After every SDD workflow response, append an entry to the interaction log and promote material interactions to evidence records, following the `evidence-logging` skill.

## Workflow (slash commands, in order)

| Stage | Command | Agent | Scope |
|---|---|---|---|
| 0 Init | `/constitution` | planner | once (amend with approval) |
| 0 Clarify | `/clarify <scope>` | planner | any time, ≤5 questions |
| 1 Product planning | `/plan-phase app` | planner | once |
| 2 Technology | `/technology` | architect | once |
| 3 Architecture | `/architecture` | architect | once, then only through `/amend-architecture` |
| 4a Feature planning | `/plan-phase <feature-id>` | planner | per feature |
| 4b Feature design (LLD) | `/design-feature <feature-id>` | architect | per feature |
| 4c Build | `/build-feature <feature-id>` | builder | per feature |
| 4d Test | `/test-phase <feature-id>` | tester | per feature |
| 4e Review | `/review-phase <feature-id>` | reviewer | per feature |
| 5 App-level test/review | `/test-phase app`, `/review-phase app` | tester, reviewer | once, after all features |
| Cross-cutting | `/log-evidence`, `/sync-check`, `/status`, `/amend-architecture` | any | any time |
| Q&A (read-only) | `/ask-framework <question>` (process and progress), `/ask-project <question>` (the application, its specs and code) | default | any time |
| 6 Reflection | `/reflect` | default | once, at the end |

## Workflow anatomy (every slash command follows these steps)

Each prompt in `.github/prompts/` adapts these steps to its own inputs and outputs. Read-only commands (`/status`, `/ask-framework`, `/ask-project`) skip steps 4 and 8.

| Step | Name | What happens |
|---|---|---|
| 0 | Detect mode | Decide from existing files and arguments what kind of run this is (for example CREATE, REVISE, CHANGE, RESUME, STOP). Say the mode in the first line of the response. |
| 1 | Check preconditions | Verify upstream gates, required files, and blocking statuses. If a check fails, stop with the exact fix command. |
| 2 | Load context | Read every source in the prompt's context table. Required sources that are missing stop the run. Never assume content you did not read. |
| 3 | Build the context brief | Condense what was read into facts (with source IDs), gaps, and conflicts. Conflicts are quoted, never silently resolved. |
| 4 | Clarify and preview | Ask ≤5 questions per round (each with a recommended default and its impact). Then show the **execution preview** (understanding, decisions, planned file actions). **Write nothing until the user replies `GO`** or explicitly says to proceed. |
| 5 | Execute | Create or update artifacts from templates, following the skills listed by the prompt. |
| 6 | Validate | Run the prompt's validation checklist. Fix failures; list any that remain in the Gate Summary. |
| 7 | Log evidence | Follow the `evidence-logging` skill: log every response; draft material E-records; ask the human for their fields. |
| 8 | Gate and handoff | Show the Gate Summary. On `APPROVE`: record the gate, roll up into `docs/`, offer the handoff. |

**Two different confirmations:** `GO` approves the *execution preview* inside a phase (step 4). `APPROVE` passes the *phase gate* (step 8). Neither is ever assumed.

**Revise markers:** a human can annotate any draft artifact with `<!-- REVISE: <comment> -->`. The owning workflow detects these (REVISE mode), applies each one, removes the marker, and lists what changed.

**Template guidance:** templates contain `<!-- GUIDE: … -->` comments that say what to fill and from which source. Remove each GUIDE comment once its section is filled; the template's closing *Completion checklist* comment is validated in step 6 and then removed.

## Gate Summary format (end of every phase)

```
## Gate: <phase> (<scope>)
- Mode: <mode>
- Produced/updated: <files>
- Validation: <n>/<m> checklist items passed | Failed: <items and reason>
- Evidence logged: <IDs> | Pending TODO(human): <IDs/fields>
- Constitution check: <pass / violations>
- Open questions: <≤5>
Reply APPROVE to proceed to <next command>, or tell me what to change.
```

After the user replies `APPROVE`: record the approval in the feature's `status.md` (or `specs/backlog.md` for app scope), roll the approved content up into the matching `docs/` file, and then offer the handoff to the next agent.

## Definition of Done

**Feature:** spec, LLD, and tasks are approved. Code is written only in component-map paths. Lint, format, and build are clean, and the smoke check passed. Tests ran with actual results recorded. Review findings are decided, and accepted fixes are verified. Evidence is logged. The Feature Evidence Matrix row is updated. `/sync-check` is clean. `status.md` = `done`.

**Project:** every mandatory requirement row is `Done` or honestly marked incomplete. All six docs have exact headings and minimum *complete* evidence counts. NFR checks have actual results. `06-reflection.md` has a human-confirmed declaration. `/status` reports ready.
