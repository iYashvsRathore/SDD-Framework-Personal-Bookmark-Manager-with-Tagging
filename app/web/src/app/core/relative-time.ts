/**
 * "Added N days ago" wording, ported verbatim from `docs/mockup.html`'s `ago()`
 * (LD-02, C-F03-03). A pure function of an injected `now` rather than
 * `Date.now()`, so a test is deterministic and the list needs no extra round
 * trip to the server just to show relative time.
 */

const DAY_MS = 86_400_000;

/**
 * @param iso an ISO-8601 `created_at` timestamp
 * @param now injected so tests are deterministic; defaults to the real clock
 * @returns `today` / `yesterday` / `N days ago` / `N weeks ago` / `N months ago`
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);

  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
