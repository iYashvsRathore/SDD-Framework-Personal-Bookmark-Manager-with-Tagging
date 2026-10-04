<!-- GUIDE: Filled by /technology (architect agent, technology-selection skill). Sources: specs/constitution.md (A1, A2, D2, P4, S5), specs/product-spec.md §4 NFRs, the seed's constraints. Start at Version 1, Status draft. Set Status approved only after the human replies APPROVE. Remove every GUIDE comment once its section is filled. -->
# Technology Selection

**Version:** <n>
**Status:** draft | approved
**Constitution version:** <x.y.z>

> Chosen interactively with the human. Every layer lists ≥2 options with trade-offs. Every choice must satisfy the constitution (local, free/OSS, no external DB server, simple first).

## 1. Decision Summary

<!-- GUIDE: One row per layer the product actually needs. Delete rows that don't apply (for example, no separate HTML parser). "Why" must cite an NFR ID or constitution clause. The license comes from the package's own metadata, not from memory. -->

| Layer | Choice | Version | License | Why it suits this problem |
|---|---|---|---|---|
| Runtime / language | | | | |
| Web framework / server | | | | |
| Frontend approach | | | | |
| Persistence | | | | |
| HTML parsing (title fetch) | | | | |
| Test framework(s) | | | | |
| Linter / formatter | | | | |

## 2. Decisions and Alternatives

<!-- GUIDE: One TD-nn block per §1 row, in the same order. At least 2 genuinely different options. The "Fit with constitution" column names clause IDs. The decision is the human's choice, with a date. Never record the AI recommendation as the decision. -->

### TD-01 <Layer>

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: <option> | | | |
| B: <option> | | | |

**Decision:** <option> (human-selected on <date>)
**Trade-off accepted:** <text>

<repeat per layer>

## 3. Tooling Commands (copied into component-map.json by /architecture)

<!-- GUIDE: Exact, runnable commands for the chosen tools. Build may be `null` with the note "interpreted, no build step". Coverage may be `null`. /architecture copies these verbatim, so don't paraphrase. -->

| Purpose | Command |
|---|---|
| Install | |
| Format | |
| Lint | |
| Build / type-check | |
| Start (dev) | |
| Test | |
| Coverage | |
| Dependency audit | |

## 4. Dependency Policy

- Pin exact versions. Commit the lockfile.
- Before adding a dependency, check its license, maintenance, and necessity, then record it in section 5.
- Run the audit command during `/review-phase`.

## 5. Dependency Register

<!-- GUIDE: Only packages actually chosen in §1. /build-feature appends rows when a new dependency is approved. -->

| Package | Version | License | Purpose | Added by (feature/phase) |
|---|---|---|---|---|

## 6. Constitution Compliance

| Clause | How the stack complies |
|---|---|
| A1 local, no external DB | |
| D2 licensing | |
| P4 simplicity | |

<!-- GUIDE: Add a row for every other clause the stack touches (for example, A2 persistence, S5 dependency pinning). -->

## 7. Clarifications

<!-- GUIDE: Questions asked in /technology Step 4 or /clarify technology, with the human's answers verbatim. -->

| Q-ID | Question | Answer (human) | Date | Affects (TD-nn) |
|---|---|---|---|---|

## 8. Change Log

<!-- GUIDE: One row per CHANGE-mode run after approval. Record which artifacts were updated to match (component-map.json, lld files). -->

| Date | Change | Why | Approved by |
|---|---|---|---|

<!-- Completion checklist (validated in /technology Step 6, then remove this comment):
- [ ] Every §1 row has a matching TD-nn block with ≥2 options and a human decision.
- [ ] Names and versions agree across §1, §2, §3, and §5.
- [ ] Every license is free or OSS and compatible (D2).
- [ ] Persistence needs no external database server (A1) and survives restart (A2).
- [ ] All §3 commands are filled, or `null` with a reason.
- [ ] No placeholders `<...>` or GUIDE comments remain.
-->
