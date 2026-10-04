import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TagRail } from './tag-rail';
import { BookmarksStore } from '../../state/bookmarks.store';
import type { TagWithCount } from '../../core/models';

const TAGS: readonly TagWithCount[] = [
  { id: 1, name: 'reading', bookmark_count: 2 },
  { id: 2, name: 'work', bookmark_count: 5 },
];

describe('TagRail', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TagRail>>;
  let host: HTMLElement;
  let store: BookmarksStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagRail],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(TagRail);
    host = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(BookmarksStore);
    fixture.detectChanges();
  });

  describe('F04-AC1 — rendering the rail', () => {
    it('renders "All bookmarks" first, then one button per tag in rail order with its count', () => {
      store.tagRail.set(TAGS);
      store.allCount.set(7);
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('nav#tags button'));
      expect(buttons.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'All bookmarks 7',
        'reading 2',
        'work 5',
      ]);
    });

    it('has an accessible nav label', () => {
      expect(host.querySelector('nav#tags')?.getAttribute('aria-label')).toBe('Filter by tag');
    });
  });

  describe('F04-AC10, AC11 — aria-pressed state', () => {
    it('marks "All bookmarks" pressed when no tag filter is active', () => {
      store.tagRail.set(TAGS);
      store.tagFilter.set(null);
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('nav#tags button'));
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('false');
    });

    it('marks the active tag button pressed instead', () => {
      store.tagRail.set(TAGS);
      store.tagFilter.set('work');
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('nav#tags button'));
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('F04-AC4, AC5 — activation calls toggleTagFilter', () => {
    it('clicking a tag button toggles the store filter to that tag', () => {
      store.tagRail.set(TAGS);
      store.tagFilter.set(null);
      fixture.detectChanges();

      const workButton = Array.from(host.querySelectorAll('nav#tags button')).find((b) =>
        b.textContent?.includes('work'),
      );
      workButton!.dispatchEvent(new Event('click'));

      expect(store.tagFilter()).toBe('work');
    });

    it('clicking the active tag button again clears the filter', () => {
      store.tagRail.set(TAGS);
      store.tagFilter.set('work');
      fixture.detectChanges();

      const workButton = Array.from(host.querySelectorAll('nav#tags button')).find((b) =>
        b.textContent?.includes('work'),
      );
      workButton!.dispatchEvent(new Event('click'));

      expect(store.tagFilter()).toBeNull();
    });

    it('clicking "All bookmarks" clears an active tag filter', () => {
      store.tagRail.set(TAGS);
      store.tagFilter.set('reading');
      fixture.detectChanges();

      const allButton = host.querySelector('nav#tags button')!;
      allButton.dispatchEvent(new Event('click'));

      expect(store.tagFilter()).toBeNull();
    });
  });

  describe('F04-EC2 — no bookmarks saved at all', () => {
    it('shows only "All bookmarks" with a count of 0', () => {
      store.tagRail.set([]);
      store.allCount.set(0);
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('nav#tags button'));
      expect(buttons).toHaveLength(1);
      expect(buttons[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('All bookmarks 0');
    });
  });
});
