### Evidence E-planning-201

**SDLC activity:** planning

**Task/feature:** Draft `specs/features/F02-tag-bookmarks/spec.md` — user stories, acceptance criteria, edge cases, NFR mapping, scope boundaries and constitution check for the Tag Bookmarks feature.

**Context given to AI:** `specs/product-spec.md` (R02, R09, R14 and their clarifications C03; NFR-03, NFR-04; EC14, EC15, EC25); `specs/backlog.md` F02 row (depends on F01, owner dev-1); `specs/features/F01-add-bookmark/spec.md` (F01 defers the tag input to F02, C-F01-05); `specs/features/F03-list-bookmarks/spec.md` (F03-AC8 already renders read-only tag chips, "F04 adds" the click/filter behavior); `specs/architecture/hld.md` §5–§8 (tag normalization order, `GET /api/tags?prefix=`, the `INVALID_TAG` error code and its partial wording); `specs/architecture/data-model.md` (`tag`, `bookmark_tag` tables, 1–24 chars, character allow-list, 0..8 per bookmark); `specs/architecture/component-map.json`; `docs/mockup.html` (the `#tg`/`#ci`/`#tl` chip input, `addTag()`'s silent truncate/cap/dedupe, the comma-splitting `input` handler).

**Prompt/request:** `/plan-phase F02` to create the feature spec, followed by "Accept Default" for all 5 clarifying questions (all-or-nothing API validation on bypass; the disallowed-character message; the autocomplete cap of 10; add-dialog-only scope vs. F06; zero tags being valid).

**AI response summary:** Identified a boundary gap the HLD left unresolved (no wording for a disallowed-character tag) and a scope question (whether F02 also wires the edit dialog). Proposed defaults for both plus three narrower ones (all-or-nothing rejection, autocomplete cap, zero-tags-valid), then wrote a 4-story, 13-AC spec covering R02/R09/R14, 8 edge cases (3 inherited: EC14, EC15, EC25; 5 new: comma-paste, API-bypass-rejects-whole-request, the 24/25-char boundary, case-insensitive prefix match, the 10-result autocomplete cap), an Out of Scope section naming F03/F04/F06 boundaries explicitly, and a constitution check table.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** No test or build was run in this session — this is a planning-only artifact. Verification is a human read-through of `spec.md` against `product-spec.md`, `hld.md` and `docs/mockup.html`, not yet confirmed.

**Outcome:** TODO(human) — draft outcome: the spec was generated and all 5 clarifying questions were answered by accepting the recommended default in one round, with no further corrections requested before this record was drafted.

**Iteration:** None yet — this is the first draft of `spec.md` for F02.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
