import { describe, expect, it } from 'vitest';
import { FALLBACK_MESSAGE, toApiError } from './api-error';

/** F06-T06: `EDIT_CONFLICT` must be recognised, not collapsed to the fallback. */
describe('toApiError — EDIT_CONFLICT (F06)', () => {
  it('passes an EDIT_CONFLICT body through unchanged', () => {
    const body = {
      code: 'EDIT_CONFLICT',
      message: 'This bookmark changed in another tab. Reload to see the latest, then try again.',
    };

    const result = toApiError({ error: { error: body } });

    expect(result).toEqual(body);
    expect(result.message).not.toBe(FALLBACK_MESSAGE);
  });
});
