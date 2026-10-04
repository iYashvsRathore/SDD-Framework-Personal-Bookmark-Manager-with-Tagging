import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from '../src/lib/like-escape.js';

/**
 * Table test over every LIKE metacharacter this function must neutralize, plus a
 * value containing none of them (S6, lld.md section 11).
 */
describe('escapeLikePattern', () => {
  it.each([
    ['percent', '50%off', '50\\%off'],
    ['underscore', 'a_b', 'a\\_b'],
    ['backslash', 'a\\b', 'a\\\\b'],
    ['all three combined', 'a\\b_c%d', 'a\\\\b\\_c\\%d'],
    ['none of the three', 'docs', 'docs'],
  ])('%s', (_label, input, expected) => {
    expect(escapeLikePattern(input)).toBe(expected);
  });
});
