---
description: "Use when designing, coding, or reviewing handling of untrusted input: user-submitted URLs, fetched page titles (SSRF), search/tag text (XSS, injection), persistence queries, and dependency hygiene."
applyTo: "**/*.{js,mjs,cjs,ts,tsx,jsx,py,java,cs,go,rb,php,html,ejs,hbs,njk,vue,svelte},docs/02-design.md,docs/05-review.md,specs/architecture/**,specs/features/**/lld.md"
---

# Security Rules (untrusted input)

Apply the `secure-input-handling` skill for details. These rules are non-negotiable:

## User-submitted URLs

- Trim the value, reject empty input, and enforce a max length (for example, 2,048 characters).
- Parse with a real URL parser. Allow the `http:` and `https:` schemes **only**. Reject `javascript:`, `data:`, `file:`, `ftp:`, and so on.
- Require a hostname. Normalize the URL for duplicate detection (lowercase the scheme and host, strip default ports and fragments, and apply a documented trailing-slash rule).

## Server-side title fetch (SSRF)

- Fetch only `http`/`https` URLs. Resolve DNS and **block private, loopback, link-local, and reserved ranges** (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`) and `localhost`.
- Use a timeout (≤ 5 s), a response size cap (for example, 512 KB read limit), and a redirect limit (≤ 3). **Re-validate every redirect target.**
- Accept only `text/html` content. Extract `<title>` text only, then decode, collapse whitespace, and truncate (for example, to 300 characters).
- A failure never blocks saving. Fall back to the hostname or URL as the title and show a non-blocking notice.

## Output and queries

- Treat fetched titles, user titles, tags, and search text as untrusted. Escape them on output. Never render them as HTML.
- Use parameterized queries only. For `LIKE` search, escape `%` and `_` or use bound parameters with an explicit `ESCAPE` clause.
- Tags: trim them, apply a length limit, use an allowed character set, and use a documented case policy.

## Platform

- Set security headers where practical: a Content-Security-Policy without inline script, `X-Content-Type-Options: nosniff`.
- Confirm destructive actions (delete). Use POST/DELETE for state changes, never GET.
- Handle no secrets. Don't log full request bodies.
- Dependencies: pin versions, run the ecosystem audit command from `specs/technology.md` (for example, `npm audit` or `pip-audit`) during review, and record the actual output.
