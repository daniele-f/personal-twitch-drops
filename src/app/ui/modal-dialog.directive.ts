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
  protected pressedOutside = false;

  ngAfterViewInit(): void { this.dialog.showModal(); }

  ngOnDestroy(): void {
    this.destroying = true;
    // Close before Angular removes the element so the browser restores focus.
    if (this.dialog.open) this.dialog.close();
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
