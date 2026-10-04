import { describe, expect, it, vi } from 'vitest';
import { MESSAGES, createTagService } from '../src/services/tag-service.js';

function makeService(findByPrefixImpl = () => []) {
  return createTagService({ tagRepository: { findByPrefix: vi.fn(findByPrefixImpl) } });
}

describe('normalizeAndValidate — C-F02-05, tags are optional', () => {
  it('undefined tags -> { ok: true, tags: [] }', () => {
    expect(makeService().normalizeAndValidate(undefined)).toEqual({ ok: true, tags: [] });
  });
});

describe('normalizeAndValidate — F02-EC2, shape bypassing the client', () => {
  it('rejects a non-array', () => {
    expect(makeService().normalizeAndValidate('research')).toEqual({
      ok: false,
      message: MESSAGES.SHAPE,
    });
  });

  it('rejects an array containing a non-string element', () => {
    expect(makeService().normalizeAndValidate(['docs', 42])).toEqual({
      ok: false,
      message: MESSAGES.SHAPE,
    });
  });
});

describe('normalizeAndValidate — F02-AC6, the 8-tag cap', () => {
  it('rejects 9 distinct valid tags with no row implied (whole array)', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    expect(makeService().normalizeAndValidate(nine)).toEqual({
      ok: false,
      message: MESSAGES.TOO_MANY,
    });
  });

  it('accepts exactly 8 distinct valid tags', () => {
    const eight = Array.from({ length: 8 }, (_, i) => `tag${i}`);
    const result = makeService().normalizeAndValidate(eight);
    expect(result.ok).toBe(true);
    expect(result.tags).toHaveLength(8);
  });
});

describe('normalizeAndValidate — F02-AC8/F02-EC3, the 24-character boundary', () => {
  it('rejects a 25-character tag', () => {
    expect(makeService().normalizeAndValidate(['a'.repeat(25)])).toEqual({
      ok: false,
      message: MESSAGES.TOO_LONG,
    });
  });

  it('accepts a 24-character tag unchanged', () => {
    const tag = 'a'.repeat(24);
    expect(makeService().normalizeAndValidate([tag])).toEqual({ ok: true, tags: [tag] });
  });
});

describe('normalizeAndValidate — F02-AC9, the character allow-list', () => {
  it.each([['re$earch'], ['tag!']])('rejects %s', (bad) => {
    expect(makeService().normalizeAndValidate([bad])).toEqual({
      ok: false,
      message: MESSAGES.CHARSET,
    });
  });

  it('accepts "front-end dev_2"', () => {
    expect(makeService().normalizeAndValidate(['front-end dev_2'])).toEqual({
      ok: true,
      tags: ['front-end dev_2'],
    });
  });
});

describe('normalizeAndValidate — EC14, a case-only duplicate collapses to one entry', () => {
  it('"Research" and "research" produce one entry', () => {
    expect(makeService().normalizeAndValidate(['Research', 'research'])).toEqual({
      ok: true,
      tags: ['research'],
    });
  });
});

describe('normalizeAndValidate — EC15, empty/whitespace-only entries are dropped silently', () => {
  it('drops a whitespace-only element without rejecting the request', () => {
    expect(makeService().normalizeAndValidate(['docs', '   '])).toEqual({
      ok: true,
      tags: ['docs'],
    });
  });
});

describe('normalizeAndValidate — AS-F02-01, the final array is always alphabetical', () => {
  it('sorts regardless of input order', () => {
    expect(makeService().normalizeAndValidate(['zeta', 'alpha', 'mid'])).toEqual({
      ok: true,
      tags: ['alpha', 'mid', 'zeta'],
    });
  });
});

describe('suggest', () => {
  it('lowercases and escapes the prefix, delegating to the repository with limit 10', () => {
    const findByPrefix = vi.fn(() => ['database', 'design', 'docs']);
    const service = createTagService({ tagRepository: { findByPrefix } });

    const result = service.suggest('D');

    expect(findByPrefix).toHaveBeenCalledWith('d', 10);
    expect(result).toEqual(['database', 'design', 'docs']);
  });

  it('coerces a non-string prefix to an empty string', () => {
    const findByPrefix = vi.fn(() => []);
    const service = createTagService({ tagRepository: { findByPrefix } });

    service.suggest(undefined);

    expect(findByPrefix).toHaveBeenCalledWith('', 10);
  });

  it('escapes LIKE metacharacters before delegating (S6)', () => {
    const findByPrefix = vi.fn(() => []);
    const service = createTagService({ tagRepository: { findByPrefix } });

    service.suggest('100%');

    expect(findByPrefix).toHaveBeenCalledWith('100\\%', 10);
  });
});
