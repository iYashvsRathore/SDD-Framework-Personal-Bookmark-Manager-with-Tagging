# F04: Filter by Tag (Status)

**Owner:** dev-1
**Current status:** done

| Phase | Command | Status | Gate approved on | Evidence IDs | Notes |
|---|---|---|---|---|---|
| Planning | /plan-phase F04-filter-by-tag | approved | 2026-10-01 | E-planning-401 | `spec.md` approved by dev-1. 4 stories, 12 AC, 7 edge cases (2 inherited, 1 inherited-partial, 4 new AI). Two assumptions recorded (AS-F04-01 single-select, AS-F04-02 no persistence), both accepted as recommended defaults, no blocking questions raised |
| Design (LLD) | /design-feature F04-filter-by-tag | approved | 2026-10-01 | E-design-401 | `lld.md` (14 sections, no architecture impact) and `tasks.md` (12 tasks, F04-T01…T12, all 12 AC and all 7 edge cases covered) approved by dev-1. LD-01…LD-06 (`buildPredicate({ tag })`'s object-param signature, a separate `normalizeTagFilterValue()`, rail+count reload on every `loadList()`, a new `GET /api/bookmarks/count` route, a new `TagRail` component, the active-filter chip rendered beside `#count`) all answered "Accept Recommendation" |
| Build | /build-feature F04-filter-by-tag | approved | 2026-10-01 | E-build-402, E-build-403, E-build-404 | All 12 tasks (F04-T01…T12) built and build-verified: 389/389 api tests, 149/149 web tests (12 new F04 store tests), clean `ng build` (183.37 kB), full smoke contract 200 throughout. One test failure total across the whole build (T09's missing `aria-hidden` wrapper, fixed in 1 attempt). T11's async/microtask-timing test-design bug was caught and corrected via code review before any test run. F04-T12 keyboard walkthrough confirmed pass by dev-1 against the live app |
| Testing | /test-phase F04-filter-by-tag | approved | 2026-10-03 | E-testing-401 | All 12 AC + 7 EC re-run via existing build-authored tests (389 api / 149 web baseline grew to 506 api / 207 web across the whole suite, which now also carries F05). Two genuine test-phase gaps closed: NFR-01's tag-filter half (previously unmeasured) and a dedicated read-path security probe on `?tag=` (previous probe only covered the tag *write* path). NFR-01 tag filter: **median=15ms, max=23ms (n=20)** at 1,000 seeded bookmarks, target <500ms — Pass. Security probe (`tag-security-probe.test.js`, new describe block): SQL-metacharacter and XSS-shaped `?tag=` values — both return 200 with zero matches, tables intact — Pass (2/2). Full suite this phase: api **506/506** (30 files), web **207/207** (15 files), 0 failures. Coverage **97.05% stmts / 90.27% branch / 96.25% funcs / 98.87% lines** over `src/services`+`src/lib` (Q4 target 80%). F04-AC11's keyboard walkthrough is cited from the Build gate (F04-T12, dev-1 confirmed pass 2026-10-01) and not re-run this phase — no UI code changed since |
| Review | /review-phase F04-filter-by-tag | approved | 2026-10-03 | E-review-401 | 3 findings raised (F04-RV01 Low, F04-RV02 Low, F04-RV03 Info), all maintainability/documentation in nature — no Critical/High/Medium finding, no AC/security/accessibility violation. dev-1 accepted the suggested fix for all 3. Fixes applied: clarified the `selectTag`/`toggleTagFilter` cross-reference comments (RV01), documented the EC17 fallback's accepted double-fetch/one-frame-flash trade-off (RV02), reworded the `/bookmarks/count` route-ordering comment to forward-looking guidance (RV03). All 3 fixes are comment/doc-only, no behavior change. Verified: api **511/511** (30 files), web **207/207** (15 files), `npx prettier --check .` clean and `npx eslint .` 0 errors in both components, `npx ng build` clean (194.76 kB initial total) |
| Rolled up to docs | (automatic after each gate) | pending | | | |

## Open TODO(human)

- E-planning-401: **Approx. time** and **Learning** fields still open.
- E-design-401: **Approx. time** and **Learning** fields still open.
- E-build-402, E-build-403, E-build-404: **Approx. time** and **Learning** fields still open.
- E-testing-401: **Approx. time** and **Learning** fields still open.
- E-review-401: **Approx. time** and **Learning** fields still open.

## Rolled up to docs

- `docs/01-planning.md`: `### F04` block added to User Stories & Acceptance Criteria; running totals updated to 18 stories / 54 AC across 4 of 8 features; 4 new edge cases (F04-EC1…F04-EC4) merged into Edge Cases (45 total: 16 assignment / 28 AI / 1 human); E-planning-401 copied verbatim into AI Interactions.
- `docs/03-build.md`: `### F04 Filter by Tag` block added to Implementation Plan vs. Actual; Feature Evidence Matrix "Filter by Tag" row updated to Done with evidence IDs from build; Troubleshooting items 11-12 added (T09 icon-wrapper fix, T11 async-timing test-design catch); E-build-402/403/404 copied verbatim into AI Interactions.
- `docs/04-testing.md`: NFR-01/NFR-03 Test Strategy notes extended for F04's tag-filter half; 17 Test Matrix rows added (F04-TC01…TC17); 1 AI-discovered edge case (the `?tag=` read-path security probe) added; Fail→Fix→Retest noted as none; E-testing-401 copied verbatim into AI Interactions; 2 Known Limitations entries appended (cited manual walkthrough, EC17's simulated trigger). `docs/03-build.md`: Feature Evidence Matrix "Filter by Tag" row's "How AI helped"/"How I verified" columns extended with the `/test-phase` evidence ID and observed counts.
- `docs/05-review.md`: `### F04 Filter by Tag` block added to Review Scope; 3 findings (F04-RV01, RV02, RV03) added to Findings; Accepted Feedback section extended; E-review-401 copied verbatim into AI Interactions. `docs/03-build.md`: Feature Evidence Matrix "Filter by Tag" row status confirmed `Done`.

## Blockers

- None. F02 (`designed`) and F03 (`done`) are both ahead of F04 in the dependency graph; `hld.md` v2 and `data-model.md` v3 already describe the shared predicate builder (AD-07/AS-F03-01) and the tag-lookup index F04 extends.
