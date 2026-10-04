import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative-time';

const NOW = new Date('2025-01-15T12:00:00.000Z');
const DAY_MS = 86_400_000;
const isoDaysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS).toISOString();

describe('relativeTime — the mockup ago() bucket boundaries, verbatim (C-F03-03)', () => {
  it.each([
    ['today', 0],
    ['today', 0.5],
    ['yesterday', 1],
    ['2 days ago', 2],
    ['13 days ago', 13],
    ['2 weeks ago', 14],
    ['8 weeks ago', 59],
    ['2 months ago', 60],
    ['4 months ago', 120],
  ])('%s for %j days ago', (expected, daysAgo) => {
    expect(relativeTime(isoDaysAgo(daysAgo), NOW)).toBe(expected);
  });

  it('defaults now to the real clock when not supplied', () => {
    expect(relativeTime(new Date().toISOString())).toBe('today');
  });
});
