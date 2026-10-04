/**
 * Inline SVG icon paths, ported from docs/mockup.html.
 *
 * These are module-level CONSTANTS. No value here is ever derived from a bookmark
 * title, a URL or any other untrusted input, which is what makes rendering them
 * through an Angular template safe (S3, F01-AC16).
 */
export const ICON_PATHS = {
  plus: 'M12 5v14M5 12h14',
  mark: 'M6 3h12v18l-6-4-6 4Z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z',
  // Mockup's `search` is a <circle cx="11" cy="11" r="7"/> plus a separate
  // handle <path>; ported here as one `d` string (circle drawn via two 7-radius
  // arcs, F05-T06) since this app renders every icon through a single <path>.
  search: 'M18 11a7 7 0 1 1-14 0 7 7 0 1 1 14 0M20 20l-3.5-3.5',
  x: 'M18 6 6 18M6 6l12 12',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  // Mockup's `sun` is a <circle cx="12" cy="12" r="4"/> plus the eight ray
  // <path> segments; the circle is ported as two 4-radius arcs (LD-04), the
  // same technique `search` already applies to its circle.
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
} as const;

export type IconName = keyof typeof ICON_PATHS;
