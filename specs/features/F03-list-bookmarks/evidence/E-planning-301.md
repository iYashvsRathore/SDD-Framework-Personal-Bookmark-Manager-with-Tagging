### Evidence E-planning-301

**SDLC activity:** planning

**Task/feature:** F03 List Bookmarks — produce the feature specification: user stories, testable acceptance criteria for R03, R08 (partial), R11 (partial) and R15, feature-level edge cases, applicable NFRs, scope boundaries against F02, F04, F05, F06 and F07, and the constitution check.

**Context given to AI:** `specs/constitution.md` v1.0.0 (P4, P7, Q1, Q6, S1, S4, U1–U3, U5, U6, A2/A4/A5, D1); `specs/product-spec.md` v1 approved (R03/R08/R11/R15 with citations, NFR-01–NFR-05, cross-feature edge cases EC10/EC19/EC22/EC23/EC24, RK04/RK05); `specs/backlog.md` (the F03 row: components `api`+`web`, depends on F01, owner `dev-1`, four approved app-level gates); `specs/architecture/hld.md` v2 §6.2 (list/search/filter/paginate flow with the shared predicate-and-count builder, AD-07), §7 (screen flow and the pagination U6 deviation already recorded), §9 (NFR-01 index design); `specs/architecture/data-model.md` v3 (`ix_bookmark_list`, `ix_bookmark_tag_lookup`, the NFR-01 seed script in §6); `specs/architecture/component-map.json` v1; F01's approved `spec.md` §5 (explicitly hands F03 the list, its rendering, ordering, pagination and empty state) and F01's already-built code (`routes/bookmarks.js`, `services/bookmark-service.js`, `data/bookmark-repository.js`, all marked as F03 placeholders); and `docs/mockup.html` (count-text wording, card markup, empty-state copy, the `ago()` relative-time function — with no pagination or list-error counterpart).

**Prompt/request:** Run `/plan-phase F03-list-bookmarks`. The human accepted all four recommended defaults in the clarification round, then replied `Go` to the execution preview.

**AI response summary:** Detected FEATURE-CREATE, verified the backlog/owner/dependency preconditions, and built the context brief. Surfaced four scope gaps before asking anything binding: whether F03's card renders tags at all given F02 and F03 are sibling (non-dependent) features; the default page size and whether it persists; whether the relative-time wording follows the mockup's `ago()` function verbatim; and what copy covers the list-fetch-error state, since the mockup's list never fails. Proposed a recommended default for each with its impact, then asked. After acceptance, flagged one further scope point as a correctable assumption rather than a blocking question: that F03 builds the shared predicate/count-query scaffold `hld.md` AD-07 requires, wiring in only the soft-delete and page/size predicates now, so F04 and F05 extend the same builder later instead of each writing a second one (AS-F03-01). Wrote `spec.md` (5 stories, 12 AC, 10 edge cases — 5 inherited with two only partially closed here, 5 new AI-found), `status.md`, and this evidence record.

**Your decision:** Accepted

**What you changed and why:** Nothing — all four recommended defaults (static tag chips for now, default page size 20 not persisted, mockup relative-time wording adopted verbatim, new error-state copy) and AS-F03-01 were accepted as proposed.

**How you verified it:** No command was run and no code exists for F03 yet. The human's verification was a full read-through of `spec.md` against the sources, confirming the AC wording, scope boundaries and edge cases were accurate as drafted. Agent-side checks were limited to the `/plan-phase` Step 6 checklist, all passing by inspection: every covered R-ID (R03, R08, R11, R15) has at least one AC; all 12 AC are Given/When/Then with an observable outcome (an HTTP status and JSON shape, an exact UI string, or a rendered DOM property); 8 of 10 edge cases map to an AC and the other two (EC19, EC22) are named as partially covered with the remainder explicitly handed to a later feature's `/test-phase`; `api` and `web` both exist in `component-map.json` v1; and no AC restates behavior F02, F04, F05, F06, F07 or F08 already claim, per §5.

**Outcome:** worked

**Iteration:** Two rounds. Round 1: preconditions, context brief, four scope questions each with a recommended default, and the first preview. Round 2: the human accepted all four recommendations; the AI restated AS-F03-01 as a correctable assumption in the same preview rather than asking a fifth question, then generated on `Go`.

**Approx. time:** 10 minutes

**Learning:** Reading through the generated spec confirmed it was accurate as drafted; no correction was needed.
