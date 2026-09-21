import { AfterViewInit, Component, ElementRef, HostListener, input, output } from '@angular/core';
import { BlacklistEntry } from '../preferences/blacklist-entry';

@Component({ selector: 'app-conflict-resolution', templateUrl: './conflict-resolution.html', styleUrl: './conflict-resolution.scss' })
export class ConflictResolutionComponent implements AfterViewInit {
  readonly conflicts = input.required<readonly BlacklistEntry[]>();
  readonly keepFavoriteRequested = output<string>();
  readonly hideRequested = output<string>();
  constructor(private readonly element: ElementRef<HTMLElement>) {}
  ngAfterViewInit(): void { this.focusFirst(); }
  @HostListener('keydown', ['$event'])
  protected trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = this.buttons();
    if (!buttons.length) return;
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  protected keepFavorite(id: string): void { this.keepFavoriteRequested.emit(id); queueMicrotask(() => this.focusFirst()); }
  protected hide(id: string): void { this.hideRequested.emit(id); queueMicrotask(() => this.focusFirst()); }
  private buttons(): HTMLButtonElement[] { return [...this.element.nativeElement.querySelectorAll<HTMLButtonElement>('button')]; }
  private focusFirst(): void { this.buttons()[0]?.focus(); }
}
