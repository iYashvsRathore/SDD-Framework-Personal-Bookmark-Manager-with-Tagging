### Evidence E-planning-401

**SDLC activity:** planning

**Task/feature:** F04 Filter by Tag — produce the feature specification: user stories, testable acceptance criteria for R04 (full) and R11 (partial, EC13), feature-level edge cases, applicable NFRs, scope boundaries against F02, F05, F06, F07 and F08, and the constitution check.

**Context given to AI:** `specs/constitution.md` v1.0.0 (P1, P3, P4, P7, Q1, S1, S4, U1-U3, U5, U6, A4, D1, E1); `specs/product-spec.md` v1 approved (R04/R11 with citations, NFR-01/NFR-03/NFR-04, cross-feature edge cases EC13/EC17/EC22); `specs/backlog.md` (the F04 row: components `api`+`web`, depends on F02+F03, owner `dev-1`, status `not-started`, all four app-level gates approved); `specs/architecture/hld.md` v2 section 6.2 (list/search/filter/paginate flow, shared predicate builder AD-07), section 9 (NFR-01 index design); `specs/architecture/data-model.md` v3 (`ix_bookmark_tag_lookup`, the tag-list query in section 3 that already excludes tags with zero live bookmarks); `specs/architecture/component-map.json` v1; F02's approved `spec.md` (owns tag entry/autocomplete, explicitly hands click-to-filter to F04); F03's approved `spec.md` section 5 (renders tags as static non-interactive chips, explicitly hands the click handler and the empty-tag-filter state to F04; AS-F03-01's shared builder); the already-built code `app/api/src/services/list-query.js` (`buildPredicate()`), `app/api/src/data/tag-repository.js` (`listWithLiveBookmarks`, already filters to tags with at least one live bookmark), `app/api/src/routes/tags.js`, `app/api/src/services/bookmark-service.js` (`list()`); and `docs/mockup.html` (`renderTags()`, `card()`'s clickable tag chips, `empty('tag')`'s exact copy, the "N of M bookmarks" count wording) — read directly to confirm the rail's single-`S.tag`-value toggle semantics and the per-card chip's `aria-label="Filter by tag <t>"` pattern.

**Prompt/request:** Run `/plan-phase F04`. The human did not ask any questions in response to the preview and replied `GO` directly, accepting both assumptions (AS-F04-01 single-select tag filter, AS-F04-02 no persistence of the active filter) as presented with their recommended defaults.

**AI response summary:** Detected FEATURE-CREATE, verified the backlog/dependency preconditions (F02 `designed`, F03 `done`, both ahead of F04), and read the HLD/data-model/mockup/existing code to confirm the shared query builder and the tag repository's existing "only tags with live bookmarks" behavior could be reused without a schema or index change. Resolved one apparent tension in the HLD's flow diagram (which shows writing filter state into a URL query) against F01's prior decision not to include an Angular Router and F03's C-F03-02 precedent of not persisting page size — concluded in-memory-only filter state (AS-F04-02) rather than raising it as a blocking question, since the precedent was already settled by two earlier approved specs. Presented both assumptions with recommended defaults in the execution preview rather than as blocking questions. Wrote `spec.md` (4 stories, 12 AC, 7 edge cases: EC13 and EC22 inherited with EC22 partially covered here, EC17 inherited and fully closed by this feature's rail-fallback behavior, plus 4 new AI-tagged edge cases), `status.md`, and this evidence record.

**Your decision:** Accepted

**What you changed and why:** Nothing — both recommended defaults (AS-F04-01 single-select filter, AS-F04-02 no persistence across reload) were accepted as proposed with no corrections requested.

**How you verified it:** No command was run and no code exists for F04 yet. Agent-side checks were limited to the `/plan-phase` Step 6 checklist, all passing by inspection: both covered R-IDs (R04, R11) have at least one AC; all 12 AC are Given/When/Then with an observable outcome (an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute); all 7 edge cases map to an AC or are named as partially covered pending a dependency feature (EC17's delete trigger needs F07, EC22's search-combination half needs F05); `api` and `web` both exist in `component-map.json` v1; and no AC restates behavior F02, F03, F05, F06, F07 or F08 already claim, per section 5.

**Outcome:** worked

**Iteration:** One round. The initial preview already surfaced both assumptions with recommended defaults instead of open questions (no app-level ambiguity remained after reading F02/F03's specs and the mockup), and the human replied `GO` without requesting any change.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
