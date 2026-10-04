import { describe, expect, it } from 'vitest';
import {
  buildPredicate,
  normalizeSearchValue,
  normalizeTagFilterValue,
} from '../src/services/list-query.js';

describe('buildPredicate() — F04-AC3, AC7, AC8', () => {
  it("returns F03's exact unchanged shape when no tag is given", () => {
    expect(buildPredicate()).toEqual({ where: 'deleted_at IS NULL', params: [] });
    expect(buildPredicate({})).toEqual({ where: 'deleted_at IS NULL', params: [] });
    expect(buildPredicate({ tag: null })).toEqual({ where: 'deleted_at IS NULL', params: [] });
    expect(buildPredicate({ tag: undefined })).toEqual({
      where: 'deleted_at IS NULL',
      params: [],
    });
  });

  it('adds an EXISTS subquery against bookmark_tag/tag when tag is present', () => {
    const { where, params } = buildPredicate({ tag: 'research' });

    expect(where).toBe(
      'deleted_at IS NULL AND EXISTS ' +
        '(SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id ' +
        'WHERE bt.bookmark_id = bookmark.id AND t.name = ?)'
    );
    expect(params).toEqual(['research']);
  });

  it('never throws, regardless of input shape', () => {
    expect(() => buildPredicate({ tag: '' })).not.toThrow();
  });
});

describe('buildPredicate({ q }) — F05-AC1, AC2, AC4, AC5, AC6, AC11', () => {
  it('adds an escaped LIKE clause against title and url when q is present', () => {
    const { where, params } = buildPredicate({ q: 'tomato' });

    expect(where).toBe(
      "deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')"
    );
    expect(params).toEqual(['%tomato%', '%tomato%']);
  });

  it('escapes %, _ and \\ before wrapping the pattern (S6, F05-AC4, AC5)', () => {
    const { params } = buildPredicate({ q: '100%_\\x' });

    expect(params).toEqual(['%100\\%\\_\\\\x%', '%100\\%\\_\\\\x%']);
  });

  it('binds a quote/<script> payload as a literal parameter, never breaking the query (F05-AC6)', () => {
    const { where, params } = buildPredicate({ q: "<script>alert(1)</script>O'Reilly" });

    expect(where).toContain('LIKE ? ESCAPE');
    expect(params[0]).toBe("%<script>alert(1)</script>O'Reilly%");
  });
});

describe('buildPredicate({ tag, q }) — F05-AC9, F05-EC3', () => {
  it('AND-joins the tag EXISTS clause and the search LIKE clause', () => {
    const { where, params } = buildPredicate({ tag: 'research', q: 'guide' });

    expect(where).toBe(
      'deleted_at IS NULL AND EXISTS ' +
        '(SELECT 1 FROM bookmark_tag bt JOIN tag t ON t.id = bt.tag_id ' +
        "WHERE bt.bookmark_id = bookmark.id AND t.name = ?) AND (title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')"
    );
    expect(params).toEqual(['research', '%guide%', '%guide%']);
  });
});

describe('normalizeTagFilterValue() — F04-AC7, AC8, F04-EC1', () => {
  it.each([
    ['Research', 'research'],
    ['  research  ', 'research'],
    ['RESEARCH', 'research'],
    ['front end', 'front end'], // F04-EC3: a space is part of the tag's identity
    ['', null],
    ['   ', null],
    [undefined, null],
    [null, null],
    [42, null],
    [['research'], null], // a repeated query parameter arrives as an array
  ])('%j normalizes to %j', (raw, expected) => {
    expect(normalizeTagFilterValue(raw)).toBe(expected);
  });

  it('never throws, regardless of input shape', () => {
    expect(() => normalizeTagFilterValue({})).not.toThrow();
  });
});

describe('normalizeSearchValue() — F05-AC11, F05-EC2', () => {
  it.each([
    ['tomato', 'tomato'],
    ['  tomato  ', 'tomato'],
    ['TOMATO', 'TOMATO'], // case is NOT folded here — LIKE's own job (F05-AC3)
    ['', null],
    ['   ', null],
    [undefined, null],
    [null, null],
    [42, null],
    [['tomato'], null], // a repeated query parameter arrives as an array
  ])('%j normalizes to %j', (raw, expected) => {
    expect(normalizeSearchValue(raw)).toBe(expected);
  });

  it('caps a 210-character value at 200 characters (F05-EC2)', () => {
    const raw = 'a'.repeat(210);
    const result = normalizeSearchValue(raw);

    expect(result).toHaveLength(200);
    expect(result).toBe('a'.repeat(200));
  });

  it('never throws, regardless of input shape', () => {
    expect(() => normalizeSearchValue({})).not.toThrow();
  });
});
