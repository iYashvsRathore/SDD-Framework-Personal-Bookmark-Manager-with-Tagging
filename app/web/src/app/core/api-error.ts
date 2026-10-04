import type { ApiErrorBody } from './models';

/**
 * Turns anything HttpClient can hand back into a body the UI can render.
 *
 * The API's error shape is a contract, but a proxy, a dev server or a dropped
 * connection can produce a response that does not follow it. Rather than let the
 * UI render `undefined`, every unrecognised shape collapses to one honest message.
 */
export const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
export const OFFLINE_MESSAGE = 'TagVault could not reach the server. Is it running?';

const KNOWN_CODES = [
  'INVALID_URL',
  'INVALID_TAG',
  'NOT_FOUND',
  'DUPLICATE_URL',
  'STORAGE_ERROR',
  'EDIT_CONFLICT',
];

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { code?: unknown; message?: unknown };
  return (
    typeof candidate.code === 'string' &&
    KNOWN_CODES.includes(candidate.code) &&
    typeof candidate.message === 'string'
  );
}

/** @param error the value rejected by HttpClient. */
export function toApiError(error: unknown): ApiErrorBody {
  const response = error as { status?: number; error?: { error?: unknown } };

  const body = response?.error?.error;
  if (isApiErrorBody(body)) return body;

  // status 0 means the request never reached the server at all.
  if (response?.status === 0) {
    return { code: 'STORAGE_ERROR', message: OFFLINE_MESSAGE };
  }

  return { code: 'STORAGE_ERROR', message: FALLBACK_MESSAGE };
}
