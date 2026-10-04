---
description: "Use when creating or editing anything under specs/: constitution, product spec, backlog, technology, architecture (HLD, data model, ER diagram, component-map.json, amendments), and per-feature spec/lld/tasks/status/evidence. Governance and ownership rules."
applyTo: "specs/**"
---

# Specs Folder Rules

`specs/` is the working source of truth. `docs/` is its published rollup.

## Layout

```
specs/
  constitution.md                 # /constitution — non-negotiable principles (versioned)
  product-spec.md                 # /plan-phase app — problem, requirements, NFR targets, risks
  backlog.md                      # /plan-phase app — feature IDs, requirement mapping, owners, status
  technology.md                   # /technology — stack decisions and tooling commands
  architecture/
    hld.md                        # /architecture — high-level design
    data-model.md                 # /architecture — entities, fields, relationships, persistence
    er-diagram.md                 # /architecture — Mermaid erDiagram
    component-map.json            # /architecture — machine-readable code locations and commands
    amendments/AMD-<nnn>-<slug>.md # /amend-architecture — proposed/applied/rejected changes
  evidence/                       # app-level evidence (IDs 001–099) + interaction-log.jsonl
  features/
    Fnn-<slug>/
      spec.md  lld.md  tasks.md  status.md
      evidence/  (E-<phase>-<id>.md, interaction-log.jsonl)
```

## IDs

- Feature: `F01`…`F99` plus a kebab-case slug, for example `F01-add-bookmark`. `/plan-phase app` assigns them in `backlog.md`.
- Requirements `R01…`, acceptance criteria `Fnn-AC1…`, edge cases `EC01…`, NFRs `NFR-01…`, risks `RK01…`, questions `Q01…`, amendments `AMD-001…`, tasks `Fnn-T01…`, tests `Fnn-TC01…`, findings `Fnn-RV01…` (app level: `APP-…`).

## Ownership and concurrency (multi-developer)

- A feature folder is owned by the developer handle listed in `backlog.md`, for example `dev-1`. Use pseudonymous handles, not real names. Only the owner's sessions write inside that folder.
- **Shared files** (`constitution.md`, `product-spec.md`, `technology.md`, `architecture/**`) are read-only during feature work.
  - Constitution changes go through `/constitution amend` and need human approval plus a version bump.
  - Architecture, data model, and component map changes go through `/amend-architecture` and need human approval plus a `version` bump.
  - `/design-feature` may only **propose** an amendment. The feature status becomes `blocked-on-AMD-<nnn>` until the amendment is applied or rejected.
- `backlog.md` edits are limited to your own row (owner/status).

## component-map.json

- The only authority for where code lives and which commands lint, format, build, start, test, and smoke-check each component.
- `hld.md` contains a human-readable copy of the table. If the two ever differ, the JSON wins and `/sync-check` flags the drift.
- Every `Components affected` value in `spec.md` and `lld.md` must be a component `id` that exists in the JSON.

## Status values (`status.md`, `backlog.md`)

`not-started` → `planned` → `designed` → `built` → `tested` → `reviewed` → `done`. You may also see `blocked-on-AMD-<nnn>` or `blocked-on-human`.
