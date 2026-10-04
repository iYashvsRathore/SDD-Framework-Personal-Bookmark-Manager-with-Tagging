<!-- GUIDE: Filled by /architecture. Sources: product-spec R-IDs and edge cases (duplicates, persistence), technology.md (persistence choice), and constitution A1, A2, S4. After approval, change it only through /amend-architecture. Keep the Version equal to er-diagram.md. Remove every GUIDE comment once its section is filled. -->
# Data Model

**Version:** <n>
**Status:** draft | approved

> Shared artifact. Change only through `/amend-architecture`. The ER diagram lives in `er-diagram.md` and must match this file.

## 1. Entities

### <Entity>

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | | PK | |

## 2. Relationships

| From | To | Cardinality | Enforced by |
|---|---|---|---|

## 3. Indexes and Query Approach

<!-- GUIDE: Each index names the feature or NFR ID it serves (for example, the search NFR at 1,000 records). -->

| Index | Supports (feature / NFR) |
|---|---|

## 4. Data-Level Validation and Invariants

- <e.g. normalized URL unique>

## 5. Persistence and Restart Survival

- **Storage medium and location:** <file path, declared in component-map.json>
- **Write durability:** <transactions / atomic write>
- **Schema creation and migration on startup:** <approach>
- **Backup / recovery:** <approach>

## 6. Seed and Test Data

- Synthetic only (`https://example.com/...`).

## 7. Change Log

| Version | Date | Change | Why | AMD |
|---|---|---|---|---|

<!-- Completion checklist (validated in /architecture or /amend-architecture Step 6, then remove this comment):
- [ ] Every entity and field needed by an R-ID exists. None exist without a need.
- [ ] Relationships and cardinalities match er-diagram.md. The versions are equal.
- [ ] The duplicate rule is enforced at data level (§4) as well as in the app.
- [ ] The §5 storage location matches component-map.json dataStore.location.
- [ ] No placeholders `<...>` or GUIDE comments remain.
-->
