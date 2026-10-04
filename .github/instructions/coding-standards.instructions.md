---
description: "Use when writing or modifying application source code (frontend, backend, scripts). Coding standards: constitution compliance, component-map path resolution, simplicity, validation at boundaries, lint/format/build hygiene."
applyTo: "**/*.{js,mjs,cjs,ts,tsx,jsx,py,java,cs,go,rb,php,html,ejs,hbs,njk,css,scss,vue,svelte}"
---

# Coding Standards

## Before writing code

- Read `specs/constitution.md`, `specs/technology.md`, and the feature's `lld.md` and `tasks.md`.
- Resolve the target path through `specs/architecture/component-map.json` (`workspaceRoot` + `path`). If the file you want to touch is outside every declared component path, **stop and ask**.
- Implement one task (`Fnn-Txx`) at a time. Don't implement other features or optional enhancements.

## Style

- Follow the conventions, linter, and formatter declared in `specs/technology.md`. Don't introduce a different style.
- Use small, single-purpose functions and descriptive names. Keep route or controller, service or business logic, and data access separate, as the HLD describes.
- Don't add speculative abstractions, helpers for one-time use, or dead code.
- Add comments only where the intent isn't obvious. Don't add comments or docstrings to code you didn't change.

## Correctness and safety

- Validate all external input at the system boundary (HTTP handlers and form submit) and again at the service layer for invariants. Return clear, user-understandable messages.
- Use parameterized queries or ORM bindings only. Never concatenate strings into SQL.
- Escape output by default (template auto-escaping or `textContent`). Never use `innerHTML` or `| safe` with user-supplied or fetched data.
- Handle errors explicitly. Don't swallow exceptions, and don't leak stack traces to the UI.
- Use no secrets, no real personal data, and no hard-coded internal URLs. Use synthetic data (`https://example.com`).
- Before adding any dependency, confirm it's free and open source with a compatible license, is actively maintained, and is listed or added in `specs/technology.md`. Pin its version.

## After writing code (per task)

Follow the `build-verify-loop` skill: format → lint (fix) → build → start → smoke check → run existing tests. Allow at most **3** fix attempts per task. After that, stop and report to the human.
