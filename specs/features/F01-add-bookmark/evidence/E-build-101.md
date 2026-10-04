### Evidence E-build-101

**SDLC activity:** build

**Task/feature:** F01-T03 — implementing `normalizeUrl()` so that F01-AC12 treats `https://example.com/a`, `EXAMPLE.com/a/`, `example.com:443/a#x` and the punycode form as one bookmark.

**Context given to AI:** `spec.md` F01-AC12 (which names `https://example.com/a/` as equivalent to `/a`), `data-model.md` INV-02 and `lld.md` LD-04 (which both say to drop a trailing `/` **only when the path is empty or exactly `/`**), and `lld.md` §7.2's literal normalization table.

**Prompt/request:** Implement F01-T03 — `validateUrl`, `normalizeUrl` and `hostnameForTitle` — with table tests covering every §7.1 rule and every §7.2 row.

**AI response summary:** Copilot stopped before writing `normalizeUrl` and reported that the two sources cannot both be satisfied: under INV-02 as written, `https://example.com/a/` normalizes to `https://example.com/a/` and would **not** collide with `https://example.com/a`, so F01-AC12 would fail. It presented two options — (A) strip one trailing `/` from any path, satisfying AC12 and needing an INV-02 amendment, or (B) implement INV-02 literally and raise AC12 as a spec defect — and recommended A, noting that `/build-feature` cannot edit `data-model.md` either way.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — option A was accepted as recommended, after reading through both options and understanding the trade-off before accepting.

**How you verified it:** `npx vitest run` in `app/api` reported **81 passed (81)**, exit 0, on the first attempt after the ruling. The suite asserts `example.com/a` ≡ `EXAMPLE.com/a/` ≡ `example.com:443/a#x` while `example.com/A` stays distinct. Each §7.2 row was independently checked against actual WHATWG `URL` behaviour with `node -e` before being written into a test, so the table pins real behaviour rather than an assumption — `2130706433` and `0x7f.1` were confirmed to expand to `127.0.0.1` and to **pass** validation, which is why the SSRF guard is a separate post-resolution check.

**Outcome:** worked

**Iteration:** The wording gap is unresolved by design: the code and `spec.md` now agree, but INV-02 and LD-04 still describe the narrower rule. Raised as a Build-gate finding requiring an architecture amendment rather than edited in place.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.
