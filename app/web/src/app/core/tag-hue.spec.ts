import { describe, expect, it } from 'vitest';
import { tagHue } from './tag-hue';

describe('tagHue (F04-T05)', () => {
  it('returns the same hue for the same tag name', () => {
    expect(tagHue('research')).toBe(tagHue('research'));
  });

  it('returns a value within the 0-359 hue range', () => {
    const hue = tagHue('front end');
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('returns different hues for different tag names', () => {
    expect(tagHue('research')).not.toBe(tagHue('docs'));
  });

  it('returns a stable value for an empty string', () => {
    expect(tagHue('')).toBe(7);
  });
});
