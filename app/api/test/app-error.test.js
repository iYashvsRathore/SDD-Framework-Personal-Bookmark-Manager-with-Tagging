import { describe, expect, it } from 'vitest';
import { duplicateUrlError, editConflictError, toErrorResponse } from '../src/lib/app-error.js';

/**
 * F06-T01: editConflictError() is the one place a 409 EDIT_CONFLICT is built
 * (AMD-003, LD-01), and duplicateUrlError(existing, tags?) must stay byte-
 * identical to F01's existing body when called with no second argument.
 */

const EXISTING = {
  id: 7,
  title: 'First save',
  url: 'https://example.com/a',
  updated_at: '2025-01-15T10:30:00.000Z',
};

describe('editConflictError()', () => {
  it('returns the exact AMD-003 status/code/message', () => {
    const err = editConflictError();

    expect(err.code).toBe('EDIT_CONFLICT');
    expect(err.status).toBe(409);
    expect(err.message).toBe(
      'This bookmark changed in another tab. Reload to see the latest, then try again.'
    );

    const { status, body } = toErrorResponse(err);
    expect(status).toBe(409);
    expect(body).toEqual({
      error: {
        code: 'EDIT_CONFLICT',
        message: 'This bookmark changed in another tab. Reload to see the latest, then try again.',
      },
    });
  });
});

describe('duplicateUrlError(existing) — no second argument (F01 regression)', () => {
  it('produces the byte-identical body F01 already ships', () => {
    const err = duplicateUrlError(EXISTING);

    expect(err.code).toBe('DUPLICATE_URL');
    expect(err.status).toBe(409);
    expect(err.field).toBe('url');
    expect(err.existingId).toBe(7);
    expect(err.details).toEqual({ title: 'First save', url: 'https://example.com/a' });

    const { body } = toErrorResponse(err);
    expect(body.error.details).toEqual({ title: 'First save', url: 'https://example.com/a' });
    expect(Object.keys(body.error.details)).toEqual(['title', 'url']);
  });
});

describe('duplicateUrlError(existing, tags) — F06 LD-03 additive details', () => {
  it('folds tags and updatedAt into details alongside the existing title/url keys', () => {
    const err = duplicateUrlError(EXISTING, ['design', 'research']);

    expect(err.details).toEqual({
      title: 'First save',
      url: 'https://example.com/a',
      tags: ['design', 'research'],
      updatedAt: '2025-01-15T10:30:00.000Z',
    });
  });

  it('still carries an empty tags array when the existing bookmark has none', () => {
    const err = duplicateUrlError(EXISTING, []);

    expect(err.details.tags).toEqual([]);
  });
});
