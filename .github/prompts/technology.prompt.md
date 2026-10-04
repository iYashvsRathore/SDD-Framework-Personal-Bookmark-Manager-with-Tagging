---
description: "Technology selection (interactive, once). Presents at least 2 options per layer with trade-offs and license checks, records the human's choices and tooling commands in specs/technology.md. Usage: /technology  (re-run to change, requires approval)"
argument-hint: "[change <layer>]"
agent: architect
---

# /technology

**Input:** ${input}

| Item | Value |
|---|---|
| Agent | architect |
| SDLC stage | 2: Technology selection (once; later changes through `change <layer>`) |
| Skills | `technology-selection`, `evidence-logging`, `doc-sync-consistency` (rollup) |
| Instructions | `specs-format`, `security` (dependency hygiene) |
| Template | `technology.template.md` |
| Output | `specs/technology.md` |
| Rolls up to | `docs/02-design.md` → Proposed Solution (technology choices), Alternatives & Trade-offs |
| Next | `/architecture` |

---

## Step 0: Detect the mode

| Mode | Detected when | What happens |
|---|---|---|
| CREATE | `specs/technology.md` does not exist | Context questions → option rounds per layer → document |
| REVISE | The file is `draft` or contains `<!-- REVISE -->` markers | Apply the feedback; re-run options only for layers that changed |
| CHANGE | Input is `change <layer>` and the file is approved | Impact analysis → new option round for that layer → re-approval |
| STOP | Approved, and no `change` argument | Show the decision summary and suggest `change <layer>` |

## Step 1: Check preconditions

| Check | If it fails |
|---|---|
| The constitution is ratified | Stop: run `/constitution` |
| Backlog gate *Product planning* is approved | Stop: run `/plan-phase app` |
| CHANGE: the named layer exists in §1 Decision Summary | List the layers and ask which one |
| CHANGE after `/architecture` is approved | Warn that commands in `component-map.json` and code may change; an `/amend-architecture` may be required |

## Step 2: Load context

| Source | Required | What to extract |
|---|---|---|
| `specs/constitution.md` | Yes | A1 (local, no external DB), D2 (licensing), P4 (simplicity), Q4 (coverage measurement), S5 (pinning and audit) |
| `specs/product-spec.md` | Yes | Capabilities the stack must support (server-side title fetch, search at volume, persistence), and the NFR targets |
| `.github/seeds/*.seed.md` | If present | Stated constraints and security concerns |
| `specs/backlog.md` | Yes | Feature list, to size the stack (avoid over-engineering) |
| Existing code and manifests (`package.json`, `requirements.txt`, `pom.xml`, lockfiles) | If present | Technologies already in use (brownfield). Treat them as the default option and say so. |
| `specs/technology.md` | REVISE, CHANGE | Current decisions, register, change log |
| `specs/architecture/component-map.json` and component code | CHANGE | Commands and code that depend on the layer being changed |
| `${input}` | Yes | Preferences, constraints, the layer to change |

This agent can't run terminal commands. Ask the human which runtimes and versions are installed rather than guessing.

## Step 3: Build the context brief

1. **Capability needs**, derived from the product spec. For example: an HTTP server with HTML forms; outbound HTTP with timeouts for title fetch; HTML title parsing; embedded persistence with unique constraints and indexes; text search over 1,000 rows under the NFR target; a test runner that supports HTTP integration tests; lint and format.
2. **Hard constraints** from the constitution, each with its clause ID.
3. **Environment facts:** OS, installed runtimes (from the human), editor.
4. **Brownfield facts:** technologies already present, with file references.
5. **Layers to decide:** runtime/language, web framework, frontend approach, persistence, HTML parsing, testing, lint/format. Add or drop layers only with a reason.
6. **Gaps** for Step 4.

## Step 4: Clarify, present options, preview

**Round 1: context questions (≤5).** Gap categories:

- Languages the developer is comfortable with, and the installed runtime versions.
- Rendering preference: server-rendered pages, SPA, or static HTML with fetch.
- Version policy: LTS / proven-stable (recommended for evaluation stability) or latest.
- Dependency appetite: minimal dependencies vs. convenience libraries.
- Test style preference (plain runner vs. full framework), and any required tools.

**Rounds 2+: option tables per layer** (`technology-selection` skill; ≤5 layers per round):

```
TD-0n <Layer>
| Option | Pros | Cons | License | Version and maintenance | Constitution fit |
|---|---|---|---|---|---|
| A: <name> | … | … | <SPDX id> | <version or "confirm at install">; <maintained / EOL date> | A1 ✓ D2 ✓ P4 ✓ |
| B: <name> | … | … | … | … | … |
Recommendation: <option>, because <NFR ID or clause ID>.
Your choice?
```

The human picks every layer. A recommendation is never a decision.

**Preview:** once every layer is chosen, **wait for `GO`**:

```
TECHNOLOGY PREVIEW   (mode: <mode>)
Decisions
- <layer>: <choice> <version policy> (<license>), chosen by human on <date>
Tooling commands
- install / format / lint / build / start / test / coverage / audit: <commands>
Dependencies to register: <package, license, purpose>
Constitution fit: A1 <how>, D2 <how>, P4 <how>, Q4 <coverage tool>
CHANGE only: impact on component-map.json <…>, code <…>, docs/02 <…>
Planned actions: write specs/technology.md v<n> (Status: draft); log interaction; draft E-design-00n
Reply GO to generate, or send corrections.
```

## Step 5: Generate

1. Write `specs/technology.md` from the template (version, `Status: draft`, constitution version).
2. §1 Decision Summary: one row per layer with the choice, version, license, and a reason that cites an NFR or clause.
3. §2 One `TD-nn` block per layer with ≥2 options, the human's decision and date, and the accepted trade-off.
4. §3 Tooling commands: install, format, lint, build/type-check (or `null` with the reason "interpreted, no build step"), start, test, coverage (or `null`), audit. `/architecture` copies these into `component-map.json`.
5. §4 Dependency policy and §5 register: only packages actually chosen, each with a license and purpose.
6. §6 Constitution compliance, §7 Clarifications (answers from Step 4), §8 Change log.
7. Versions: use `web` to confirm the current version and license when unsure. If you can't confirm, write "confirm at install". Never state a version as certain when you haven't checked it.
8. **CHANGE:** update only the affected layer, add a change-log row, and list the follow-ups (a `/amend-architecture` if commands or paths in `component-map.json` change, code updates, and `/sync-check`).

## Step 6: Validate

- [ ] Every layer in §1 has a `TD-nn` block with ≥2 genuinely different options.
- [ ] Every decision is marked human-selected with a date.
- [ ] Every choice and every registered dependency has a license, and the license permits this use (D2).
- [ ] No external database server, paid service, or cloud dependency (A1). Local run only.
- [ ] No EOL or unmaintained runtime or framework, unless the human chose it with a recorded reason.
- [ ] Every version is stated or marked "confirm at install".
- [ ] All eight tooling commands are filled in, or `null` with a reason.
- [ ] A coverage-capable tool exists if Q4 sets a coverage target.
- [ ] The register lists only chosen packages; nothing is speculative.
- [ ] Each "why it suits this problem" cites an NFR or clause ID.
- [ ] Names and versions agree across §1, §2, §3, and §5. No placeholders or GUIDE comments remain.

## Step 7: Log evidence

Log every response. The exchange that compared options and trade-offs is usually material: draft `E-design-00n` (app range) and ask the human for their fields.

## Step 8: Gate and handoff

Show the Gate Summary. On `APPROVE`:

- Set `Status: approved`. Mark backlog gate *Technology* as approved with the date.
- Roll up into `docs/02-design.md` → Proposed Solution (the technology choices, each with the reason it suits this problem) and Alternatives & Trade-offs (TD decisions), plus AI Interactions.
- CHANGE: add a `> Changed <date>: <what> (because <why>)` note in `docs/02-design.md` and run `/sync-check`.
- Next: `/architecture` (hand off to the architect agent).

## Critical rules

- Never choose a layer for the human. Never mark a recommendation as a decision.
- Nothing heavier than the NFRs need ("for scalability" is not a reason here).
- No dependency without a license. No version presented as verified when it isn't.
- Ask ≤5 questions or layers per round. Write nothing before `GO`.
