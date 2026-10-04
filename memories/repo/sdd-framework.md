# SDD framework — repo-specific notes

## Recurring mistake: interaction-log.jsonl location (fixed twice: F01, F08)

- Feature-scope interactions MUST be appended to `specs/features/<Fnn-slug>/evidence/interaction-log.jsonl`, never to `specs/evidence/interaction-log.jsonl` (that file is app-level only).
- Before appending a log line or creating an evidence record, check the `scope` value: if it names an `Fnn-slug`, the target file is under that feature's own `evidence/` folder (create it if missing).
- Rule is spelled out explicitly in `.github/instructions/evidence-format.instructions.md` under "## Location" (added 2026-10-01 after the F08 recurrence). Re-read that section before the first write of any feature-scope session.
- If found misplaced: copy lines byte-for-byte into the correct per-feature file, renumber `seq` from 1 there, delete them from the wrong file, renumber what remains there from 1. Never alter request/response/timestamps/decisions.

## Canonical feature slugs

- Backlog folder names are the canonical slug (e.g. `F08-dark-mode`), even if a user request uses a different casing/wording (e.g. "F08-Dark-Theme"). Always resolve against `specs/backlog.md`'s Folder column before creating a feature folder.
