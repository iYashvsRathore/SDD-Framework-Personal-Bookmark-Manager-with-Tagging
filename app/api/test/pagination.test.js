import { describe, expect, it } from 'vitest';
import {
  PAGE_SIZES,
  DEFAULT_SIZE,
  clampSize,
  clampPage,
  computeMaxPage,
} from '../src/lib/pagination.js';

describe('F03-AC5 — clampSize never errors, falls back to the default', () => {
  it.each([
    ['10', 10],
    ['20', 20],
    ['50', 50],
    ['7', DEFAULT_SIZE],
    ['500', DEFAULT_SIZE],
    ['abc', DEFAULT_SIZE],
    [undefined, DEFAULT_SIZE],
    ['', DEFAULT_SIZE],
    ['  ', DEFAULT_SIZE],
    ['20.5', DEFAULT_SIZE],
    ['-10', DEFAULT_SIZE],
    [['20', '50'], DEFAULT_SIZE], // array shape (repeated query param)
  ])('clampSize(%j) -> %j', (raw, expected) => {
    expect(clampSize(raw)).toBe(expected);
  });

  it('exposes the fixed allow-list', () => {
    expect(PAGE_SIZES).toEqual([10, 20, 50]);
  });
});

describe('F03-AC5, F03-AC6 — clampPage never errors, clamps into [1, maxPage]', () => {
  it.each([
    ['0', 5, 1],
    ['-1', 5, 1],
    ['abc', 5, 1],
    [undefined, 5, 1],
    ['', 5, 1],
    ['1', 5, 1],
    ['3', 5, 3],
    ['99', 3, 3], // beyond the last valid page clamps DOWN, not to an empty page
  ])('clampPage(%j, maxPage=%j) -> %j', (raw, maxPage, expected) => {
    expect(clampPage(raw, maxPage)).toBe(expected);
  });
});

describe('F03-EC2 — computeMaxPage has no phantom page when total is an exact multiple of size', () => {
  it.each([
    [25, 10, 3], // not a multiple: 3 pages (10, 10, 5)
    [20, 10, 2], // exact multiple: exactly 2 pages, no empty 3rd
    [0, 20, 1], // empty list still reports page 1 (F03-AC2)
  ])('computeMaxPage(total=%j, size=%j) -> %j', (total, size, expected) => {
    expect(computeMaxPage(total, size)).toBe(expected);
  });
});
