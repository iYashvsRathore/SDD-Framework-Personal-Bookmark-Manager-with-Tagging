import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BookmarkForm } from './bookmark-form';
import { BookmarksStore } from '../../state/bookmarks.store';
import { MESSAGES } from '../../core/validate-url';

/**
 * F01-AC7, AC8, AC10, AC17 for the dialog. jsdom implements <dialog>, so open and
 * close behaviour is exercised for real rather than stubbed.
 */
describe('BookmarkForm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BookmarkForm>>;
  let host: HTMLElement;
  let component: BookmarkForm;
  let submissions: unknown[];

  function dialog(): HTMLDialogElement {
    return host.querySelector('dialog')!;
  }

  function urlInput(): HTMLInputElement {
    return host.querySelector('#u')!;
  }

  function titleInput(): HTMLInputElement {
    return host.querySelector('#t')!;
  }

  function submit(): void {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  function typeUrl(value: string): void {
    const input = urlInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookmarkForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BookmarkForm);
    component = fixture.componentInstance;
    host = fixture.nativeElement as HTMLElement;
    submissions = [];
    component.submitted.subscribe((payload) => submissions.push(payload));
    fixture.detectChanges();
  });

  describe('F01-AC17 — labels and structure', () => {
    it('gives every input a label bound with for', () => {
      for (const id of ['u', 't']) {
        const label = host.querySelector(`label[for="${id}"]`);
        expect(label, `missing label for #${id}`).not.toBeNull();
        expect(host.querySelector(`#${id}`)).not.toBeNull();
      }
    });

    it('points each input at its own live message region', () => {
      expect(urlInput().getAttribute('aria-describedby')).toBe('ue');
      expect(titleInput().getAttribute('aria-describedby')).toBe('tn');
      expect(host.querySelector('#ue')!.getAttribute('aria-live')).toBe('polite');
      expect(host.querySelector('#tn')!.getAttribute('aria-live')).toBe('polite');
    });

    it('caps the Title field at 140 characters in the markup too', () => {
      expect(titleInput().getAttribute('maxlength')).toBe('140');
    });

    it('opens as a modal and closes again', () => {
      expect(dialog().open).toBe(false);

      component.open();
      expect(dialog().open).toBe(true);

      component.close();
      expect(dialog().open).toBe(false);
    });

    it('returns focus to the opener when closed', () => {
      const opener = document.createElement('button');
      document.body.append(opener);

      component.open(opener);
      component.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it('moves focus into the dialog when opened', () => {
      component.open();
      expect(document.activeElement).toBe(urlInput());
    });
  });

  describe('F01-AC7 — an empty address', () => {
    it.each([
      ['empty', ''],
      ['whitespace only', '   '],
    ])('%s shows the exact message, marks the field and does not submit', (_label, value) => {
      component.open();
      typeUrl(value);

      submit();

      expect(host.querySelector('#ue')!.textContent!.trim()).toBe(MESSAGES.EMPTY);
      expect(urlInput().getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(urlInput());
      expect(submissions).toHaveLength(0);
    });
  });

  describe('F01-AC8 — not a web address', () => {
    it.each([
      ['example.com', 'example.com'],
      ['no dot in host', 'http://localhost:3000'],
      ['intranet name', 'http://intranet'],
      ['scheme-relative', '//example.com/x'],
      ['javascript:', 'javascript:alert(1)'],
      ['file:', 'file:///etc/passwd'],
      ['ftp:', 'ftp://example.com/x'],
    ])('%s is refused with the exact message', (_label, value) => {
      component.open();
      typeUrl(value);

      submit();

      expect(host.querySelector('#ue')!.textContent!.trim()).toBe(MESSAGES.NOT_A_WEB_ADDRESS);
      expect(submissions).toHaveLength(0);
    });
  });

  describe('F01-AC10 — the length boundary', () => {
    const longPath = (n: number) => `https://example.com/${'a'.repeat(n - 20)}`;

    it('refuses 2,049 characters with the exact message', () => {
      component.open();
      typeUrl(longPath(2049));

      submit();

      expect(host.querySelector('#ue')!.textContent!.trim()).toBe(MESSAGES.TOO_LONG);
      expect(submissions).toHaveLength(0);
    });

    it('accepts exactly 2,048 characters', () => {
      const url = longPath(2048);
      expect(url).toHaveLength(2048);

      component.open();
      typeUrl(url);
      submit();

      expect(submissions).toHaveLength(1);
    });
  });

  describe('F01-AC11 — the duplicate banner', () => {
    const DUP = {
      code: 'DUPLICATE_URL' as const,
      message: 'You already saved this address.',
      field: 'url',
      existingId: 7,
      details: { title: 'First save', url: 'https://example.com/a' },
    };

    function showBanner(details = DUP.details): HTMLElement {
      TestBed.inject(BookmarksStore).duplicate.set({ ...DUP, details });
      fixture.detectChanges();
      return host.querySelector('.banner')!;
    }

    it('is absent until a duplicate is reported', () => {
      component.open();
      expect(host.querySelector('.banner')).toBeNull();
    });

    it('announces as an alert with the heading F01-AC11 fixes', () => {
      component.open();
      const banner = showBanner();

      expect(banner).not.toBeNull();
      expect(banner.getAttribute('role')).toBe('alert');
      expect(banner.querySelector('strong')!.textContent!.trim()).toBe(
        'You already saved this link',
      );
    });

    it('shows the existing title and URL and offers both actions', () => {
      component.open();
      const banner = showBanner();

      expect(banner.querySelector('.dup-title')!.textContent!.trim()).toBe('First save');
      expect(banner.querySelector('.dup-url')!.textContent!.trim()).toBe('https://example.com/a');

      const labels = [...banner.querySelectorAll('button')].map((b) => b.textContent!.trim());
      expect(labels).toEqual(['View existing', 'Edit existing']);
    });

    it('emits the existing id from each action', () => {
      const seen: string[] = [];
      component.viewExisting.subscribe((id) => seen.push(`view:${id}`));
      component.editExisting.subscribe((id) => seen.push(`edit:${id}`));

      component.open();
      const banner = showBanner();
      for (const button of banner.querySelectorAll('button')) {
        (button as HTMLButtonElement).click();
      }

      expect(seen).toEqual(['view:7', 'edit:7']);
    });

    it('does not steal focus from the address the user typed', () => {
      component.open();
      expect(document.activeElement).toBe(urlInput());

      showBanner();

      expect(document.activeElement).toBe(urlInput());
    });

    it('renders a title containing markup as literal text (F01-AC16)', () => {
      component.open();
      const banner = showBanner({
        title: '<script>alert(1)</script>',
        url: 'https://example.com/a',
      });

      expect(banner.querySelector('script')).toBeNull();
      expect(banner.querySelector('.dup-title')!.textContent!.trim()).toBe(
        '<script>alert(1)</script>',
      );
    });

    it('clears when the dialog is reopened', () => {
      component.open();
      showBanner();
      component.close();
      component.open();
      fixture.detectChanges();

      expect(host.querySelector('.banner')).toBeNull();
    });
  });

  describe('a valid submission', () => {
    it('emits the trimmed url and omits an empty title', () => {
      component.open();
      typeUrl('  https://example.com/x  ');

      submit();

      expect(submissions).toEqual([{ url: 'https://example.com/x' }]);
    });

    it('includes a supplied title', () => {
      component.open();
      typeUrl('https://example.com/x');
      titleInput().value = '  My own words  ';
      titleInput().dispatchEvent(new Event('input'));
      fixture.detectChanges();

      submit();

      expect(submissions).toEqual([{ url: 'https://example.com/x', title: 'My own words' }]);
    });

    it('includes the store tags when at least one chip is present (F02-AC1, AC10)', () => {
      component.open();
      typeUrl('https://example.com/x');
      const store = TestBed.inject(BookmarksStore);
      store.addTagChip('research');
      store.addTagChip('docs');

      submit();

      expect(submissions).toEqual([{ url: 'https://example.com/x', tags: ['research', 'docs'] }]);
    });

    it('omits the tags key entirely when no chips are present (F02-AC10)', () => {
      component.open();
      typeUrl('https://example.com/x');

      submit();

      expect(submissions).toEqual([{ url: 'https://example.com/x' }]);
    });

    it('commits text still sitting uncommitted in the tag input on submit (F02-RV01)', () => {
      component.open();
      typeUrl('https://example.com/x');
      const tagInput = host.querySelector<HTMLInputElement>('#tg')!;
      tagInput.value = 'research';
      tagInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      submit();

      expect(submissions).toEqual([{ url: 'https://example.com/x', tags: ['research'] }]);
    });

    it('clears the previous error once the address is corrected', () => {
      component.open();
      typeUrl('nonsense');
      submit();
      expect(urlInput().getAttribute('aria-invalid')).toBe('true');

      typeUrl('https://example.com/x');
      submit();

      expect(urlInput().getAttribute('aria-invalid')).toBeNull();
      expect(host.querySelector('#ue')!.textContent!.trim()).toBe('');
    });
  });

  describe('F06 — edit mode', () => {
    const EXISTING = {
      id: 7,
      url: 'https://example.com/original',
      title: 'Original title',
      title_source: 'user' as const,
      created_at: '2025-01-15T10:30:00.000Z',
      updated_at: '2025-01-15T10:30:00.000Z',
      tags: ['design'],
    };

    it('openEdit() shows "Edit bookmark" / "Save changes" instead of the add labels', () => {
      component.openEdit(EXISTING);
      fixture.detectChanges();

      expect(host.querySelector('#fd-t')!.textContent!.trim()).toBe('Edit bookmark');
      expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe('Save changes');
    });

    it('open() (the add flow) keeps the original labels', () => {
      component.open();
      fixture.detectChanges();

      expect(host.querySelector('#fd-t')!.textContent!.trim()).toBe('Add bookmark');
      expect(host.querySelector('button[type="submit"]')!.textContent!.trim()).toBe(
        'Save bookmark',
      );
    });

    it('pre-fills the fields from the given bookmark', () => {
      component.openEdit(EXISTING);
      fixture.detectChanges();

      expect(urlInput().value).toBe(EXISTING.url);
      expect(titleInput().value).toBe('Original title');
    });

    it("Esc returns focus to openEdit()'s own opener", () => {
      const opener = document.createElement('button');
      document.body.append(opener);

      component.openEdit(EXISTING, opener);
      component.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it('renders the NOT_FOUND banner with no action control (F06-AC10)', () => {
      component.openEdit(EXISTING);
      TestBed.inject(BookmarksStore).editBannerError.set({
        code: 'NOT_FOUND',
        message: 'That bookmark is no longer here.',
      });
      fixture.detectChanges();

      const banner = host.querySelector('.banner')!;
      expect(banner.getAttribute('role')).toBe('alert');
      expect(banner.textContent).toContain('That bookmark is no longer here.');
      expect(banner.querySelector('button')).toBeNull();
    });

    it("the EDIT_CONFLICT banner's Reload button calls retryList() and closes the dialog (F06-AC11)", () => {
      component.openEdit(EXISTING);
      const store = TestBed.inject(BookmarksStore);
      let retried = false;
      store.retryList = () => {
        retried = true;
      };
      store.editBannerError.set({
        code: 'EDIT_CONFLICT',
        message: 'This bookmark changed in another tab. Reload to see the latest, then try again.',
      });
      fixture.detectChanges();

      const reloadButton = host.querySelector('.banner button') as HTMLButtonElement;
      expect(reloadButton.textContent!.trim()).toBe('Reload');
      reloadButton.click();
      fixture.detectChanges();

      expect(retried).toBe(true);
      expect(dialog().open).toBe(false);
    });
  });
});
