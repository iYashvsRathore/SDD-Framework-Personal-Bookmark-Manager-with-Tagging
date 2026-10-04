/**
 * Pure tag-chip helpers, ported verbatim from `docs/mockup.html`'s `addTag()`
 * (F02-AC2, AC4, AC7). The component wires these into the chip-input UI;
 * dedupe and the 8-tag cap stay the component's job since they depend on the
 * current chip list, not on a single raw value.
 */

const MAX_TAG_LENGTH = 24;

/**
 * Trims, lowercases and truncates a single raw chip value to the stored shape
 * (F02-AC7). Mirrors the mockup's `v.trim().toLowerCase().slice(0,24)`.
 */
export function normalizeChipValue(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
}

/**
 * Splits a comma-separated paste/typed value into its parts, in order
 * (F02-AC4, F02-EC1). Each part is returned as-is — callers normalize.
 */
export function splitCommaSeparated(raw: string): readonly string[] {
  return raw.split(',');
}
