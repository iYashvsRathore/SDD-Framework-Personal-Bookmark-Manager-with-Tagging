import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ApiErrorBody,
  BookmarkListItem,
  CreateBookmarkRequest,
  TagWithCount,
} from '../core/models';
import { DEFAULT_PAGE_SIZE } from '../core/models';
import { validateUrl, validateUserTitle } from '../core/validate-url';
import { normalizeChipValue, splitCommaSeparated } from '../core/tag-chip';
import { ApiService } from '../core/api.service';
import { toApiError } from '../core/api-error';

/**
 * The exact strings F01 fixes. Held as constants so a test can assert the wording
 * against one definition rather than a copy of it.
 *
 * Both use an ASCII apostrophe and three dots rather than the typographic forms in
 * the spec prose - the declared U6 deviation, applied consistently.
 */
export const BUSY_FETCHING_TITLE = 'Fetching title...';
export const SAVED_TOAST = 'Bookmark saved';
/** F06: the edit flow's equivalent of `SAVED_TOAST`, so a test can tell the two apart. */
export const CHANGES_SAVED_TOAST = 'Changes saved';
/** F07-AC3: the delete toast's fixed text, carrying the Undo action. */
export const DELETED_TOAST = 'Bookmark deleted';
export const TITLE_FALLBACK_NOTICE =
  "Couldn't fetch the title, so we used the domain instead. You can edit it anytime.";

/**
 * F03-AC11's fixed generic message. Unlike `save()`'s errors, the list-fetch
 * failure never surfaces the underlying cause (network vs. 5xx) — one plain
 * message either way, so `loadList()` never reads `toApiError(error).message`.
 */
export const LIST_ERROR_MESSAGE = 'Something went wrong loading your bookmarks.';

/** F02-AC5's cap, mirroring `tag-service.js`'s `MAX_TAG_COUNT` on the server. */
const MAX_TAGS = 8;

/**
 * All UI-driving state for the add flow.
 *
 * Every field is a signal or computed: with zoneless change detection (TD-09) a
 * plain property would not schedule a re-render, so signals are what makes the
 * view update at all rather than a stylistic preference.
 */
@Injectable({ providedIn: 'root' })
export class BookmarksStore {
  private readonly api = inject(ApiService);

  // ---- form fields -------------------------------------------------------
  readonly url = signal('');
  readonly userTitle = signal('');

  // ---- request lifecycle -------------------------------------------------
  readonly submitting = signal(false);
  readonly urlError = signal('');
  readonly titleError = signal('');

  /** Set while the server is fetching a page title, so the wait is explained (AC3). */
  readonly busyNote = signal('');

  /** The 409 payload, kept whole so the banner can offer the existing bookmark. */
  readonly duplicate = signal<ApiErrorBody | null>(null);

  /**
   * F06: set by `beginEdit()`, cleared by `reset()`. Holds just enough of the
   * row being edited to build the next save's request — `id` to address it,
   * `updatedAt` to carry LD-01's optimistic-concurrency check.
   */
  readonly editing = signal<{ readonly id: number; readonly updatedAt: string } | null>(null);

  /** F06-AC10, AC11: the row-gone / stale-edit banner, distinct from the add flow's field errors. */
  readonly editBannerError = signal<ApiErrorBody | null>(null);

  // ---- tag state (F02) ----------------------------------------------------
  readonly tags = signal<readonly string[]>([]);
  readonly tagSuggestions = signal<readonly string[]>([]);
  readonly tagsError = signal('');

  /** LD-04: only the most recently issued `loadTagSuggestions()` call may write state. */
  private tagSuggestionsRequestToken = 0;

  /**
   * The live region above the fold. Carries the save confirmation, the F01-AC5
   * title-fallback notice, or F07's delete/restore feedback - see `save()` for
   * why AC5's message lands here rather than inside the dialog.
   */
  readonly toast = signal('');

  /** F07: set only while the current toast offers an Undo action (F07-AC4, AC16). */
  readonly toastUndo = signal<(() => void) | null>(null);

  /** F07-LD-02: the pending auto-clear timer for the current toast, if any. */
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- list state (F03) --------------------------------------------------
  readonly items = signal<readonly BookmarkListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly size = signal(DEFAULT_PAGE_SIZE);
  readonly listLoading = signal(false);
  readonly listError = signal('');

  /** LD-04: only the most recently issued `loadList()` call may write state. */
  private listRequestToken = 0;

  // ---- tag filter state (F04) ---------------------------------------------
  readonly tagFilter = signal<string | null>(null);
  readonly tagRail = signal<readonly TagWithCount[]>([]);
  readonly allCount = signal(0);

  /** LD-03/F04-EC4: only the most recently issued `refreshTagRail()` call may write state. */
  private tagRailRequestToken = 0;

  // ---- search state (F05) --------------------------------------------------
  /** F05: the active search text, `''` when no search is applied. */
  readonly search = signal('');

  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  /**
   * F03-AC12's singular/plural rule when no filter is active; F04-AC12's
   * `"N of M bookmarks"` wording (always plural, ported verbatim from
   * `docs/mockup.html`'s `render()`) when a tag filter and/or a search is
   * active (F05-AC10).
   */
  readonly countText = computed(() => {
    const total = this.total();
    if (this.tagFilter() !== null || this.search() !== '') {
      return `${total} of ${this.allCount()} bookmarks`;
    }
    return total === 1 ? '1 bookmark' : `${total} bookmarks`;
  });

  readonly canSubmit = computed(() => !this.submitting());

  /**
   * F07-LD-02: the one place the toast's text, its optional Undo handler, and
   * its 6-second auto-clear timer are all set together. A fresh call always
   * cancels any still-pending timer from a previous toast first, so two
   * timers can never race to clear the same signal (F07-AC5, F07-EC3).
   */
  private showToast(message: string, onUndo?: () => void): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set(message);
    this.toastUndo.set(onUndo ?? null);
    this.toastTimer = setTimeout(() => this.clearToast(), 6000);
  }

  /** Clears the toast and its Undo action immediately, cancelling any pending timer. */
  private clearToast(): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toast.set('');
    this.toastUndo.set(null);
  }

  /** Everything the dialog shows is derived state, so one call resets all of it. */
  reset(): void {
    this.url.set('');
    this.userTitle.set('');
    this.submitting.set(false);
    this.tags.set([]);
    this.tagSuggestions.set([]);
    this.editing.set(null);
    this.clearMessages();
  }

  clearMessages(): void {
    this.urlError.set('');
    this.titleError.set('');
    this.busyNote.set('');
    this.duplicate.set(null);
    this.tagsError.set('');
    this.editBannerError.set(null);
  }

  /**
   * F06: pre-fills the dialog from an already-held row (LD-03 — no new `GET`
   * is issued) and marks the save that follows as an edit of that row.
   */
  beginEdit(bookmark: BookmarkListItem): void {
    this.url.set(bookmark.url);
    this.userTitle.set(bookmark.title_source === 'user' ? bookmark.title : '');
    this.tags.set(bookmark.tags);
    this.tagSuggestions.set([]);
    this.clearMessages();
    this.editing.set({ id: bookmark.id, updatedAt: bookmark.updated_at });
  }

  /**
   * Normalizes, dedupes and caps a single raw chip value (AC2, AC3, AC5, AC7).
   * Every rejection is silent — there is no error state for "didn't add a chip".
   */
  addTagChip(raw: string): void {
    const value = normalizeChipValue(raw);
    if (!value) return;
    if (this.tags().includes(value)) return;
    if (this.tags().length >= MAX_TAGS) return;
    this.tags.set([...this.tags(), value]);
  }

  /** Comma-separated paste/typed text, split and committed one chip at a time (F02-EC1). */
  addTagsFromText(raw: string): void {
    for (const part of splitCommaSeparated(raw)) {
      this.addTagChip(part);
    }
  }

  removeTagChip(name: string): void {
    this.tags.set(this.tags().filter((tag) => tag !== name));
  }

  removeLastTagChip(): void {
    const current = this.tags();
    if (current.length === 0) return;
    this.tags.set(current.slice(0, -1));
  }

  /**
   * Fetches prefix suggestions for the chip input's `<datalist>` (AC11-AC13).
   *
   * A failed fetch degrades to an empty suggestion list rather than a visible
   * error (lld.md section 8) — suggestions are a convenience, not a requirement.
   * Guarded against out-of-order responses the same way `loadList()` is (LD-04).
   */
  async loadTagSuggestions(prefix: string): Promise<void> {
    const token = ++this.tagSuggestionsRequestToken;
    try {
      const suggestions = await this.api.suggestTags(prefix);
      if (token !== this.tagSuggestionsRequestToken) return;
      this.tagSuggestions.set(suggestions);
    } catch (error) {
      if (token !== this.tagSuggestionsRequestToken) return;
      void error;
      this.tagSuggestions.set([]);
    }
  }

  /**
   * Runs the client echo of §7.1.
   *
   * @returns the field that failed, so the caller can move focus there (AC7, AC8).
   */
  validate(): 'url' | 'title' | null {
    this.urlError.set('');
    this.titleError.set('');

    const urlCheck = validateUrl(this.url());
    if (!urlCheck.ok) {
      this.urlError.set(urlCheck.message);
      return 'url';
    }

    const titleCheck = validateUserTitle(this.userTitle());
    if (!titleCheck.ok) {
      this.titleError.set(titleCheck.message);
      return 'title';
    }

    return null;
  }

  /**
   * Sends the create (or, with `editing()` set, the F06 edit) request and maps
   * every outcome onto UI state.
   *
   * @returns true when the bookmark was saved, so the caller can close the dialog.
   *   A failure deliberately leaves the dialog open with the typed address intact.
   */
  async save(payload: CreateBookmarkRequest): Promise<boolean> {
    this.submitting.set(true);
    this.urlError.set('');
    this.tagsError.set('');
    this.duplicate.set(null);
    this.editBannerError.set(null);
    this.clearToast();

    // Shown only when the server has to go and fetch a title, which is the case
    // that can actually take seconds (F01-AC3).
    this.busyNote.set(payload.title ? '' : BUSY_FETCHING_TITLE);

    const editing = this.editing();

    try {
      const { bookmark } = await (editing
        ? this.api.updateBookmark(editing.id, { ...payload, updatedAt: editing.updatedAt })
        : this.api.createBookmark(payload));

      // F01-AC5. The save succeeded and the dialog closes, so the notice cannot
      // live in the dialog's note region - it would unmount before it was read.
      // It goes to the same polite live region as the confirmation, and replaces
      // it: telling the user the title is a fallback already implies it saved.
      const savedToast = editing ? CHANGES_SAVED_TOAST : SAVED_TOAST;
      this.showToast(bookmark.title_source === 'hostname' ? TITLE_FALLBACK_NOTICE : savedToast);

      // The new bookmark is reflected by re-fetching the current page, rather than
      // splicing it into `items` locally - the server's ordering/paging/tag-join is
      // the one place that logic lives (AD-07).
      void this.loadList();
      return true;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === 'NOT_FOUND' || apiError.code === 'EDIT_CONFLICT') {
        // F06-AC10, AC11: the row disappeared or changed elsewhere — this is not
        // a field problem, so it never lands in urlError/titleError/tagsError.
        this.editBannerError.set(apiError);
      } else if (apiError.code === 'DUPLICATE_URL') {
        this.duplicate.set(apiError);
      } else if (apiError.field === 'title') {
        this.titleError.set(apiError.message);
      } else if (apiError.field === 'tags') {
        this.tagsError.set(apiError.message);
      } else {
        this.urlError.set(apiError.message);
      }
      return false;
    } finally {
      this.busyNote.set('');
      this.submitting.set(false);
    }
  }

  /**
   * Fetches the current `page`/`size`/`tagFilter` and replaces `items`/`total`
   * on success.
   *
   * Guards against out-of-order responses (LD-04): each call is stamped with a
   * token, and a response is only applied if no later call has been issued since.
   */
  async loadList(): Promise<void> {
    const token = ++this.listRequestToken;
    this.listLoading.set(true);
    this.listError.set('');

    try {
      const response = await this.api.listBookmarks(
        this.page(),
        this.size(),
        this.tagFilter(),
        this.search() === '' ? null : this.search(),
      );
      if (token !== this.listRequestToken) {
        return;
      }
      this.items.set(response.items);
      this.total.set(response.total);
      this.page.set(response.page);
      this.size.set(response.size);
      void this.refreshTagRail();
    } catch (error) {
      if (token !== this.listRequestToken) {
        return;
      }
      // F03-AC11: one fixed message regardless of cause. `error` is deliberately
      // unused beyond this check — see `LIST_ERROR_MESSAGE`'s own comment.
      void error;
      this.listError.set(LIST_ERROR_MESSAGE);
    } finally {
      if (token === this.listRequestToken) {
        this.listLoading.set(false);
      }
    }
  }

  changePage(newPage: number): void {
    this.page.set(newPage);
    void this.loadList();
  }

  /** F03-AC4: the page resets to 1 before the API is ever called. */
  changePageSize(newSize: number): void {
    this.size.set(newSize);
    this.page.set(1);
    void this.loadList();
  }

  retryList(): void {
    void this.loadList();
  }

  /**
   * The card chip's handler — always SETS the filter, never toggles it off
   * (F04-AC2). Do not swap this with `toggleTagFilter`: a card chip must
   * never clear the filter on a repeat click, only a second click on the
   * SAME tag's rail button or chip may do that (AS-F04-01).
   */
  selectTag(name: string): void {
    this.tagFilter.set(name);
    this.page.set(1);
    void this.loadList();
  }

  /**
   * The rail button's handler — a repeat activation of the already-active tag
   * (or of `null`, the "All bookmarks" button) TOGGLES the filter off
   * (F04-AC4, AC5). Do not swap this with `selectTag`: a rail button must
   * always be able to turn its own filter back off (AS-F04-01).
   */
  toggleTagFilter(nameOrNull: string | null): void {
    this.tagFilter.set(this.tagFilter() === nameOrNull ? null : nameOrNull);
    this.page.set(1);
    void this.loadList();
  }

  /** The active-filter chip's and the tag-empty state's `Clear tag filter` control (F04-AC4, AC9). */
  clearTagFilter(): void {
    this.tagFilter.set(null);
    this.page.set(1);
    void this.loadList();
  }

  /** F05-AC9, AC10: sets the search text, resets the page to 1, and reloads. */
  setSearchText(value: string): void {
    this.search.set(value);
    this.page.set(1);
    void this.loadList();
  }

  /** The search box's clear control and the no-results state's `Clear search` button (F05-AC9). */
  clearSearch(): void {
    this.search.set('');
    this.page.set(1);
    void this.loadList();
  }

  /**
   * Reloads the tag rail and the unfiltered total (LD-03), run after every
   * successful `loadList()` so the rail never drifts from what the list
   * actually shows (F04-RK1).
   *
   * Guards against out-of-order responses the same way `loadList()` does
   * (F04-EC4). A failed fetch degrades silently, keeping the rail's last
   * known good state (§8) rather than surfacing a visible error.
   */
  async refreshTagRail(): Promise<void> {
    const token = ++this.tagRailRequestToken;
    try {
      const [tags, count] = await Promise.all([this.api.listTags(), this.api.countBookmarks()]);
      if (token !== this.tagRailRequestToken) {
        return;
      }
      this.tagRail.set(tags);
      this.allCount.set(count.total);

      // EC17: if the active filter's tag no longer has any live bookmarks, it
      // is absent from this response — fall back to "All bookmarks" rather
      // than continuing to request a tag the rail no longer lists.
      //
      // Accepted trade-off (F04-RV02): this re-enters loadList() from inside
      // the Promise.all continuation of a loadList()-triggered call, causing
      // a second full list request and a possible one-frame flash of the
      // tag-empty state before "All bookmarks" renders. AC10 is still met —
      // do not silently "optimize" this away without re-checking the
      // listRequestToken/tagRailRequestToken guards it depends on.
      const activeTag = this.tagFilter();
      if (activeTag !== null && !tags.some((t) => t.name === activeTag)) {
        this.clearTagFilter();
      }
    } catch (error) {
      if (token !== this.tagRailRequestToken) {
        return;
      }
      void error;
    }
  }

  /**
   * F07-AC3: soft-deletes `item` and shows the undo toast. The list is
   * reloaded regardless of outcome. A 404 (the row vanished between the
   * confirm click and this request, F07-AC6/F07-EC1) is handled silently,
   * with no visible error, since the list reload is the only observable
   * effect either way (lld.md section 8). Any OTHER failure (F07-RV01) is
   * NOT silently swallowed — it surfaces through the same toast path
   * `restoreBookmark()`'s failure branch already uses, so an unexpected
   * error is never indistinguishable from a quiet success (U5).
   */
  async deleteBookmark(item: BookmarkListItem): Promise<void> {
    try {
      await this.api.deleteBookmark(item.id);
      this.showToast(DELETED_TOAST, () => void this.restoreBookmark(item.id));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code !== 'NOT_FOUND') {
        this.showToast(apiError.message);
      }
    } finally {
      void this.loadList();
    }
  }

  /**
   * F07-AC4: undoes a delete within the toast window. On success the toast
   * clears immediately; on failure (the restore 409 race or a 404) the
   * toast's text is replaced with the server's own message and its Undo
   * action is removed — there is nothing left to undo (lld.md section 8).
   */
  async restoreBookmark(id: number): Promise<void> {
    try {
      await this.api.restoreBookmark(id);
      this.clearToast();
    } catch (error) {
      const apiError = toApiError(error);
      this.showToast(apiError.message);
    } finally {
      void this.loadList();
    }
  }
}
