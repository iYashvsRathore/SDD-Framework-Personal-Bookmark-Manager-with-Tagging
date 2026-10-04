<!-- GUIDE: Filled by /constitution (planner agent). Sources: the human's answers to the INIT questions, the seed's constraints, and the assignment rules. Draft as Version 0.1.0 with Status draft. On APPROVE, set Version 1.0.0, Status ratified, and the Ratified date. Keep the P/Q/S/U/A/D/E clause IDs stable, because every other artifact cites them. Remove every GUIDE comment once its section is filled. -->
# Project Constitution

**Project:** <project name>
**Version:** 0.1.0
**Status:** draft | ratified
**Ratified:** <YYYY-MM-DD, set on APPROVE>
**Last amended:** <YYYY-MM-DD>

> This file defines the **non-negotiable** governing principles, quality bars, and constraints for this project. Every spec, design, task, code change, test, and review MUST comply. Agents check their output against the Compliance Checklist (section 9) at every gate.
> Technology choices are **not** recorded here. They belong in `specs/technology.md`, which must itself comply with this constitution.

## 1. Core Principles

- **P1 Specification before code.** No code is written for a feature until its `spec.md` and `lld.md` are approved.
- **P2 Human approval gates.** No phase starts until the previous phase's gate is approved by a human.
- **P3 Honesty over polish.** No fabricated interactions, results, timings, or approvals. Unknowns are `TODO(human)`.
- **P4 Simplicity first.** Choose the simplest design that meets the requirements. Core requirements come before optional enhancements.
- **P5 Incremental delivery.** Build one task at a time. The application must build and run after every task.
- **P6 Single source of truth.** Shared decisions live in one place (see `specs/` layout). Later changes update earlier artifacts.
- <add project-specific principles>

## 2. Quality Standards

<!-- GUIDE: Q4 needs a concrete number the human agreed to. Don't name a tool here. The tool belongs in technology.md. -->

- **Q1** Every acceptance criterion has at least one automated test, or a documented manual check where automation isn't practical.
- **Q2** Tests are executed. Only observed results are recorded.
- **Q3** Zero lint errors and zero build errors before a task is marked done.
- **Q4** Test coverage target: <e.g. ≥ 80% line coverage on service/business logic, measured by the tool declared in technology.md>.
- **Q5** No known Critical or High review finding is left open at release.

## 3. Security Standards

- **S1** All external input is validated at the boundary. URLs allow `http`/`https` only.
- **S2** Server-side fetches of user-supplied URLs are SSRF-guarded: private/loopback ranges are blocked, and timeouts, size caps, and redirect re-validation are in place.
- **S3** All untrusted text is escaped on output. No raw HTML rendering of user or fetched data.
- **S4** Parameterized queries only.
- **S5** No secrets in code, docs, logs, or screenshots. Dependencies are pinned and audited.
- <add project-specific rules>

## 4. UX and Accessibility Standards

- **U1** Every interactive element is keyboard-operable with a visible focus indicator.
- **U2** Every form control has a programmatically associated label. Errors are announced in text, not by color alone.
- **U3** Every list or view has explicit empty, loading, and error states with user-friendly messages.
- **U4** Destructive actions require confirmation or offer undo.
- <add project-specific rules>

## 5. Architectural Constraints

- **A1** Runs locally with a browser UI. No paid cloud service or external database server.
- **A2** Data persists across application restarts.
- **A3** The application must remain runnable on the developer machine through the evaluation period.
- **A4** Code lives only in paths declared in `specs/architecture/component-map.json`.
- <add project-specific constraints>

## 6. Data, Confidentiality and Licensing

- **D1** Synthetic data only. No personal data, client or employer material, or internal URLs.
- **D2** Free or open-source tools and libraries with licenses compatible with this project's use. No cracked or expired-trial software.
- **D3** No copied proprietary code. Suspicious suggestions are replaced by an original implementation.

## 7. Documentation and Evidence Standards

- **E1** AI interactions use the exact Evidence E-<phase>-<number> format. Every interaction is logged, and material ones become records.
- **E2** The six `docs/` files keep the exact mandatory headings and meet minimum evidence counts with complete records.
- **E3** No two artifacts disagree. `/sync-check` is run before every docs rollup commit.

## 8. Governance and Amendments

- Amendments are proposed with `/constitution amend`, approved by a human, and bump the version: MAJOR for a removed or redefined principle, MINOR for an added principle, PATCH for wording.
- Amendments never retroactively legitimize earlier violations. Affected artifacts must be updated.

| Version | Date | Change | Reason | Approved by |
|---|---|---|---|---|
| 1.0.0 | <YYYY-MM-DD> | Initial ratification | — | <handle> |

## 9. Compliance Checklist (used at every gate)

- [ ] P1–P6 respected (spec before code, gate approved, no fabrication, simplest option, incremental, single source of truth)
- [ ] Q1–Q5 quality bars met or explicitly pending
- [ ] S1–S5 security rules applied where input or output is involved
- [ ] U1–U4 UX/a11y rules applied where UI is involved
- [ ] A1–A4 architectural constraints respected
- [ ] D1–D3 confidentiality and licensing respected
- [ ] E1–E3 documentation rules respected

<!-- Completion checklist (validated in /constitution Step 6, then remove this comment):
- [ ] Every clause is testable or checkable at a gate (no "should be good").
- [ ] No technology names appear (they belong in technology.md).
- [ ] Every project-specific addition has a new, unique ID. The <add ...> lines are removed.
- [ ] The version and status match the mode (0.1.0 draft, or 1.0.0 ratified on APPROVE).
- [ ] No placeholders `<...>` or GUIDE comments remain.
-->
