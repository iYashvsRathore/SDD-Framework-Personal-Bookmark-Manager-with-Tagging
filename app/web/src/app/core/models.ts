/**
 * The API contract, mirrored from hld.md section 8 and lld.md section 9.
 *
 * `titleSource` is server-owned: the client sends only `url` and `title`, and the
 * server decides the rest (S1).
 */
export interface Bookmark {
  readonly id: number;
  readonly url: string;
  readonly title: string;
  readonly title_source: 'user' | 'fetched' | 'hostname';
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateBookmarkRequest {
  readonly url: string;
  readonly title?: string;
  readonly tags?: readonly string[];
}

/**
 * F06: the edit payload. `updatedAt` is the row's `updated_at` as last seen by
 * this client — the server rejects a mismatch with 409 `EDIT_CONFLICT`
 * (AMD-003, LD-01), so staleness is never silently overwritten.
 */
export interface EditBookmarkRequest extends CreateBookmarkRequest {
  readonly updatedAt: string;
}

export interface CreateBookmarkResponse {
  readonly bookmark: Bookmark;
}

/** F07: `POST /api/bookmarks/:id/restore` success shape — identical to create/update's,
 * named distinctly only so call sites read clearly (lld.md section 3). */
export type RestoreBookmarkResponse = CreateBookmarkResponse;

/** The fixed page-size allow-list the server clamps against (F03-AC5, lld.md section 4). */
export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** A bookmark as rendered in the list, with its tags attached (F03-AC8). */
export interface BookmarkListItem extends Bookmark {
  readonly tags: readonly string[];
}

/** `GET /api/bookmarks` success shape (lld.md section 4). */
export interface ListBookmarksResponse {
  readonly items: readonly BookmarkListItem[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}

/** `GET /api/tags` success shape (F01/F02/F03, named for F04's rail — lld.md section 4). */
export interface TagWithCount {
  readonly id: number;
  readonly name: string;
  readonly bookmark_count: number;
}

/** `GET /api/bookmarks/count` success shape (F04-AC1, AC12, LD-04). */
export interface CountBookmarksResponse {
  readonly total: number;
}

export type ApiErrorCode =
  | 'INVALID_URL'
  | 'INVALID_TAG'
  | 'NOT_FOUND'
  | 'DUPLICATE_URL'
  | 'STORAGE_ERROR'
  | 'EDIT_CONFLICT'
  | 'INVALID_THEME';

export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly field?: string;
  readonly existingId?: number;
  readonly details?: {
    readonly title: string;
    readonly url: string;
    readonly tags?: readonly string[];
    readonly updatedAt?: string;
    readonly title_source?: 'user' | 'fetched' | 'hostname';
  };
}

/** F08: the one setting this app has (data-model.md v3, AD-05). */
export type Theme = 'light' | 'dark';

/** `GET`/`PUT /api/settings/theme` success shape (lld.md section 4). */
export interface ThemeResponse {
  readonly theme: Theme;
}
