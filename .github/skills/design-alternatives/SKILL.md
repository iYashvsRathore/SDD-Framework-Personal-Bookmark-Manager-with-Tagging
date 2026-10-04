---
name: design-alternatives
description: 'Force at least 2 design alternatives with explicit trade-offs before committing to any architecture, data model, LLD, validation or error-handling decision. Never accept the first design. Use in /architecture, /design-feature, /amend-architecture.'
user-invocable: false
---

# Design Alternatives and Trade-offs

## Inputs

| Input | Used for |
|---|---|
| Requirement, AC, and NFR IDs involved in the decision | The fit column and the recommendation |
| `specs/constitution.md` | The constitution-fit column (P4, A1, S-clauses) |
| `specs/technology.md` | What the chosen stack makes cheap or expensive |
| `hld.md`, `data-model.md` (feature level) | Constraints the option must respect |

## Procedure (per significant decision)

1. **Name the decision** (`AD-nn` at architecture level, `LD-nn` at feature level). For example: "How are tags stored?"
2. **Generate ≥2 genuinely different options.** Straw men don't count. Include the simplest viable option.
3. **Compare** in a table covering: complexity, fit with requirements and NFRs (cite IDs), security impact, testability, change cost, and constitution fit.
4. **Recommend one option**, with a single sentence tying the recommendation to a requirement, NFR, or constitution clause.
5. **Ask the human to choose.** Record the decision as *human-approved* only after they reply.
6. **Record the trade-off accepted.** State what you give up.
7. **Challenge the first design.** Ask: "What breaks this at 1,000 records? On a title-fetch failure? On restart? With keyboard-only use?" If the challenge changes the recommendation, say so. That change is useful evidence.

## Typical decisions for a CRUD web app

- Persistence: embedded SQL vs. JSON file.
- Tag storage: normalized join table vs. a delimited column vs. a JSON array.
- Title fetch: synchronous with a short timeout vs. asynchronous/background with a placeholder.
- Duplicate policy: reject vs. warn-and-offer-to-edit vs. merge tags.
- Delete safeguard: confirm dialog vs. undo toast vs. soft delete.
- Search: `LIKE` with an index vs. a full-text index. Apply pagination limits.

## Output

Decision blocks in `hld.md` §10 or `lld.md` §2. They roll up to `docs/02-design.md` → *Alternatives & Trade-offs*, which needs ≥2 decisions app-wide.

## Validation checklist

- [ ] ≥2 genuinely different options, including the simplest viable one.
- [ ] The comparison covers complexity, fit (with IDs), security, testability, change cost, and constitution fit.
- [ ] The challenge questions were asked, and any change they caused is recorded.
- [ ] The decision is the human's, with a date. The accepted trade-off is stated.

## Common errors

| Error | Correct approach |
|---|---|
| A straw-man second option | An option a reasonable engineer could pick |
| Pros and cons without IDs | Tie each one to a requirement, NFR, or clause |
| Recording the recommendation as the decision | Wait for the human's explicit choice |
| No trade-off stated | Say what the choice gives up |
