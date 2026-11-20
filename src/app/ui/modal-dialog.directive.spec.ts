import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalDialogDirective } from './modal-dialog.directive';

@Component({ imports: [ModalDialogDirective], template: `
  @if (visible()) {
  <dialog appModalDialog [modalDismissible]="dismissible()" (modalDismissed)="dismissed.set(true)" aria-label="Test dialog">
    <button type="button">Action</button>
  </dialog>
  }`,
})
class HostComponent {
  readonly visible = signal(true);
  readonly dismissible = signal(true);
  readonly dismissed = signal(false);
}

describe('ModalDialogDirective', () => {
  afterEach(() => vi.restoreAllMocks());

  function render(dismissible = true) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.dismissible.set(dismissible);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 20, right: 200, top: 20, bottom: 200 } as DOMRect);
    return { fixture, dialog };
  }

  function pointer(dialog: HTMLDialogElement, type: string, x: number, y: number) {
    dialog.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
  }

  it('notifies its owner of native close without emitting again on teardown', () => {
    const { fixture, dialog } = render();
    dialog.dispatchEvent(new Event('close'));
    expect(fixture.componentInstance.dismissed()).toBe(true);
    fixture.componentInstance.dismissed.set(false);
    fixture.destroy();
    expect(fixture.componentInstance.dismissed()).toBe(false);
  });

  it('requires an explicit action for a data-choice dialog', () => {
    const { fixture, dialog } = render(false);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.dismissed()).toBe(false);
    const close = vi.spyOn(dialog, 'close');
    pointer(dialog, 'pointerdown', 0, 0);
    pointer(dialog, 'pointerup', 0, 0);
    expect(close).not.toHaveBeenCalled();
  });

  it('does not restore an old opener over another open dialog', () => {
    const opener = document.createElement('button');
    const stacked = document.createElement('dialog');
    document.body.append(opener);
    try {
      opener.focus();
      const { fixture, dialog } = render();
      dialog.querySelector('button')!.focus();
      stacked.open = true;
      document.body.append(stacked);
      fixture.componentInstance.visible.set(false);
      fixture.detectChanges();
      expect(document.activeElement).not.toBe(opener);
    } finally {
      opener.remove();
      stacked.remove();
    }
  });

  it('restores focus into the underlying dialog after a stacked dialog is removed', () => {
    const underlying = document.createElement('dialog');
    const opener = document.createElement('button');
    underlying.append(opener);
    underlying.open = true;
    document.body.append(underlying);
    try {
      opener.focus();
      const { fixture, dialog } = render();
      dialog.querySelector('button')!.focus();
      fixture.componentInstance.visible.set(false);
      fixture.detectChanges();
      expect(document.activeElement).toBe(opener);
    } finally {
      underlying.remove();
    }
  });

  it('supports backdrop dismissal when closedby is unavailable', () => {
    const { dialog } = render();
    const close = vi.spyOn(dialog, 'close');
    pointer(dialog, 'pointerdown', 0, 0);
    pointer(dialog, 'pointerup', 0, 0);
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not dismiss on padding clicks, cancelled gestures, or a drag from inside', () => {
    const { dialog } = render();
    const close = vi.spyOn(dialog, 'close');
    pointer(dialog, 'pointerdown', 30, 30);
    pointer(dialog, 'pointerup', 30, 30);
    pointer(dialog, 'pointerdown', 30, 30);
    pointer(dialog, 'pointerup', 0, 0);
    pointer(dialog, 'pointerdown', 0, 0);
    dialog.dispatchEvent(new Event('pointercancel'));
    pointer(dialog, 'pointerup', 0, 0);
    expect(close).not.toHaveBeenCalled();
  });
});
