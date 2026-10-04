# AMD-004: Add `INVALID_THEME` to the error-handling table

**Status:** Applied (2026-10-01) · apply gate approved by dev-1 on 2026-10-01
**Raised by:** F08-dark-mode / design / dev-1
**Date:** 2026-10-01
**Blocks:** — (cleared on apply; previously F08-dark-mode, design)

## 1. Problem

`specs/features/F08-dark-mode/spec.md` F08-AC6 and C-F08-03 are approved: `PUT /api/settings/theme` with an invalid or missing `theme` value must be rejected with `400`, `error.code='INVALID_THEME'`, `error.field='theme'`, and the exact message `Theme must be "light" or "dark".` — matching the existing `INVALID_URL`/`INVALID_TAG` contract shape.

`hld.md` v3 §8 defines a closed error-handling table (`INVALID_URL`, `DUPLICATE_URL`, `INVALID_TAG`, `NOT_FOUND`, `EDIT_CONFLICT`, `STORAGE_ERROR`). `INVALID_THEME` is not a member. This is the same situation AMD-003 resolved for `EDIT_CONFLICT`: writing F08's LLD against an error code the shared HLD does not describe would be the E3 drift AMD-001/002/003 all exist to prevent.

`data-model.md` v3 already defines `setting.value`'s `CHECK` restricted to `'light'`/`'dark'` at the service boundary (AD-05) — the data-level invariant is already approved; only the response contract (status code, error code, field, message) is missing from `hld.md` §8.

## 2. Proposed Change

| Artifact | Current | Proposed |
|---|---|---|
| `hld.md` §8 *Error handling* table | Rows: `INVALID_URL`, `DUPLICATE_URL`, `INVALID_TAG`, `NOT_FOUND`, `EDIT_CONFLICT`, `STORAGE_ERROR`, `(not an error) 201` | Insert one row after `INVALID_TAG`: `INVALID_THEME` \| `400` \| `Theme must be "light" or "dark".` \| `F08-AC6, F08-EC2` |
| `hld.md` header | `**Version:** 3` | `**Version:** 4` |
| `hld.md` **Status** line | `approved (dev-1, 2026-10-01); amended by AMD-001, AMD-002, AMD-003 (dev-1, 2026-10-01)` | `approved (dev-1, 2026-10-01); amended by AMD-001, AMD-002, AMD-003, AMD-004 (dev-1, 2026-10-01)` |
| `data-model.md` | — | **No change.** `setting.value`'s `CHECK` (AD-05) already covers the data-level invariant; this amendment adds only the API response contract |
| `er-diagram.md` | — | **No change.** No entity, field, key or relationship affected |
| `component-map.json` | — | **No change.** No component, path or command affected |

Nothing else in `hld.md` changes. No decision (AD-01…AD-07) is reopened, and no other error code's wording is touched.

## 3. Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **A: amend `hld.md` as proposed** | `INVALID_THEME` lives in the one place every feature and reviewer reads, exactly where `INVALID_TAG` and `EDIT_CONFLICT` already live. Closes the gap before the LLD is written against it. One row in one table, one version bump — no schema change, no new dependency | Costs an amendment cycle and a human approval before the LLD can be finalized |
| B: solve within the feature without amendment — define `INVALID_THEME` only in `spec.md`/`lld.md`, leave `hld.md` §8 as the six-code table it is today | No amendment cycle | **Rejected**, for the same reason AMD-001/002/003 §3 option B were all rejected: `hld.md` would keep describing a closed error taxonomy while shipped code returns a code outside it. `/review-phase` compares code to `hld.md` and would file a finding against correct, spec-approved code |

## 4. Impact Analysis

- **Features affected:** F08-dark-mode only — this is the amendment unblocking its `lld.md`. F01–F07 are unaffected; none returns or consumes `INVALID_THEME`.
- **Migration/backward compatibility:** none required. No schema object changes — `setting`'s `CHECK` constraint already exists (data-model.md v3, AD-05).
- **Test impact:** `/test-phase F08-dark-mode` gains the F08-AC6 validation probe (invalid/missing `theme` → 400 `INVALID_THEME`) once F08 is built.
- **Constitution check:** pass. **S1** — boundary validation against a two-value allow-list. **P4** — one row in one existing table; no new table, dependency, or persisted field. **E3** — resolves the disagreement this amendment exists to prevent.

## 5. Decision (human)

- **Decision:** Approve — option A
- **Reason:** dev-1 accepted the recommendation during `/design-feature F08-dark-mode` ("accept all recommendation")
- **Decided by:** dev-1, 2026-10-01
- **Scope of the approval:** the change is approved **as proposed** in §2 — every row is applied exactly as written and nothing outside it is touched.

## 6. Application Record

Applied 2026-10-01, from `/design-feature F08-dark-mode`, following the AMD-001/002/003 precedent of applying inline during feature design rather than as a separate `/amend-architecture` invocation.

| Artifact | New version | Changed on | Verified by |
|---|---|---|---|
| `hld.md` | 4 | 2026-10-01 | Inspection only — the target row and the Status/header lines were read from the live file before insertion, and the result re-read. No command was run; nothing here is executable yet |
| `data-model.md` | 3 (unchanged) | — | Not opened for writing, as §2 requires |
| `er-diagram.md` | (unchanged, still at v3) | — | Not opened for writing, as §2 requires |
| `component-map.json` | 1 (unchanged) | — | Not opened for writing, as §2 requires |
| `docs/02-design.md` | — | 2026-10-01 | Rolled up in Error Handling and Security Design, with a `> Changed 2026-10-01 … (see AMD-004)` note, at the `/design-feature F08-dark-mode` gate |

### Follow-up for feature owners

| Feature | Previous status | Restored to | What must change |
|---|---|---|---|
| F08-dark-mode (dev-1) | `planned`, design blocked on this amendment | `planned`, design unblocked | `lld.md` must specify the `INVALID_THEME` check using the exact message in this amendment; `tasks.md` must carry it; tests must cover F08-AC6. Continuing now in the same `/design-feature F08-dark-mode` session. |
