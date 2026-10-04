import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CountBookmarksResponse,
  CreateBookmarkRequest,
  CreateBookmarkResponse,
  EditBookmarkRequest,
  ListBookmarksResponse,
  RestoreBookmarkResponse,
  TagWithCount,
  Theme,
  ThemeResponse,
} from './models';

/**
 * The only place the application talks to the API.
 *
 * Relative URLs are deliberate: in development the Angular dev-server proxy
 * forwards /api to the API, and in the packaged build Express serves both from
 * the same origin. Neither case needs a configurable base URL, and not having one
 * means no way to point the app at an unexpected host.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  createBookmark(payload: CreateBookmarkRequest): Promise<CreateBookmarkResponse> {
    return firstValueFrom(this.http.post<CreateBookmarkResponse>('/api/bookmarks', payload));
  }

  /** F06: saves an edit, carrying the last-seen `updatedAt` for conflict detection (LD-01). */
  updateBookmark(id: number, payload: EditBookmarkRequest): Promise<CreateBookmarkResponse> {
    return firstValueFrom(this.http.put<CreateBookmarkResponse>(`/api/bookmarks/${id}`, payload));
  }

  /** F07: soft-deletes a bookmark; the server returns 204 with no body (F07-AC3). */
  deleteBookmark(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/bookmarks/${id}`));
  }

  /** F07: undoes a delete within the toast window (F07-AC4). */
  restoreBookmark(id: number): Promise<RestoreBookmarkResponse> {
    return firstValueFrom(
      this.http.post<RestoreBookmarkResponse>(`/api/bookmarks/${id}/restore`, {}),
    );
  }

  /**
   * `page`/`size` are sent exactly as given — the server does the clamping
   * (F03-AC5, F03-AC6); nothing here rejects or rewrites them first. `tag`
   * (F04) and `q` (F05) are each appended only when non-null, so an
   * unfiltered request is byte-identical to F03's (no empty `tag=`/`q=`
   * param ever sent).
   */
  listBookmarks(
    page: number,
    size: number,
    tag?: string | null,
    q?: string | null,
  ): Promise<ListBookmarksResponse> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (tag != null) {
      params['tag'] = tag;
    }
    if (q != null) {
      params['q'] = q;
    }
    return firstValueFrom(this.http.get<ListBookmarksResponse>('/api/bookmarks', { params }));
  }

  /** Tag-prefix suggestions for the chip input (F02-AC11-AC13). */
  suggestTags(prefix: string): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>('/api/tags', { params: { prefix } }));
  }

  /** Every live tag and its live-bookmark count, for the tag rail (F04-AC1, AC10). */
  listTags(): Promise<TagWithCount[]> {
    return firstValueFrom(this.http.get<TagWithCount[]>('/api/tags'));
  }

  /** The live (unfiltered) bookmark count, for the rail's "All bookmarks" entry and the count region (F04-AC1, AC12). */
  countBookmarks(): Promise<CountBookmarksResponse> {
    return firstValueFrom(this.http.get<CountBookmarksResponse>('/api/bookmarks/count'));
  }

  /** F08: the stored theme, or the server's default when none is set yet (F08-AC1). */
  getTheme(): Promise<ThemeResponse> {
    return firstValueFrom(this.http.get<ThemeResponse>('/api/settings/theme'));
  }

  /** F08: persists the new theme (F08-AC3, AC6). */
  setTheme(theme: Theme): Promise<ThemeResponse> {
    return firstValueFrom(this.http.put<ThemeResponse>('/api/settings/theme', { theme }));
  }
}
