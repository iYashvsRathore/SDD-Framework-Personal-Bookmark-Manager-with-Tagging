---
name: secure-input-handling
description: 'Security patterns for untrusted input in web apps: URL validation and normalization, SSRF-safe server-side fetch of page titles (private/loopback IP blocking, timeouts, size caps, redirect re-validation), XSS output escaping, parameterized queries and LIKE escaping, tag/search sanitization, dependency hygiene. Use in design, build, test and review.'
user-invocable: false
---

# Secure Input Handling

## Inputs

| Input | Phase | Used for |
|---|---|---|
| `specs/constitution.md` S1–S5 | All | The clause IDs every control cites |
| `hld.md` §8 trust-boundary table | Design, build, review | The agreed controls per input |
| `lld.md` §7 and §9 | Build, test, review | Feature-specific rules and messages |
| `specs/technology.md` | All | Stack-specific mechanisms (auto-escaping, parameter binding, HTTP client options) |

## Trust boundaries

| Untrusted input | Entry | Controls |
|---|---|---|
| Submitted URL | Add/Edit form, API | trim → non-empty → length ≤ 2048 → parse → scheme ∈ {http, https} → hostname required → normalize for duplicate key |
| Fetched page title | Title fetcher | SSRF guard → `text/html` only → size cap → extract `<title>` → decode entities → collapse whitespace → truncate (≈300) → store as plain text → escape on output |
| User title | Form | trim → length limit → plain text → escape on output |
| Tags | Form | split → trim → lowercase (or documented case policy) → dedupe → length 1–30 → allowed chars (letters, digits, `-`, `_`, space) |
| Search text | Query string | trim → length limit (≈200) → bound parameter → escape `%`/`_` with `ESCAPE` → escape on output (echoed query) |

## SSRF-safe title fetch (design checklist)

1. Only `http:` and `https:` are allowed.
2. Resolve the hostname and reject if **any** resolved address is private, loopback, link-local, unspecified, multicast, or reserved: IPv4 `0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/4, 240/4`; IPv6 `::1, ::, fc00::/7, fe80::/10`, plus IPv4-mapped IPv6. Reject the literal `localhost`.
3. Connect to the **validated** address where the stack allows it, to avoid a DNS-rebinding window. Otherwise, document the residual risk.
4. Timeout ≤ 5 s total. Read cap ≈ 512 KB. Stop reading after `</title>`.
5. Follow redirects manually, ≤ 3 of them, **re-running steps 1–2 on each hop**.
6. Send no credentials or cookies. Use a fixed, honest User-Agent.
7. Any failure returns a typed result (`{ ok: false, reason }`). The caller saves the bookmark with a fallback title and shows a notice.

## Output escaping

- Use template engine auto-escaping. Never use raw/`safe` filters on untrusted data.
- In client-side JS, use `textContent` or `setAttribute`, never `innerHTML` with data.
- Render URLs in `href` only after the scheme check (prevents `javascript:` links).
- Recommended header: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`.

## Persistence

- Use parameterized statements for every query. Build dynamic `ORDER BY` or filters from an allow-list, never from raw input.
- Enforce uniqueness at the database level on the normalized URL (defense in depth).

## Dependency hygiene

- Pin versions and commit the lockfile. Run the audit command from `technology.md` and record the **actual** output. Prefer the standard library over new packages for small tasks.

## Test probes (for /test-phase)

`javascript:alert(1)`, `file:///etc/passwd`, `http://127.0.0.1/`, `http://localhost/`, `http://169.254.169.254/`, `http://[::1]/`, a redirect to a private IP (stubbed), a `<script>alert(1)</script>` title, and a search for `%` and `_`. Expected result: rejected or escaped, and never executed or fetched.

## Validation checklist

- [ ] Every untrusted input in scope has a validation control and an output control.
- [ ] The server-side fetch satisfies all 7 SSRF checklist items, or the residual risk is documented.
- [ ] No raw or `safe` rendering of untrusted data. No `innerHTML` with data.
- [ ] Every query is parameterized. `LIKE` input is escaped.
- [ ] Every control cites its constitution clause.
- [ ] Probes ran with observed results (testing and review phases).

## Common errors

| Error | Correct approach |
|---|---|
| Validating the URL only on the client | Validate on the server. The client check is only for UX. |
| Checking the hostname string for `localhost` only | Resolve the name and check every resolved address |
| Validating only the first URL, then following redirects automatically | Follow redirects manually and re-validate each hop |
| Escaping on input and storing escaped HTML | Store plain text and escape on output |
| Building SQL with string concatenation for search | Bind the parameter and escape `%` and `_` |
