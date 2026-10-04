# AMD-001: Reject dotless hostnames, and align the title-fetch notice with the UX reference

**Status:** Applied (2026-10-01) · apply gate approved by dev-1 on 2026-10-01
**Raised by:** F01-add-bookmark / planning / dev-1
**Date:** 2026-10-01
**Blocks:** — (cleared on apply; previously F01-add-bookmark and F06-edit-bookmark, design onward)

## 1. Problem

Writing `specs/features/F01-add-bookmark/spec.md` surfaced three disagreements between two artifacts that are both approved and both binding: `docs/mockup.html` (the UX reference, constitution U6) and `specs/architecture/hld.md` v1. Constitution E3 forbids two artifacts from disagreeing, so each had to be resolved rather than carried.

dev-1 resolved all three on 2026-10-01 (recorded as C-F01-01…C-F01-03 in the F01 spec). One resolution needs no change here; two require edits to approved architecture artifacts, which only `/amend-architecture` may make.

| # | Disagreement | Ruling | Architecture change needed |
|---|---|---|---|
| 1 | Invalid-scheme message. Mockup: `Please enter a valid web address starting with http:// or https://`. HLD §8: `Enter a web address starting with http:// or https://.` | HLD wording wins | **None.** Recorded instead as a declared U6 deviation in the F01 spec §8, to be justified in `lld.md` |
| 2 | Dotless hostname. Mockup rejects it (`!u.hostname.includes('.')`); HLD §8's validation order requires only "hostname present", so `http://localhost:3000` and `http://intranet` would be accepted and then handed to the title fetcher | Mockup behavior wins — reject | **Yes** — `hld.md` §8 and `data-model.md` INV-01 |
| 3 | Title-fetch-failure notice. Mockup: `Couldn't fetch the title, so we used the domain instead. You can edit it anytime.` HLD §8 table: `Saved. We could not read that page's title, so we used its address.` Separately, the mockup's hostname fallback strips a leading `www.`, which the HLD and INV-06 do not mention | Mockup wording wins, including the `www.` strip (C-F01-04) | **Yes** — `hld.md` §8 error table and §6.1, `data-model.md` INV-06 |

Item 2 is the one with real substance. The current HLD would let `http://localhost:3000` through validation and into the fetcher, where the SSRF guard is expected to catch it. That is a working defence but a single-layered one: every dotless target is a name that only resolves on the local machine or the local network, so refusing it at the validation step removes an entire class of SSRF target before the resolver is consulted at all. Given that RK02 names the SSRF guard as the easiest thing in this project to implement incorrectly, moving the cheapest part of that decision outside the guard is worth an amendment.

## 2. Proposed Change

| Artifact | Current | Proposed |
|---|---|---|
| hld.md §8 *Validation strategy*, URL check order | `trim → non-empty (EC01) → length ≤ 2048 (EC04) → parses as a URL → scheme ∈ {http, https} (EC02, EC03) → hostname present → normalize (EC20) → duplicate lookup (EC05, EC16)` | Replace `hostname present` with `hostname present **and contains a dot** (rejects `localhost`, `intranet` and other single-label names before the fetcher is reached — F01-EC1)`. Order and every other step unchanged |
| hld.md §8 *Security design* trust-boundary table, "Submitted URL" row | `… → scheme ∈ {http, https} → hostname required → normalize (INV-02)` | `… → scheme ∈ {http, https} → hostname required, must contain a dot → normalize (INV-02)`. The row's existing note that rejection happens before any outbound call is considered still holds and now covers one more case |
| hld.md §8 *Error handling* table, `INVALID_URL` row | Cases column reads `EC01, EC02, EC03, EC04` | Append `F01-EC1` to the Cases column. The message column is **unchanged** — a dotless host reuses the existing `Enter a web address starting with http:// or https://.` string (ruling 1) |
| hld.md §8 *Error handling* table, `(not an error) 201` row | User-facing message: `Saved. We could not read that page's title, so we used its address.` | `Couldn't fetch the title, so we used the domain instead. You can edit it anytime.` — the exact string from `docs/mockup.html`, per U6 and C-F01-03 |
| hld.md §6.1 sequence diagram, fetch-failure branch | `F-->>S: { ok: false, reason } -> title = hostname, title_source = 'hostname'` | `F-->>S: { ok: false, reason } -> title = hostname minus leading "www.", title_source = 'hostname'` |
| data-model.md INV-01 | `url` is non-empty, ≤ 2048 characters, and its scheme is `http` or `https`. | Append: `Its hostname must be present and contain at least one dot; single-label names such as` `localhost` `and` `intranet` `are rejected at the boundary.` The "not expressible as a SQLite CHECK, so it is a boundary rule" note already present still applies and needs no change |
| data-model.md INV-06 | `title` is never empty. If no user title is given and the fetch does not yield one, the hostname is used and `title_source = 'hostname'`. | Append: `The hostname is used with a leading` `www.` `removed (C-F01-04), and a fetch that returns an empty or whitespace-only` `<title>` `counts as not yielding one (F01-EC3).` |
| data-model.md §7 Change Log | — | One row: version 2, 2026-10-01, this AMD |
| er-diagram.md | — | **No change.** No entity, field, key or relationship is affected |
| component-map.json | — | **No change.** No component, path or command is affected |

Nothing else in either file changes. No table is added, no decision (AD-01…AD-07) is reopened, and no version of `component-map.json` is bumped.

## 3. Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **A: amend architecture as proposed** | The dot rule and the notice text live in the one place every feature reads, so F01 and F06 cannot drift apart — they share the validation path by HLD §6.3. E3 is satisfied: after this, no two artifacts disagree. The HLD keeps describing what the code actually does, which is the only reason `/review-phase` can use it as a lens | Costs an amendment cycle and a human approval before `/design-feature F01` can start. Bumps `data-model.md` to version 2 while it is one day old |
| B: solve within the feature without amendment — state the dot rule and the notice only in `specs/features/F01-add-bookmark/spec.md` | No amendment, no approval round, F01 design starts immediately | **Rejected.** This is precisely the drift E3 exists to prevent. `hld.md` would keep saying "hostname present" while the code rejects dotless hosts, so the HLD becomes wrong on the exact clause RK02 flags as highest-risk. F06 reuses the same validation path (HLD §6.3) and would be designed from the stale rule, so the two features could legitimately disagree about whether `http://intranet` is savable. And the next reviewer comparing code to the HLD would file a false finding against correct code |
| C: accept the mockup's dotless rejection but treat it as a UI-only convenience, leaving the API permissive | The mockup's behavior is reproduced exactly with no server change | **Rejected.** Violates S1. The API is reachable directly with `curl`, so a client-only rule is not a rule. It would also make F01-AC8 untestable as written, since that AC asserts a 400 from the API |
| D: drop the dot rule and rely on the SSRF guard alone | No amendment; one fewer rule to maintain; the guard already blocks loopback and private ranges | **Rejected by dev-1's ruling C-F01-02.** Defensible on its own terms, but it concentrates the whole defence in the component RK02 names as the most error-prone in the project, and it leaves `http://intranet` resolving to a public-looking corporate address as an accepted bookmark target |

## 4. Impact Analysis

- **Features affected:**
  - **F01-add-bookmark** — spec is already written at the post-amendment position (F01-AC5, F01-AC8, F01-EC1, F01-EC3). Its `lld.md` and code must be written against the amended HLD. No spec rework needed if this AMD is approved as proposed; if it is rejected or modified, F01's spec §7 and the affected AC must be revised.
  - **F06-edit-bookmark** — not yet planned. It reuses F01's validation and normalization path per HLD §6.3, so it inherits both changes. Planning it after this AMD is applied avoids rework entirely.
  - F02, F03, F04, F05, F07, F08 — unaffected. None touches URL validation or the title fetch.
- **Migration/backward compatibility:** none required. No schema object changes, so no migration and no `user_version` bump. The rule is stricter than the current one, so no previously stored row becomes invalid; and no row exists yet, since no code has been written.
- **Test impact:** `/test-phase F01` gains the F01-EC1 dotless-host probe and the F01-EC3 empty-title case. The NFR-04 probe list in `product-spec` §4 is unchanged — it already lists `127.0.0.1`, which is a different case.
- **Constitution check:** pass, and improves two clauses. **S1** — validation strengthens at the boundary. **S2** — one class of SSRF target is removed before the resolver runs, which directly addresses RK02. **U6** — the fetch-failure notice moves *to* the approved reference's wording rather than away from it. **P6** — the rule ends up in one place instead of two. **E3** — resolves the disagreement rather than documenting it.

## 5. Decision (human)

- **Decision:** Approve — recorded verbatim: "**Decision**: Approved"
- **Reason:** recorded verbatim: "**Reason**: Product team wants the outlined behaviour"
- **Decided by:** dev-1, 2026-10-01
- **Scope of the approval:** the change is approved **as proposed** in §2 — no Modify text was supplied, so every row of §2 is applied exactly as written and nothing outside it is touched.

## 6. Application Record

Applied 2026-10-01 by `/amend-architecture apply AMD-001` after dev-1's recorded decision. Evidence: E-design-101.

| Artifact | New version | Changed on | Verified by |
|---|---|---|---|
| `hld.md` | 2 | 2026-10-01 | Inspection only — each target string was read from the live file before replacement, and the result re-read. No command was run; nothing here is executable yet. |
| `data-model.md` | 2 | 2026-10-01 | Inspection only — INV-01 and INV-06 re-read after edit; §7 change-log row added stating no schema object changed and `user_version` stays 1. |
| `er-diagram.md` | 2 | 2026-10-01 | Inspection only — **out of the §2 scope, applied by exception** (see below). Version pointer only; no entity, field, key, relationship or Mermaid line changed. |
| `component-map.json` | 1 (unchanged) | — | Not opened for writing, as §2 requires. |
| `docs/02-design.md` | — | 2026-10-01 | Final position rolled up in Data Model, Error Handling and Security Design, with the `> Changed 2026-10-01 … (see AMD-001)` note. |

**One exception to "nothing outside §2 was changed".** §2 declared `er-diagram.md` unchanged, but its line 3 reads `**Data model version:** 1 (must match data-model.md)`. Leaving it at 1 while `data-model.md` became 2 would have made the two artifacts disagree — the exact E3 defect this amendment exists to remove — and would have failed the `/amend-architecture` validation rule that the two versions match. The pointer was moved to 2 **only after dev-1 was asked and replied `Go`**; no diagram content was touched.

### Follow-up for feature owners

| Feature | Previous status | Restored to | What must change |
|---|---|---|---|
| F01-add-bookmark (dev-1) | `planned`, design blocked on AMD-001 | `planned`, design unblocked | Nothing in `spec.md` — it was written at the post-amendment position. `lld.md` must specify the dot check in the URL validator and the leading-`www.` strip in the title fallback; `tasks.md` must carry both; tests must cover F01-EC1 and F01-EC3. Run `/design-feature F01-add-bookmark`. |
| F06-edit-bookmark (dev-1) | `not-started` | `not-started` | Not yet planned, so no rework. It inherits both rules through the shared validation path (HLD §6.3); plan it against `hld.md` v2. |
