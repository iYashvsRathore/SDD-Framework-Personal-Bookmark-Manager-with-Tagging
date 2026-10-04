/**
 * A tag's hue, ported verbatim from `docs/mockup.html`'s `hue()` — a stable
 * hash so the same tag name always gets the same colour rather than one
 * randomised per render. Shared by `BookmarkList`'s card chips and `TagRail`'s
 * dots so the same tag reads as the same colour everywhere (F04-T05).
 */
export function tagHue(name: string): number {
  let hash = 7;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}
