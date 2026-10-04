/**
 * Tag normalization/validation and prefix suggestion (lld.md section 2 LD-01,
 * section 7.1). The one place both F02 and F06 share these rules (P6).
 *
 * `normalizeAndValidate` is pure and takes no I/O — it never throws, and rejects
 * the WHOLE array on the first shape/length/charset failure, or on a post-dedupe
 * count over 8 (C-F02-01). `suggest` delegates to the repository after
 * lowercasing and escaping the prefix (S6).
 */
import { escapeLikePattern } from '../lib/like-escape.js';

export const MAX_TAG_LENGTH = 24;
export const MAX_TAG_COUNT = 8;
export const SUGGESTION_LIMIT = 10;

/** ASCII only: a-z, 0-9, space, hyphen, underscore — matched after lowercasing. */
const ALLOWED_CHARSET = /^[a-z0-9 _-]+$/;

/** The four exact strings (lld.md section 7.1). Any change here is a contract change. */
export const MESSAGES = Object.freeze({
  SHAPE: 'Tags must be a list of text values.',
  TOO_LONG: 'Tags can be up to 24 characters.',
  CHARSET: 'Tags can only contain letters, numbers, spaces, hyphens and underscores.',
  TOO_MANY: 'You can add up to 8 tags.',
});

export function createTagService({ tagRepository }) {
  return {
    /**
     * @param {unknown} rawTags `payload.tags`, any shape, including `undefined`
     * @returns {{ ok: true, tags: string[] } | { ok: false, message: string }}
     *   the final, successful result is the deduped set sorted alphabetically
     *   (AS-F02-01) — never throws
     */
    normalizeAndValidate(rawTags) {
      // C-F02-05: tags are optional.
      if (rawTags === undefined) {
        return { ok: true, tags: [] };
      }

      // Rule 1 — must be an Array of string elements (F02-EC2).
      if (!Array.isArray(rawTags) || rawTags.some((el) => typeof el !== 'string')) {
        return { ok: false, message: MESSAGES.SHAPE };
      }

      const seen = new Set();
      for (const raw of rawTags) {
        // Rule 2 (silent) — trim; drop an empty/whitespace-only element (EC15).
        const trimmed = raw.trim();
        if (trimmed === '') continue;

        // Rule 3 (silent) — lowercase the remainder.
        const value = trimmed.toLowerCase();

        // Rule 4 — length 1-24 after trim/lowercase (F02-EC3).
        if (value.length > MAX_TAG_LENGTH) {
          return { ok: false, message: MESSAGES.TOO_LONG };
        }

        // Rule 5 — allow-list charset.
        if (!ALLOWED_CHARSET.test(value)) {
          return { ok: false, message: MESSAGES.CHARSET };
        }

        // Rule 6 (silent) — merge into the Set; a case-only duplicate collapses (EC14).
        seen.add(value);
      }

      // Rule 7 — the Set's size must be <= 8, checked once after the full array.
      if (seen.size > MAX_TAG_COUNT) {
        return { ok: false, message: MESSAGES.TOO_MANY };
      }

      return { ok: true, tags: [...seen].sort() };
    },

    /**
     * @param {unknown} prefixRaw any string, or a non-string (coerced to '')
     * @returns {string[]} up to SUGGESTION_LIMIT matching names, alphabetical — never throws
     */
    suggest(prefixRaw) {
      const prefix = typeof prefixRaw === 'string' ? prefixRaw.toLowerCase() : '';
      return tagRepository.findByPrefix(escapeLikePattern(prefix), SUGGESTION_LIMIT);
    },
  };
}
