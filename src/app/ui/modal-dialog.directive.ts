import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input, output } from '@angular/core';

@Directive({
  selector: 'dialog[appModalDialog]',
  host: {
    '[attr.closedby]': 'modalDismissible() ? "any" : "none"',
    '(cancel)': 'cancel($event)',
    '(close)': 'onClose()',
    '(pointerdown)': 'pointerDown($event)',
    '(pointerup)': 'pointerUp($event)',
    '(pointercancel)': 'pressedOutside = false',
  },
})
export class ModalDialogDirective implements AfterViewInit, OnDestroy {
  readonly modalDismissible = input(true);
  readonly modalDismissed = output<void>();
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private destroying = false;
  private opener: HTMLElement | null = null;
  protected pressedOutside = false;

  ngAfterViewInit(): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog.showModal();
  }

  ngOnDestroy(): void {
    this.destroying = true;
    if (this.dialog.open) this.dialog.close();
    // Angular removes @if views before destruction hooks, so native focus
    // restoration may already be lost. Never take focus from a stacked dialog
    // or another control the user/owner has deliberately focused.
    if (document.activeElement === document.body && this.opener?.isConnected
      && [...document.querySelectorAll('dialog[open]')].every((dialog) => dialog.contains(this.opener))) this.opener.focus();
  }

  protected cancel(event: Event): void {
    event.preventDefault();
    if (this.modalDismissible()) this.modalDismissed.emit();
  }

  protected onClose(): void {
    if (!this.destroying) this.modalDismissed.emit();
  }

  protected pointerDown(event: PointerEvent): void {
    this.pressedOutside = this.outside(event);
  }

  protected pointerUp(event: PointerEvent): void {
    // Safari lacks closedby. Require both ends of the gesture outside so a
    // selection drag starting inside the dialog doesn't dismiss it.
    if (!('closedBy' in HTMLDialogElement.prototype) && this.modalDismissible()
      && this.pressedOutside && this.outside(event)) this.dialog.close();
    this.pressedOutside = false;
  }

  private outside(event: PointerEvent): boolean {
    if (event.target !== this.dialog) return false;
    const bounds = this.dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
}
