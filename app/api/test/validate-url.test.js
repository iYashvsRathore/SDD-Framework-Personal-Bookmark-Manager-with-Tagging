import { describe, expect, it } from 'vitest';
import {
  MAX_URL_LENGTH,
  MESSAGES,
  validateUrl,
  validateUserTitle,
} from '../src/lib/validate-url.js';
import { normalizeUrl } from '../src/services/url-normalize.js';

/** 'https://example.com/' is exactly 20 characters. */
const URL_PREFIX = 'https://example.com/';
const urlOfLength = (n) => URL_PREFIX + 'a'.repeat(n - URL_PREFIX.length);

describe('validateUrl — rule 1: empty (EC01, F01-AC7)', () => {
  it.each([
    ['empty string', ''],
    ['spaces only', '   '],
    ['tab and newline only', '\t\n '],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
  ])('rejects %s with the exact empty message', (_label, input) => {
    const result = validateUrl(input);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Enter a web address to save.');
    expect(result.message).toBe(MESSAGES.EMPTY);
  });
});

describe('validateUrl — rule 2: length boundary (EC04, F01-EC4, F01-AC10)', () => {
  it('accepts a URL of exactly 2,048 characters', () => {
    const url = urlOfLength(2048);
    expect(url).toHaveLength(2048);
    expect(validateUrl(url)).toEqual({ ok: true, url });
  });

  it('rejects a URL of exactly 2,049 characters with the exact limit message', () => {
    const url = urlOfLength(2049);
    expect(url).toHaveLength(2049);
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('That web address is too long (limit 2,048 characters).');
  });

  it('measures the length AFTER trimming', () => {
    const url = urlOfLength(MAX_URL_LENGTH);
    expect(validateUrl(`   ${url}   `).ok).toBe(true);
  });
});

describe('validateUrl — rules 3-5: shape, scheme and host (F01-AC8, F01-AC9)', () => {
  it.each([
    // F01-AC9 — non-http(s) schemes. No outbound fetch is ever attempted for these.
    ['javascript:alert(1)'],
    ['file:///etc/passwd'],
    ['ftp://example.com/x'],
    ['data:text/html,<script>'],
    // F01-AC8 — no scheme, or a hostname with no dot.
    ['example.com'],
    ['//example.com/x'],
    ['http://localhost:3000'],
    ['http://intranet'],
    ['http://router'],
    // F01-EC1 / lld.md section 7.2 — bracketed IPv6 literals carry no dot.
    ['http://[::1]/'],
    ['http://[::ffff:127.0.0.1]/'],
    // Unparseable.
    ['http://'],
    ['https://'],
    ['not a url at all'],
  ])('rejects %s with the shared message', (input) => {
    const result = validateUrl(input);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Enter a web address starting with http:// or https://.');
  });

  it.each([
    ['https://example.com/article'],
    ['http://example.com'],
    ['https://sub.example.co.uk/a/b?q=1#frag'],
    ['https://münchen.example/x'],
  ])('accepts %s', (input) => {
    expect(validateUrl(input).ok).toBe(true);
  });

  it('returns the trimmed URL, not the raw input', () => {
    expect(validateUrl('  https://example.com/a  ')).toEqual({
      ok: true,
      url: 'https://example.com/a',
    });
  });
});

/**
 * lld.md section 7.2 — the literal table, asserted row by row against ACTUAL parser
 * behavior. The table was design intent when written; these are the observed results.
 */
describe('validateUrl — the section 7.2 literal table', () => {
  it.each([
    ['http://localhost:3000', 'localhost', false],
    ['http://intranet', 'intranet', false],
    ['http://[::1]/', '[::1]', false],
    ['http://[::ffff:127.0.0.1]/', '[::ffff:7f00:1]', false],
    // Decimal and hex forms are EXPANDED by the WHATWG parser, so they carry dots and
    // pass validation. They are refused later by the SSRF guard after resolution,
    // yielding 201 with the hostname fallback (F01-EC2: "resolve and check, do not
    // pattern-match").
    ['http://2130706433/', '127.0.0.1', true],
    ['http://0x7f.1/', '127.0.0.1', true],
    ['http://127.0.0.1/', '127.0.0.1', true],
    ['http://10.0.0.1/', '10.0.0.1', true],
    ['http://192.168.1.1/', '192.168.1.1', true],
    ['http://169.254.169.254/', '169.254.169.254', true],
    ['https://private.example.com', 'private.example.com', true],
  ])('%s parses to host %s and passes validation: %s', (input, expectedHost, expectedOk) => {
    expect(new URL(input).hostname).toBe(expectedHost);
    expect(validateUrl(input).ok).toBe(expectedOk);
  });
});

/**
 * LD-04's trade-off made into a property under test: normalization can never be used
 * as a validator, so the scheme and dot checks MUST run first.
 */
describe('ordering — validation strictly before normalization (LD-04)', () => {
  it('rejects javascript:alert(1) at rule 4, with the exact message', () => {
    expect(validateUrl('javascript:alert(1)')).toEqual({
      ok: false,
      message: 'Enter a web address starting with http:// or https://.',
    });
  });

  it('normalizeUrl THROWS on the same input, proving it is not a validator', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow(TypeError);
    expect(() => normalizeUrl('http://localhost:3000')).not.toThrow();
  });

  it('new URL() alone accepts what the validator rejects — the reason the order matters', () => {
    expect(() => new URL('javascript:alert(1)')).not.toThrow();
    expect(() => new URL('http://localhost:3000')).not.toThrow();
    expect(validateUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateUrl('http://localhost:3000').ok).toBe(false);
  });
});

describe('validateUserTitle — rule 6 (INV-05)', () => {
  it('accepts a title of exactly 140 characters', () => {
    const title = 'x'.repeat(140);
    expect(validateUserTitle(title)).toEqual({ ok: true, title });
  });

  it('rejects a title of 141 characters with the exact message', () => {
    const result = validateUserTitle('x'.repeat(141));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('That title is too long (limit 140 characters).');
  });

  it('trims before measuring, and treats a missing title as empty', () => {
    expect(validateUserTitle('  My article  ')).toEqual({ ok: true, title: 'My article' });
    expect(validateUserTitle(undefined)).toEqual({ ok: true, title: '' });
  });
});
