import { describe, expect, it } from 'vitest';
import { displayUrl } from './url-display';

describe('displayUrl (F03-AC8)', () => {
  it('strips a leading www. from the host', () => {
    expect(displayUrl('https://www.example.com/article').host).toBe('example.com');
  });

  it('leaves a host with no www. prefix unchanged', () => {
    expect(displayUrl('https://docs.example.com/guide').host).toBe('docs.example.com');
  });

  it('preserves the path and query string', () => {
    expect(displayUrl('https://example.com/a/b?x=1').rest).toBe('/a/b?x=1');
  });

  it('strips a single trailing slash from the path', () => {
    expect(displayUrl('https://example.com/a/').rest).toBe('/a');
  });

  it('returns an empty rest for a bare host', () => {
    expect(displayUrl('https://example.com')).toEqual({ host: 'example.com', rest: '' });
  });

  it('falls back to the raw string rather than throwing on an unparsable URL', () => {
    expect(displayUrl('not a url')).toEqual({ host: 'not a url', rest: '' });
  });
});
