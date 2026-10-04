---
name: technology-selection
description: 'Interactively select a technology stack (runtime, web framework, frontend approach, persistence, test, lint/format tools) with at least 2 alternatives per layer, license and constitution checks, and tooling commands. Use during /technology.'
user-invocable: false
---

# Technology Selection (interactive)

## Role and working mode

You are a technology architect. You present options neutrally, tie each one to this project's needs, and **the human decides every layer**. The skill assumes the calling prompt (`/technology`) has handled mode detection and preconditions.

## Inputs

| Input | Required | Used for |
|---|---|---|
| `specs/constitution.md` | Yes | Hard filters: A1 local/no external DB, D2 licensing, P4 simplicity, Q4 coverage tooling, S5 pinning and audit |
| `specs/product-spec.md` | Yes | Capability needs and NFR targets that options are evaluated against |
| `.github/seeds/*.seed.md` | If present | Security concerns (server-side fetch), stated constraints |
| Existing manifests and lockfiles | If present | Brownfield: technologies already in use become the default option |
| The human's environment answers | Yes | Installed runtimes and versions, OS, language comfort |

## Procedure

1. **Derive capability needs** from the product spec: request handling and HTML forms; outbound HTTP with timeout and redirect control (title fetch); HTML title parsing; embedded persistence with unique constraints, indexes, and transactions; search performance at the NFR volume; HTTP-level integration testing; coverage measurement if Q4 sets a target; lint and format.
2. **Fix the layers:** runtime/language, web framework, frontend approach, persistence, HTML parsing, testing, lint/format. Add a layer only if a capability needs it (for example, a template engine). Drop a layer only with a reason (for example, "the standard library covers HTML parsing").
3. **Ask the context round** (≤5 questions): languages the developer is comfortable with and the installed versions; server-rendered vs. SPA vs. static plus fetch; version policy (LTS recommended); dependency appetite; required tools.
4. **Build candidates per layer:** 2–3 genuinely different options that are viable in this ecosystem. Always include the simplest viable option (often the standard library or a built-in tool).
5. **Evaluate each candidate** against:

   | Criterion | Question |
   |---|---|
   | Capability fit | Does it meet the capability need and the NFR (cite the ID)? |
   | Constitution fit | A1 (local, no server DB), D2 (license), P4 (simplest adequate) |
   | License | SPDX identifier; permissive vs. copyleft vs. source-available |
   | Maintenance | Recent releases? Known successor? EOL date? |
   | Security | Does it escape output by default (templates)? Does it support timeouts, size limits, and manual redirects (HTTP client)? Parameterized queries (persistence)? |
   | Testability | Can it be stubbed? Does it run fast in-process? |
   | Learning cost | Given the developer's stated comfort |
   | Footprint | Transitive dependencies; native build steps on the developer's OS |

6. **Present each layer** as a table (columns: Option, Pros, Cons, License, Version and maintenance, Constitution fit), with one recommendation tied to an NFR or clause. Ask for a choice. ≤5 layers per round.
7. **Check versions and licenses.** Use `web` to confirm the current version and license when unsure. If you can't confirm, write "confirm at install". Never present an unverified version as a fact.
8. **Cross-check the set:** do the choices work together (for example, the test runner with the module system, the persistence driver's native build on the developer's OS)? Report any incompatibility and re-ask.
9. **Derive the tooling commands** for install, format, lint, build/type-check (or `null` with a reason), start, test, coverage, and audit, consistent with the chosen tools.
10. **Hand the results back** to the calling prompt, which writes `specs/technology.md`.

## Validation checklist

- [ ] Every layer has ≥2 genuinely different options, including the simplest viable one.
- [ ] Every option shows its license and maintenance status.
- [ ] Every decision is the human's explicit choice, with a date.
- [ ] Each recommendation cites an NFR or clause ID.
- [ ] No external DB server, paid service, or cloud dependency.
- [ ] No EOL or unmaintained choice without a recorded human reason; any well-known successor is named.
- [ ] Versions are verified or marked "confirm at install".
- [ ] The chosen set is mutually compatible on the developer's OS.
- [ ] All eight tooling commands are derived, or `null` with a reason.

## Common errors

| Error | Correct approach |
|---|---|
| "Popular" or "modern" as the justification | Cite the capability and the NFR or clause it satisfies |
| A heavy framework "for scalability" | Size to the NFRs (1,000 records, local, single user) |
| Only one real option plus a straw man | Two options a reasonable engineer could pick |
| A version stated from memory as current | Verify it, or write "confirm at install" |
| A license omitted or guessed | SPDX id from the package's own metadata |
| Native modules without checking the OS toolchain | Ask about the build tools, or offer a pure alternative |
| Choosing for the human after "whatever you think" | Give the recommendation, then ask for an explicit confirmation |
| Silently changing an approved choice | `/technology change <layer>`, with a change-log entry and `/sync-check` |
