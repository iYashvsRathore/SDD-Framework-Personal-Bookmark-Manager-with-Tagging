/**
 * Test environment setup.
 *
 * jsdom does not implement the native `<dialog>` modal methods. Without a shim,
 * `showModal()` throws and the dialog tests fail for a reason that has nothing to
 * do with the application.
 *
 * IMPORTANT, so nobody over-reads these tests: this shim reproduces the OPEN/CLOSE
 * state and the `close` event only. It does NOT reproduce the modal focus trap or
 * page inertness. Those are real browser behaviours that F01 relies on
 * (F01-AC17), and they are verified by the human keyboard walkthrough recorded in
 * tasks.md, not by these unit tests.
 */
const proto = globalThis.HTMLDialogElement?.prototype as
  (HTMLDialogElement & { showModal?: () => void }) | undefined;

if (proto && typeof proto.showModal !== 'function') {
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };

  proto.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };

  proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return;
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}

/**
 * jsdom implements neither `matchMedia` nor `Element.scrollIntoView` (F01-AC11/
 * F03's "View existing" uses both to flash the existing row — bookmark-list.ts).
 * Stubbed the same way as the dialog shim above: just enough to not throw. Only
 * `matches`/`media` are read by application code, so the listener methods a real
 * `MediaQueryList` has are deliberately omitted rather than stubbed empty.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = function matchMedia(query: string): MediaQueryList {
    return { matches: false, media: query } as unknown as MediaQueryList;
  };
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    return undefined;
  };
}
