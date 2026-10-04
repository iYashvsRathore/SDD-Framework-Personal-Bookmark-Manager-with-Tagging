import { Component, inject } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';
import { ICON_PATHS } from '../../core/icons';
import { tagHue } from '../../core/tag-hue';

/**
 * The tag rail (F04-AC1, AC10, AC11): an "All bookmarks" button plus one
 * button per live tag from `store.tagRail()`. Injects `BookmarksStore`
 * directly, matching `BookmarkForm`/`BookmarkList`'s established pattern
 * (lld.md section 3, LD-05).
 */
@Component({
  selector: 'app-tag-rail',
  templateUrl: './tag-rail.html',
})
export class TagRail {
  protected readonly store = inject(BookmarksStore);
  protected readonly icons = ICON_PATHS;
  protected readonly tagHue = tagHue;

  protected onTagClick(nameOrNull: string | null): void {
    this.store.toggleTagFilter(nameOrNull);
  }
}
