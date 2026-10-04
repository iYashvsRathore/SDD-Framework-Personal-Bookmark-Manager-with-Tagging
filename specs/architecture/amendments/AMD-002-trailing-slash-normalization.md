# AMD-002: Normalize a trailing slash on any path, not only an empty one

**Status:** Applied (2026-10-01) · approved by dev-1 on 2026-10-01
**Raised by:** F01-add-bookmark / build / dev-1
**Date:** 2026-10-01
**Blocks:** — (deliberately nothing; see §4)

## 1. Problem

`specs/features/F01-add-bookmark/spec.md` F01-AC12 is an approved acceptance criterion:

> | F01-AC12 | `https://example.com/a` is already saved and live | I submit `https://example.com/a/`, `https://example.com/a#section`, `https://example.com:443/a`, or the punycode/unicode variant of the same host | Each yields **409** `DUPLICATE_URL`. `https://example.com/A` (different path case) yields **201** and is a separate bookmark |

The first of those four inputs cannot produce a 409 under INV-02 as currently written. `data-model.md` v2 INV-02 says `url_normalized` is derived by, among other steps, "drop a trailing `/` **when the path is empty**". Under that rule `https://example.com/a/` normalizes to `https://example.com/a/` and `https://example.com/a` normalizes to `https://example.com/a`. The two strings differ, `ux_bookmark_url_live` sees no collision, and the second submission is stored as a separate bookmark. F01-AC12 fails by construction.

The rule is stated in three places and no two of them agree, which is exactly the condition constitution **E3** forbids:

| Artifact | Wording | `https://example.com/a/` vs `https://example.com/a` |
|---|---|---|
| `data-model.md` v2, INV-02 | drop a trailing `/` when the path is **empty** | different → AC12 fails |
| `specs/features/F01-add-bookmark/lld.md`, LD-04 option A | drop a trailing `/` when the path is **exactly `/`** | different → AC12 fails |
| `app/api/src/services/url-normalize.js` (built, Build gate approved 2026-10-01) | `if (path.endsWith('/')) path = path.slice(0, -1)` — drops one trailing `/` from **any** path | same → AC12 passes |

The contradiction surfaced during `/build-feature F01-add-bookmark` and was put to dev-1 as a blocking question on 2026-10-01. dev-1 ruled that the broad reading wins, because it is the only reading under which the approved acceptance criterion can pass. The code was written to that ruling and shipped. This amendment is the documentation catching up to a decision the human has already recorded — it is not a request to change behavior.

Two notes on what this amendment deliberately does **not** do:

- It does not touch the **path-case** half of INV-02. `example.com/A` and `example.com/a` stay distinct, which is both the existing rationale in INV-02 and the last clause of F01-AC12. The asymmetry — fold the trailing slash, preserve the case — is intentional and is what AC12 asks for.
- It does not address the **trailing-dot hostname** gap recorded as open in `lld.md` §12. That gap also lives in INV-02, but resolving it would change what `normalizeUrl` outputs for inputs it currently handles, which is a behavior change with its own migration question. dev-1 chose on 2026-10-01 to keep the two separate so that a zero-risk correction is not held hostage to a decision that needs its own analysis. The trailing-dot gap remains open and carries to `/test-phase F01-add-bookmark`.

## 2. Proposed Change

| Artifact | Current | Proposed |
|---|---|---|
| data-model.md, INV-02 (Invariant column) | `url_normalized` is derived deterministically: lowercase the scheme and host, apply IDNA/punycode to the host (EC20), drop a default port (`:80` for http, `:443` for https), drop the fragment, **drop a trailing `/` when the path is empty**, and preserve path case and the query string. | Replace the bolded clause with: **drop one trailing `/` from the path, whether or not the path is otherwise empty (so `/a/` and `/a` are the same resource, and `example.com/` and `example.com` are too)**. Every other step in the sentence is unchanged, and their order is unchanged. |
| data-model.md, INV-02 (Enforced by column) | Service layer computes it; `ux_bookmark_url_live` enforces the resulting uniqueness. Path case is preserved deliberately — `example.com/A` and `example.com/a` are different resources on most servers, so folding them would merge two legitimately distinct bookmarks. | Unchanged, plus one appended sentence: `Only the last slash is dropped and only once, so` `/a//` `normalizes to` `/a/` `— a deeper collapse would merge paths that a server may legitimately treat as distinct (F01-AC12, AMD-002).` |
| data-model.md, §7 Change Log | — | One row: version 3, 2026-10-01, this AMD |
| data-model.md, header | `**Version:** 2` | `**Version:** 3` |
| er-diagram.md, header | `**Data model version:** 2 (must match data-model.md)` | `**Data model version:** 3 (must match data-model.md)`, with the existing note extended to record that AMD-002, like AMD-001, moved only the version pointer | 
| hld.md | — | **No change.** Verified, not assumed: `hld.md` references INV-02 by name in two places (§6.1's sequence diagram line `S->>S: normalize -> url_normalized (INV-02, EC20)` and §8's trust-boundary row `→ normalize (INV-02)`) and nowhere restates the normalization steps. Both references stay correct verbatim under the new wording. `hld.md` stays at version 2. |
| component-map.json | — | **No change.** No component, path or command is affected. Stays at version 1. |

No schema object changes — no table, column, index, constraint or default is touched. As with AMD-001, `user_version` stays **1** and no migration script is required. No decision (AD-01…AD-07) is reopened.

## 3. Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **A: amend `data-model.md` INV-02 as proposed (recommended)** | The rule ends up stated once, in the artifact every feature reads, and it matches both the approved acceptance criterion and the code that ships today. F06 reuses `normalizeUrl` verbatim by HLD §6.3, so aligning the shared invariant is what stops F01 and F06 from ever disagreeing about whether `/a/` and `/a` are one bookmark. Satisfies E3. Costs nothing at runtime: no code change, no data change, no migration | Costs an amendment cycle and a human decision. Bumps `data-model.md` to version 3 two days after version 1. Leaves `lld.md` LD-04 stale until a separate `/design-feature` REVISE run fixes it, because `/amend-architecture` may not write feature artifacts |
| B: solve within the feature without an amendment — record the broad rule only in F01's `spec.md` and `lld.md`, leave INV-02 alone | No amendment cycle, no version bump, and F01 is already built and gate-approved so nothing is waiting | **Rejected.** `data-model.md` would permanently assert a normalization rule the code does not implement, on the one invariant that governs duplicate detection. F06 is designed from the shared artifacts (HLD §6.3) and would be designed from the stale rule, so the two features could legitimately disagree about whether `https://example.com/a/` is a duplicate. `/review-phase` compares code to the architecture and would file a finding against correct code. This is the precise drift E3 exists to prevent, and it is the same reasoning that decided AMD-001 |
| C: change the code to match INV-02 as written — narrow the rule back to the empty-path case | `data-model.md` needs no edit and stays at version 2; the invariant as approved is honored literally | **Rejected.** It breaks F01-AC12, an approved acceptance criterion, so the feature could not pass its own tests. It also reverses a ruling dev-1 made explicitly on 2026-10-01 after the contradiction was raised as a blocking question. Reversing an approved human decision to avoid a version bump inverts the source-of-truth order, and it would make the duplicate check weaker on the single most common way the same URL is typed two ways |
| D: amend INV-02 to fold the trailing slash **and** strip the trailing-dot hostname in one change | One amendment instead of two; both open INV-02 items close together | **Rejected for now** (dev-1, 2026-10-01). The trailing-slash half changes nothing at runtime; the trailing-dot half changes what `normalizeUrl` outputs and therefore needs its own migration analysis for rows already stored. Bundling them would hide a behavior change inside a documentation correction and would block the safe half behind the risky one. The trailing-dot gap stays open and separately tracked in `lld.md` §12 |

## 4. Impact Analysis

**Features affected**

| Feature | Status | Does spec, LLD or code have to change? |
|---|---|---|
| F01 Add Bookmark | built | **Code: no.** `app/api/src/services/url-normalize.js` already implements the proposed wording and passed the Build gate on 2026-10-01. **Spec: no.** F01-AC12 is what the amendment makes achievable. **LLD: yes, on apply** — LD-04 option A still says "when the path is exactly `/`". `/amend-architecture` may not write feature artifacts, so this is handed back as a follow-up `/design-feature F01-add-bookmark` REVISE run (dev-1, 2026-10-01). Until that runs, LD-04 is the one remaining file that disagrees, and it is recorded here rather than left silent |
| F06 Edit Bookmark | not-started | Reuses the same `normalizeUrl` by HLD §6.3 and inherits INV-04's own-row exclusion. Will be planned and designed against `data-model.md` v3. No rework, because nothing is written yet |
| F02, F03, F04, F05, F07, F08 | not-started | None. None of them normalizes a URL; they read `url` and `url_normalized` as stored values |

**Migration / backward compatibility**

No schema object changes, so `user_version` stays 1 and there is no migration script — the same conclusion AMD-001 reached, for the same reason.

On stored data: no row can hold a `url_normalized` written under the narrow rule, because no code ever implemented the narrow rule. `normalizeUrl` has had the broad behavior since it was first written in T04 and the database file was created in the same build. Stated as reasoning from the code's history, not as an observation — no query was run against `app/api/data/tagvault.db` for this proposal. If `/test-phase` wants certainty rather than inference, a one-line check that no live `url_normalized` ends in `/` with a non-empty path would settle it, and that check belongs in the test phase, not here.

Backward compatibility with the API contract is unaffected: the same inputs produce the same status codes before and after, because the code does not change.

**Constitution check**

| Clause | Result |
|---|---|
| **E3** No two artifacts disagree | This amendment exists to restore E3. On apply, two of the three disagreeing statements agree; the third (`lld.md` LD-04) is declared above with the command that fixes it, rather than quietly left |
| **P2** Human approval gates | §5 is `TODO(human)`. Nothing is applied until dev-1 records a decision here. The underlying behavioral ruling was already made by dev-1 at the Build gate on 2026-10-01 |
| **P3** Honesty over polish | The migration paragraph says plainly that it reasons from the code's history and that no database query was run. No result is claimed as verified |
| **P4** Simplicity first | One clause in one invariant, one appended rationale sentence, two version pointers. No new table, rule, dependency or abstraction |
| **S1** Input validated at the boundary | Unaffected. Normalization runs strictly *after* validation (LD-04, HLD §8 order) and is explicitly not a validator. Nothing about the scheme allow-list, the dot rule or the length cap moves |

**Risk of the change itself:** low. The one way this bites later is if a future requirement needs `example.com/a/` and `example.com/a` to be distinct bookmarks — for instance if the app ever stored directory listings alongside files of the same name. No requirement in `product-spec.md` asks for that, and R10 asks for the opposite.

## 5. Decision (human)

- **Decision:** Approve (dev-1, 2026-10-01) — option A
- **Reason:** dev-1's words, verbatim: *"apply what is implemented in code"*. Read as approving option A: the invariant is brought into line with the shipped `normalizeUrl`, which is the behavior dev-1 already ruled for at the F01 Build gate. This also rules out option C (reverting the code to the narrow wording) by direct contradiction.

## 6. Application Record

| Artifact | New version | Changed on | Verified by |
|---|---|---|---|
| `data-model.md` — INV-02 invariant clause, INV-02 rationale sentence, header, §7 change-log row | 3 | 2026-10-01 | Re-read after editing: INV-02 now reads "drop one trailing `/` from the path, whether or not the path is otherwise empty" and carries the `/a//` → `/a/` sentence; the path-case rationale is intact and unedited; the §7 row 3 exists and names AMD-002. Inspection only — no command was run |
| `er-diagram.md` — version pointer and the amendment note | 3 (matches `data-model.md`) | 2026-10-01 | Re-read after editing: the pointer is 3 and equals `data-model.md`'s header. No entity, field, key or relationship line was touched — the Mermaid block is byte-for-byte unchanged |
| `hld.md` | 2 (unchanged) | — | Not edited, as §2 requires. Its two INV-02 references are by name only and stay correct verbatim under the new wording |
| `component-map.json` | 1 (unchanged) | — | Not edited, as §2 requires. No component, path or command is affected |

**Features unblocked:** none, because none was blocked. dev-1 ruled at proposal time that F01 — already `built` and gate-approved with conforming code — should not be moved back to a blocked state over a documentation correction.

**Follow-up owed, not done here:** `specs/features/F01-add-bookmark/lld.md` LD-04 option A still says the trailing `/` is dropped "when the path is exactly `/`", which now contradicts INV-02 v3 and the code. `/amend-architecture` may only write `specs/architecture/`, so this needs a one-item `/design-feature F01-add-bookmark` REVISE run. Until it does, LD-04 is the last artifact disagreeing with the shipped behavior.

**Out of scope, observed during apply:** `hld.md` §10's P6 row asserts that "`data-model.md` and `er-diagram.md` are both at version 1". That was already stale before this amendment (AMD-001 moved both to 2) and is now two versions out. It is **not** listed in §2, and APPLY changes exactly what §2 lists and nothing else, so it was deliberately left alone rather than quietly corrected. It is recorded here so `/sync-check` finds a known item rather than a surprise.

<!-- Completion checklist (then remove this comment):
- [x] PROPOSE: §1–§4 are filled. Option B (no amendment) was genuinely considered.
- [x] PROPOSE: every feature already using the changed artifacts is listed in §4.
- [x] APPLY: §5 holds the human's decision, and §6 has one row per §2 artifact.
- [x] APPLY: the version bumps and change-log rows exist in each artifact. No feature was blocked, so none needed unblocking.
-->
