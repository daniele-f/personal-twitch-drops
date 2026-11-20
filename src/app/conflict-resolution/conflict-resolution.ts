import { Component, ElementRef, input, output } from '@angular/core';
import { BlacklistEntry } from '../preferences/blacklist-entry';
import { ModalDialogDirective } from '../ui/modal-dialog.directive';

@Component({ selector: 'app-conflict-resolution', imports: [ModalDialogDirective], templateUrl: './conflict-resolution.html' })
export class ConflictResolutionComponent {
  readonly conflicts = input.required<readonly BlacklistEntry[]>();
  readonly keepFavoriteRequested = output<string>();
  readonly hideRequested = output<string>();
  constructor(private readonly element: ElementRef<HTMLElement>) {}
  protected keepFavorite(id: string): void { this.keepFavoriteRequested.emit(id); queueMicrotask(() => this.focusFirst()); }
  protected hide(id: string): void { this.hideRequested.emit(id); queueMicrotask(() => this.focusFirst()); }
  private buttons(): HTMLButtonElement[] { return [...this.element.nativeElement.querySelectorAll<HTMLButtonElement>('button')]; }
  private focusFirst(): void { this.buttons()[0]?.focus(); }
}
