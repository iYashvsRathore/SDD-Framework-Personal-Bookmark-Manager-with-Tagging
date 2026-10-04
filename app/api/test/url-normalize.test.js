import { describe, expect, it } from 'vitest';
import { hostnameForTitle, normalizeUrl } from '../src/services/url-normalize.js';

describe('normalizeUrl — F01-AC12 equivalences (INV-02, EC05)', () => {
  const canonical = normalizeUrl('https://example.com/a');

  it.each([
    ['host case', 'https://EXAMPLE.com/a'],
    ['trailing slash', 'https://example.com/a/'],
    ['fragment', 'https://example.com/a#section'],
    ['default port', 'https://example.com:443/a'],
    ['scheme case', 'HTTPS://example.com/a'],
    ['host case + trailing slash together', 'https://EXAMPLE.com/a/'],
    ['all four at once', 'HTTPS://EXAMPLE.com:443/a/#x'],
  ])('folds %s into the same normalized value', (_label, input) => {
    expect(normalizeUrl(input)).toBe(canonical);
  });

  it('produces the expected canonical string', () => {
    expect(canonical).toBe('https://example.com/a');
  });

  // The deliberate asymmetry F01-AC12 asks for: trailing slash folds, path case does not.
  it('keeps a different path CASE distinct — example.com/A is a separate bookmark', () => {
    expect(normalizeUrl('https://example.com/A')).toBe('https://example.com/A');
    expect(normalizeUrl('https://example.com/A')).not.toBe(canonical);
  });

  it('preserves the query string, including its case', () => {
    expect(normalizeUrl('https://example.com/a?Q=One&b=2')).toBe('https://example.com/a?Q=One&b=2');
    expect(normalizeUrl('https://example.com/a?q=1')).not.toBe(
      normalizeUrl('https://example.com/a?q=2')
    );
  });

  it('drops a default port but KEEPS a non-default one', () => {
    expect(normalizeUrl('http://example.com:80/a')).toBe('http://example.com/a');
    expect(normalizeUrl('https://example.com:8443/a')).toBe('https://example.com:8443/a');
  });

  it('reduces a bare host with an empty path to no trailing slash', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });
});

describe('normalizeUrl — IDNA / punycode (EC20)', () => {
  it('converts a unicode host to punycode', () => {
    expect(normalizeUrl('https://münchen.example/x')).toBe('https://xn--mnchen-3ya.example/x');
  });

  it('makes the unicode and punycode spellings of one host collide', () => {
    expect(normalizeUrl('https://münchen.example/x')).toBe(
      normalizeUrl('https://xn--mnchen-3ya.example/x')
    );
  });
});

describe('normalizeUrl — preconditions (LD-04)', () => {
  it.each([['javascript:alert(1)'], ['file:///etc/passwd'], ['ftp://example.com/x'], ['nonsense']])(
    'throws on %s, because it is a normalizer and not a validator',
    (input) => {
      expect(() => normalizeUrl(input)).toThrow(TypeError);
    }
  );
});

/**
 * lld.md section 12 — DECLARED OPEN GAP, deliberately not fixed in F01.
 * A trailing-dot hostname normalizes differently from the same host without it, so
 * one host can be saved twice. Fixing it would extend INV-02, an architecture
 * artifact. This test pins the CURRENT behavior so /test-phase probes a known value
 * rather than rediscovering it.
 */
describe('normalizeUrl — trailing-dot hostname (declared open gap, lld.md section 12)', () => {
  it('does NOT fold example.com. into example.com', () => {
    expect(normalizeUrl('https://example.com./a')).toBe('https://example.com./a');
    expect(normalizeUrl('https://example.com./a')).not.toBe(normalizeUrl('https://example.com/a'));
  });
});

describe('hostnameForTitle — INV-06 / C-F01-04', () => {
  it.each([
    ['https://www.example.com/x', 'example.com'],
    ['https://example.com/x', 'example.com'],
    ['https://WWW.EXAMPLE.COM/x', 'example.com'],
    ['https://sub.example.co.uk/x', 'sub.example.co.uk'],
    ['https://wwwx.example.com/x', 'wwwx.example.com'],
    ['http://127.0.0.1/x', '127.0.0.1'],
  ])('%s yields the fallback title %s', (input, expected) => {
    expect(hostnameForTitle(input)).toBe(expected);
  });

  // F01-RK1, accepted and recorded: same displayed title, still two distinct bookmarks.
  it('gives www and non-www the same title while keeping them distinct bookmarks', () => {
    expect(hostnameForTitle('https://www.example.com/x')).toBe(
      hostnameForTitle('https://example.com/x')
    );
    expect(normalizeUrl('https://www.example.com/x')).not.toBe(
      normalizeUrl('https://example.com/x')
    );
  });

  it('never returns an empty string, so INV-06 can always be satisfied', () => {
    expect(hostnameForTitle('https://example.com/x').length).toBeGreaterThan(0);
  });
});
