### Evidence E-design-302

**SDLC activity:** design

**Task/feature:** F03 List Bookmarks — low-level design: the real pagination/count contract replacing F01's placeholder, the shared predicate builder (AD-07, AS-F03-01), the card/list/pagination UI, and four feature-level design decisions (LD-01…LD-04).

**Context given to AI:** `specs/features/F03-list-bookmarks/spec.md` (approved, 5 stories, 12 AC, 10 edge cases, AS-F03-01, C-F03-01…04); `specs/constitution.md` v1.0.0; `specs/technology.md` v1; `specs/architecture/hld.md` v2 (§5 layering "must not" rules, §6.2 list/search/filter/paginate flow, §7 UI flow and the already-declared pagination U6 deviation, §9 NFR-01 index design); `specs/architecture/data-model.md` v3 (`bookmark`, `tag`, `bookmark_tag` entities, `ix_bookmark_list`, `ix_bookmark_tag_lookup`, the composite `bookmark_tag` primary key, the AD-07 query-approach note); `specs/architecture/component-map.json` v1; F01's approved `lld.md` and its shipped code (`bookmark-repository.js`'s `F01_LIST_LIMIT`/`listRecent`/`countLive` placeholders, `bookmark-service.js`'s `listRecent()`, `routes/bookmarks.js`'s ignored query params, `tag-repository.js`, `app.js`, the `web` store/app shell/models/api-service/icons); `docs/mockup.html` (`#count`, `#list` markup, the `ago()` relative-time function, card/chip/empty-state CSS, `keyOf`/host-strip logic).

**Prompt/request:** Run `/design-feature F03-list-bookmarks`. The human replied `GO` with all four LD decisions (LD-01…LD-04) set to "Accept Recommendation."

**AI response summary:** Detected CREATE mode, verified preconditions (architecture approved, planning approved, F01 dependency tested), and built the context brief from the sources above. Presented four LD decisions as option tables: LD-01 the shared `buildPredicate()`/`countWhere`/`listPage` contract (AD-07, AS-F03-01) vs. two independently-maintained queries; LD-02 a pure client `relativeTime()` vs. a server-formatted string; LD-03 a fixed-size pagination control (page-size select + Previous/Next + "Page X of Y") vs. a numbered/truncated page-button row; LD-04 a request-token guard against stale/out-of-order list responses vs. switching the store to Observables with `switchMap`. Applied the design-alternatives challenge ("what breaks at 1,000 records / on restart / keyboard-only") to each, recording that none changed the recommendation. On `GO`, wrote `lld.md` (14 sections: overview, the four LD decisions, component changes across `api`/`web`, the `GET /api/bookmarks` contract, data access reusing only existing entities/indexes, UI states including the new pagination control, validation rules — documented as "no user-facing message, clamps silently" — error handling, security considerations, a Mermaid sequence diagram, test hooks, "no architecture impact," the constitution check, and the change log) and `tasks.md` (8 ordered tasks, F03-T01…T08, with an AC-coverage table showing all 12 AC covered and the deliberately-deferred edge cases named).

**Your decision:** Accepted

**What you changed and why:** Did not change anything — all four LD decisions and the generated `lld.md`/`tasks.md` content were accepted as produced.

**How you verified it:** Observed and read through the generated `lld.md` and `tasks.md` against the sources. No command has been run and no F03 code exists yet — this is a design-only session. The AI's own Step 6 validation checklist passed by inspection: every AC and edge case maps to an LLD section and a task (or is named as legitimately deferred to another feature's `/test-phase`, per `spec.md` §3 itself); all four LD decisions have ≥2 options, a human selection, and a stated trade-off; every file in §3/`tasks.md` resolves under `component-map.json` v1; §5 uses only entities/fields/indexes that already exist in `data-model.md` v3; every untrusted input (`page`, `size`, the predicate text, tag/title/url rendering) has a control citing an S-clause; header versions match the current spec/HLD/data-model/component-map versions; no `<...>` placeholders or GUIDE comments remain in either file.

**Outcome:** worked for me

**Iteration:** One round — all four LD decisions were accepted as recommended in the same `GO` reply, so no second option table was needed.

**Approx. time:** 15 minutes

**Learning:** Reading through the generated LLD and tasks confirmed the design held up; no correction was needed.
