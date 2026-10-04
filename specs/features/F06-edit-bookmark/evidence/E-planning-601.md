### Evidence E-planning-601

**SDLC activity:** planning

**Task/feature:** F06 Edit Bookmark — produce the feature specification: user stories, testable acceptance criteria for R06, R08, R09 and R10 on the edit path, feature-level edge cases, applicable NFRs, scope boundaries against F01/F02/F03/F07, and the constitution check.

**Context given to AI:** `specs/constitution.md` v1.0.0; `specs/product-spec.md` v1 approved (R06/R08/R09/R10 citations, EC16/EC20/EC21, RK01); `specs/backlog.md` (the F06 row: components `api` + `web`, depends on F01/F03, owner `dev-1`); `specs/features/F01-add-bookmark/spec.md` approved (the URL-validation order, the 409 duplicate contract and banner, the `www.`-stripping fallback); `specs/features/F02-tag-bookmarks/spec.md` approved (tag normalization rules, and C-F02-04's ruling that F06 wires the same chip input into the edit dialog); `specs/features/F03-list-bookmarks/spec.md` approved (the rendered but unwired *Edit* button, F03-AC8); `specs/architecture/hld.md` §6.3 (edit reuses F01's validation with self-exclusion and unchanged `created_at`) and §8 (error-code table, trust-boundary table); `specs/architecture/data-model.md` v3 (INV-04, INV-10, and the `updated_at` column's documented "EC21 conflict detection" purpose); `specs/architecture/component-map.json` v1; `docs/mockup.html` (the shared `openForm`/submit handler at lines 252–290, used for both add and edit).

**Prompt/request:** Run `/plan-phase F06-edit-bookmark`. Then: accept all five recommended defaults in one round — optimistic-concurrency conflict detection for EC21's edit half; the mockup's title-clear re-fetch behavior; the duplicate banner's *Edit existing* discarding the abandoned add attempt; a `PUT` response shaped like `POST`'s; and no special no-op path for a no-change resave.

**AI response summary:** Detected FEATURE-CREATE, verified preconditions (constitution ratified, product planning and architecture gates approved, F06 present in the backlog with an owner, not blocked), and read F01/F02/F03's approved specs to find the exact boundary F06 must not restate. Found that `data-model.md`'s `updated_at` column already names "EC21 conflict detection" as its purpose but no response contract exists for it yet, and surfaced this as a genuine gap rather than inventing a silent answer. Asked five scope questions, each with a recommended default and its impact, flagging that the concurrency default would require a new `hld.md` error code. After the human accepted all five, wrote `spec.md` (5 stories, 13 AC, 6 edge cases, a requirement-coverage table, 3 applicable NFRs, 7 out-of-scope boundaries, 5 clarification rows plus 1 assumption, an 18-row constitution check naming `EDIT_CONFLICT` as a declared U6 addition rather than an already-approved one) and `status.md`, and recorded F06-RK1 (the `hld.md` amendment F06-AC11 depends on) as an explicit, non-blocking risk rather than quietly writing the new error code into the HLD itself.

**Your decision:** Accepted

**What you changed and why:** Accepted the recommended default for all five clarifying questions in one round, as instructed: optimistic concurrency for cross-tab edit conflicts (closes EC21's edit half honestly rather than leaving it a silent last-write-wins); the mockup's unconditional title re-fetch on a cleared *Title* field (keeps the edit path identical to the add path, no new logic); *Edit existing* discarding the abandoned add attempt (matches `docs/mockup.html`'s `openForm(d)` exactly); a `PUT` response shaped like `POST`'s (no second contract to design); and no diff-detection no-op path (simplest, matches the mockup's unconditional `Object.assign`).

**How you verified it:** No command was run and no code exists yet for F06. Verification here is by inspection against the `/plan-phase` Step 6 checklist: all four covered R-IDs (R06, R08, R09, R10) map to at least one AC; all 13 AC are Given/When/Then with an observable outcome; all six edge cases map to an AC or are named as reusing an existing one without needing a new AC (EC20); `api` and `web` both exist in `component-map.json` v1; every out-of-scope item names the feature that owns it, cross-checked against F01 §5, F02 §5 and F03 §5 so no two specs claim the same behavior; and the one new architecture dependency (F06-RK1) is flagged rather than silently assumed into the HLD.

**Outcome:** Worked. `specs/features/F06-edit-bookmark/spec.md` is drafted with 5 stories and 13 acceptance criteria, awaiting the planning gate. `status.md` records F06-RK1 against the design phase rather than against this gate, following the AMD-001 precedent recorded in F01's evidence.

**Iteration:** One round. The five questions were asked together, each with a recommended default; the human replied "GO with accept all defaults" and the spec was written directly from that round with no further back-and-forth.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
