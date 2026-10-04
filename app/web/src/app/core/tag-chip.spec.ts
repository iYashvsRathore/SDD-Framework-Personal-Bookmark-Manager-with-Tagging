import { describe, expect, it } from 'vitest';
import { normalizeChipValue, splitCommaSeparated } from './tag-chip';

describe('normalizeChipValue (F02-AC7)', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeChipValue('  Research  ')).toBe('research');
  });

  it('truncates a 30-character input to its first 24 characters, lowercased', () => {
    const raw = 'A'.repeat(30);
    const result = normalizeChipValue(raw);

    expect(result).toBe('a'.repeat(24));
    expect(result).toHaveLength(24);
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeChipValue('   ')).toBe('');
  });
});

describe('splitCommaSeparated (F02-AC4, F02-EC1)', () => {
  it('splits a comma-separated value into its parts, in order', () => {
    expect(splitCommaSeparated('urgent,docs,offline')).toEqual(['urgent', 'docs', 'offline']);
  });

  it('returns a single-element array when there is no comma', () => {
    expect(splitCommaSeparated('urgent')).toEqual(['urgent']);
  });
});
