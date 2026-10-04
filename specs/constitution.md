# Project Constitution

**Project:** TagVault
**Version:** 1.0.0
**Status:** ratified
**Ratified:** 2026-09-30
**Last amended:** —

> This file defines the **non-negotiable** governing principles, quality bars, and constraints for this project. Every spec, design, task, code change, test, and review MUST comply. Agents check their output against the Compliance Checklist (section 9) at every gate.
> Technology choices are **not** recorded here. They belong in `specs/technology.md`, which must itself comply with this constitution.

## 1. Core Principles

- **P1 Specification before code.** No code is written for a feature until its `spec.md` and `lld.md` are approved.
- **P2 Human approval gates.** No phase starts until the previous phase's gate is approved by a human.
- **P3 Honesty over polish.** No fabricated interactions, results, timings, or approvals. Unknowns are `TODO(human)`.
- **P4 Simplicity first.** Choose the simplest design that meets the requirements. Core requirements come before optional enhancements.
- **P5 Incremental delivery.** Build one task at a time. The application must build and run after every task.
- **P6 Single source of truth.** Shared decisions live in one place (see `specs/` layout). Later changes update earlier artifacts.
- **P7 Measurable requirements.** Every functional requirement carries at least one testable Given/When/Then acceptance criterion, and every non-functional requirement carries a numeric target plus the method used to measure it. *Checked at the planning gate by inspection of `product-spec.md` and each feature `spec.md`.*

## 2. Quality Standards

- **Q1** Every acceptance criterion has at least one automated test, or a documented manual check where automation isn't practical.
- **Q2** Tests are executed. Only observed results are recorded.
- **Q3** Zero lint errors and zero build errors before a task is marked done.
- **Q4** Test coverage target: **≥ 80% line coverage on business/service logic**, measured by the coverage tool declared in `specs/technology.md`. The observed percentage and the command that produced it are recorded in `docs/04-testing.md`.
- **Q5** No known Critical or High review finding is left open at release.
- **Q6 Measured non-functional verification.** Performance and persistence NFRs are verified by an actual measured run at the documented data volume (1,000 records). Estimates, extrapolations, and "should be fast" statements are not accepted. *Checked in `/test-phase`; the Test Matrix records the observed number.*

## 3. Security Standards

- **S1** All external input is validated at the boundary. URLs allow `http`/`https` only.
- **S2** Server-side fetches of user-supplied URLs are SSRF-guarded: private/loopback ranges are blocked, and timeouts, size caps, and redirect re-validation are in place.
- **S3** All untrusted text is escaped on output. No raw HTML rendering of user or fetched data.
- **S4** Parameterized queries only.
- **S5** No secrets in code, docs, logs, or screenshots. Dependencies are pinned and audited.
- **S6 Search text is data, never a pattern.** Search and tag-filter input is never interpreted as a query pattern or as markup: pattern-matching wildcards are escaped before the value reaches persistence, and the value is escaped again on output. *Checked by a negative test case plus review.*

## 4. UX and Accessibility Standards

> Target standard: **WCAG 2.1 AA where practical**, verified by manual keyboard walkthrough and label inspection at the review gate.

- **U1** Every interactive element is keyboard-operable with a visible focus indicator.
- **U2** Every form control has a programmatically associated label. Errors are announced in text, not by color alone.
- **U3** Every list or view has explicit empty, loading, and error states with user-friendly messages.
- **U4** Destructive actions require confirmation or offer undo.
- **U5 Actionable errors.** Every user-facing error states what went wrong and what the user can do next. Stack traces, internal identifiers, and raw exception text are never shown to the user. *Checked by review.*
- **U6 Approved UX reference.** The UI follows the approved UX reference at `docs/mockup.html` for layout, state coverage (empty, loading, error, no-results), error placement, and confirmation/undo patterns. Any deviation is recorded in the feature `lld.md` with a reason. The reference's **storage mechanism is not binding** — persistence is governed by A2 and A5. Externally hosted assets are permitted provided they satisfy A1 and D2. *Checked by review against the reference.*

## 5. Architectural Constraints

- **A1** Runs locally with a browser UI. No paid cloud service or external database server.
- **A2** Data persists across application restarts.
- **A3** The application must remain runnable on the developer machine (Windows) through the evaluation period.
- **A4** Code lives only in paths declared in `specs/architecture/component-map.json`.
- **A5 Embedded, file-based persistence.** Persistence is embedded and file-based inside the project workspace. Running the application requires no separate database server process and no container runtime. *Checked by inspection of the start command in `component-map.json` and of `technology.md`.*

## 6. Data, Confidentiality and Licensing

- **D1** Synthetic data only. No personal data, client or employer material, or internal URLs.
- **D2** Free or open-source tools and libraries with licenses compatible with this project's use. No cracked or expired-trial software.
- **D3** No copied proprietary code. Suspicious suggestions are replaced by an original implementation.

## 7. Documentation and Evidence Standards

- **E1** AI interactions use the exact Evidence E-&lt;phase&gt;-&lt;number&gt; format. Every interaction is logged, and material ones become records.
- **E2** The six `docs/` files keep the exact mandatory headings and meet minimum evidence counts with complete records.
- **E3** No two artifacts disagree. `/sync-check` is run before every docs rollup commit.

## 8. Governance and Amendments

- Amendments are proposed with `/constitution amend`, approved by a human, and bump the version: MAJOR for a removed or redefined principle, MINOR for an added principle, PATCH for wording.
- Amendments never retroactively legitimize earlier violations. Affected artifacts must be updated.
- Amendment approver: `dev-1`.

| Version | Date | Change | Reason | Approved by |
|---|---|---|---|---|
| 1.0.0 | 2026-09-30 | Initial ratification | — | dev-1 |

## 9. Compliance Checklist (used at every gate)

- [ ] P1–P7 respected (spec before code, gate approved, no fabrication, simplest option, incremental, single source of truth, measurable requirements)
- [ ] Q1–Q6 quality bars met or explicitly pending (including the measured NFR runs)
- [ ] S1–S6 security rules applied where input or output is involved
- [ ] U1–U6 UX/a11y rules applied where UI is involved, including conformance to the approved UX reference
- [ ] A1–A5 architectural constraints respected
- [ ] D1–D3 confidentiality and licensing respected
- [ ] E1–E3 documentation rules respected

## 10. Project Context (non-negotiable inputs)

| Item | Value | Source |
|---|---|---|
| Purpose | Save, tag, search and filter personal bookmarks locally in a browser | `.github/seeds/bookmark-manager.seed.md` |
| Developer handle | `dev-1` | Human answer, 2026-09-30 |
| UX reference | `docs/mockup.html` (layout, states, copy, interaction patterns) | Human-supplied, 2026-09-30 |
| Network availability | The application may rely on network availability at load; offline operation is **not** required | Human answer, 2026-09-30 |
| Browser `localStorage` | Explicitly **not** an acceptable persistence mechanism. A2 and A5 require storage that survives an application restart independently of the browser profile. | Human answer, 2026-09-30 |
| Team size | One developer, sole owner of every feature | Human answer, 2026-09-30 |
| Time box | Application complete by **2026-10-05** (5 days from ratification on 2026-09-30). Scope is cut to the mandatory requirements first; optional enhancements are deferred by default. | Human answer, 2026-09-30 |
| Requirement source | `docs/AI SDLC Course 101 Assignment - 1.pdf` — binary, not readable by the agent; the seed file is used as the cited stand-in | Session fact, 2026-09-30 |
