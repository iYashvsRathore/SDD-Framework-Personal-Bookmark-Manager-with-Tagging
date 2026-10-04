### Evidence E-planning-501

**SDLC activity:** planning

**Task/feature:** F05 Search — produce the feature specification: user stories, testable acceptance criteria for R05 (full) and R11 (partial, EC11), feature-level edge cases, applicable NFRs, scope boundaries against F02, F03, F04, F06 and F07, and the constitution check.

**Context given to AI:** `specs/constitution.md` v1.0.0 (P1, P3, P4, P7, Q1, S1, S4, S6, U1-U3, U5, U6, A4, D1, E1); `specs/product-spec.md` v1 approved (R05/R11 with citations, NFR-01/NFR-03/NFR-04, cross-feature edge cases EC11/EC12/EC22, AS05/C08 confirming search covers title and URL only, not tag names); `specs/backlog.md` (the F05 row: components `api`+`web`, depends on F03, owner `dev-1`, status `not-started`, all four app-level gates approved); `specs/architecture/hld.md` v2 section 6.2 (list/search/filter/paginate flow, shared predicate builder AD-07, the debounced `q` query parameter), section 8 (search text trust-boundary row: trim, cap at 200, bound parameter, `%`/`_`/`\` escaped with `ESCAPE '\'`), section 9 (NFR-01's accepted unindexed-scan cost for `LIKE`, AD-06); `specs/architecture/data-model.md` v3 section 3 (the exact search predicate `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')`, no new index); `specs/architecture/component-map.json` v1; F03's approved `spec.md` (owns loading/error/empty-list states, AS-F03-01's shared builder); F04's approved `spec.md` (sibling feature of identical shape and effort, explicitly hands "combine search with the tag filter" to F05, and names the stale-response guard pattern in its own F04-RK1/F04-EC4); and `docs/mockup.html` (`render()`'s `q` substring match and its AND-combination with `S.tag`, the `empty()` function's exact `search` copy, and the `!n?'none':q?'search':'tag'` precedence rule) — read directly to confirm the AND-combination semantics and the zero-bookmarks-wins-over-search-text precedence before presenting them as defaults rather than guessing.

**Prompt/request:** Run `/plan-phase F05-search`. The human reviewed the planning preview (two assumptions presented with recommended defaults: AS-F05-01 AND combination with an active tag filter, AS-F05-02 no persistence of the search text across reload) and replied `GO` with no corrections.

**AI response summary:** Detected FEATURE-CREATE, verified the backlog/dependency preconditions (F03 `done`, ahead of F05), and read the HLD/data-model/mockup/F03/F04 specs to confirm the shared query builder and the exact `LIKE ... ESCAPE '\'` predicate already specified could be reused without a schema or index change. Treated F04's spec as the closest structural precedent (same depends-on-F03 shape, same `S` effort, same AD-07 builder) and mirrored its stale-response-guard risk (F04-RK1) into a parallel F05-RK1 rather than re-deriving it independently, since both features share the same race shape against the same list endpoint. Presented both assumptions with recommended defaults in the execution preview rather than as blocking questions, since both follow directly from reading the mockup's reference implementation and from precedents F03 and F04 already established and had approved. Wrote `spec.md` (4 stories, 13 AC, 9 edge cases: EC11 and EC12 inherited and fully closed, EC22 inherited with its search half closed here, plus 6 new AI-tagged edge cases), `status.md`, and this evidence record.

**Your decision:** Accepted

**What you changed and why:** Nothing — both recommended defaults (AS-F05-01 AND combination, AS-F05-02 no persistence across reload) were accepted as proposed with no corrections requested.

**How you verified it:** No command was run and no code exists for F05 yet. Agent-side checks were limited to the `/plan-phase` Step 6 checklist, all passing by inspection: both covered R-IDs (R05, R11) have at least one AC; all 13 AC are Given/When/Then with an observable outcome (an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute); all 9 edge cases map to an AC or are named as the half closed here (EC22); `api` and `web` both exist in `component-map.json` v1; and no AC restates behavior F02, F03, F04, F06 or F07 already claim, per section 5.

**Outcome:** worked

**Iteration:** One round. The initial preview already surfaced both assumptions with recommended defaults instead of open questions (no app-level ambiguity remained after reading F03/F04's specs and the mockup), and the human replied `GO` without requesting any change.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
