# Project Seed: Personal Bookmark Manager with Tagging

> Domain knowledge seeded from "AI SDLC Course 101 Assignment - 1". Workflows read this file so nothing is missed. For a different project, replace this seed and point `/constitution` at it.

## Functional Requirements (source: assignment §3)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R01 | Add Bookmark | Submit a URL with an optional title. If no title is given, try to retrieve a useful page title. If retrieval fails, handle it gracefully. |
| R02 | Tag Bookmarks | Assign one or more tags to a bookmark. |
| R03 | List Bookmarks | View all saved bookmarks, most recent first. |
| R04 | Filter by Tag | Select a tag and see only the bookmarks associated with it. |
| R05 | Search | Search bookmarks by title or URL. |
| R06 | Edit Bookmark | Change the URL, title, or tags of an existing bookmark. |
| R07 | Delete Bookmark | Remove a bookmark, with a reasonable confirmation or safeguard. |
| R08 | Persistence | Bookmarks remain after the app is stopped and restarted. |
| R09 | Validation | Clearly invalid or empty URLs are not saved. Show understandable feedback. |
| R10 | Duplicate Handling | Detect or sensibly handle saving the same URL more than once. |
| R11 | Empty/Error States | No bookmarks, no search results, title-fetch failure, invalid input: all handled in a user-friendly way. |

Feature Evidence Matrix row names (03-build.md): Add Bookmark, Tags, List/Newest First, Filter by Tag, Search, Edit, Delete, Persistence, Validation, Duplicate Handling, Empty/Error States.

## Technical Constraints (assignment §3)

- Runs locally with a web UI in a browser. The stack is flexible (choose interactively).
- No paid cloud service or external database. No Docker needed.
- Must remain runnable on the developer machine through the evaluation period.

## Suggested Feature Split (to be confirmed in `/plan-phase app`)

| Feature | Primary requirement | Also contributes to |
|---|---|---|
| F01-add-bookmark | R01 | R08, R09, R10, R11 (title-fetch failure, invalid input) |
| F02-tag-bookmarks | R02 | R09 (tag validation) |
| F03-list-bookmarks | R03 | R08, R11 (no bookmarks) |
| F04-filter-by-tag | R04 | R11 (tag with no bookmarks) |
| F05-search | R05 | R11 (no results) |
| F06-edit-bookmark | R06 | R09, R10 |
| F07-delete-bookmark | R07 | R11 |

## Seed Edge Cases

Empty URL · whitespace-only URL · missing scheme (`example.com`) · non-http scheme (`javascript:`, `file:`, `ftp:`) · overlong URL · duplicate URL differing only by case, trailing slash, or fragment · title fetch timeout, non-HTML content, 404/500, redirect loop, huge page · title containing HTML/script · no bookmarks yet · search with no results · search text with `%`, `_`, quotes, `<script>` · filter by a tag that has no bookmarks · duplicate tags on one bookmark (`Research`, `research`) · empty tag / whitespace tag · editing a URL into a duplicate of another bookmark · deleting the last bookmark carrying a tag · double-submit of the add form · app restarted mid-write.

## Seed Non-Functional Targets

| ID | Category | Target |
|---|---|---|
| NFR-01 | Performance | Search and tag filter return in < 500 ms with 1,000 bookmarks. The list page renders in < 1 s with 1,000 bookmarks. |
| NFR-02 | Reliability/Persistence | 100% of saved bookmarks and tags are present after a stop/restart. No partial writes. |
| NFR-03 | Usability/Accessibility | All actions are keyboard-operable with visible focus. Every input has an associated label. Errors are shown as text. |
| NFR-04 | Security | 0 non-http(s) URLs accepted. 0 fetches to private or loopback addresses. Fetched titles and search text are always escaped. All queries are parameterized. |
| NFR-05 | Robustness | A title fetch never blocks saving for more than 5 s. |

## Seed Security Concerns

- URL validation: `http`/`https` only, a hostname is required, max length, normalization for duplicates.
- SSRF on title fetch: allow `http`/`https` only; block private, loopback, link-local, and reserved ranges after DNS resolution; timeouts; size cap; redirect limit with re-validation; `text/html` only.
- XSS: escape fetched titles, user titles, tags, and search text on output. No `innerHTML` with untrusted data.
- Injection: parameterized queries. Escape `%`/`_` for `LIKE` search.
- Dependency hygiene: pinned versions, license check, audit command.

## Deliverables Checklist (assignment §12)

- All mandatory requirements implemented, or incomplete ones clearly identified.
- Application runs locally.
- docs/01-planning.md, 02-design.md, 03-build.md (with the Feature Evidence Matrix), 04-testing.md (with actual outcomes), 05-review.md, and 06-reflection.md completed.
- Important AI interactions use the standard evidence format.
- Demo video (5–8 min) recorded and accessible.
- No fabricated interactions, tests, or outcomes.
- Local project kept available until the review period ends.
