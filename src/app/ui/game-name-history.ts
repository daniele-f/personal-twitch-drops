import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

let nextPanelId = 0;

@Component({
  selector: 'app-game-name-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (oldNames().length) {
      <button type="button"
        [attr.aria-label]="'Previous names for ' + gameName()"
        [attr.popovertarget]="panelId"
        [attr.aria-controls]="supportsPopover ? null : panelId"
        [attr.aria-expanded]="supportsPopover ? null : fallbackOpen()"
        (click)="toggleFallback()"
        (keydown.escape)="fallbackOpen.set(false)"
      >*</button>
      <div [id]="panelId" popover="auto" [hidden]="!supportsPopover && !fallbackOpen()">
        <strong>Previous names</strong>
        <ul>
          @for (name of oldNames(); track name) { <li>{{ name }}</li> }
        </ul>
        <code>{{ gameId() }}</code>
      </div>
    }
  `,
  styles: `
    button {
      min-width: 24px;
      min-height: 24px;
      border: 0;
      border-radius: .25rem;
      padding: 0;
      background: transparent;
      color: var(--color-accent-text);
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }
    button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
    [popover] {
      position: fixed;
      inset: 0;
      margin: auto;
      width: max-content;
      height: max-content;
      max-width: calc(100vw - 2rem);
      max-height: min(18rem, calc(100vh - 2rem));
      box-sizing: border-box;
      overflow: auto;
      overflow-wrap: anywhere;
      border: 1px solid #746b82;
      border-radius: .55rem;
      padding: .65rem .8rem;
      background: #25232a;
      color: #fff;
      font-size: .85rem;
      box-shadow: 0 .3rem 1.2rem #0008;
      z-index: 2;
    }
    @supports (position-area: block-end span-inline-end) {
      [popover]:popover-open {
        margin: .25rem 0;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
      }
    }
    ul { margin: .35rem 0; padding-inline-start: 1.1rem; }
    code { color: #cfc8dc; }
  `,
})
export class GameNameHistoryComponent {
  readonly gameId = input.required<string>();
  readonly gameName = input.required<string>();
  readonly oldNames = input.required<readonly string[]>();
  protected readonly panelId = `game-name-history-${++nextPanelId}`;
  protected readonly supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  protected readonly fallbackOpen = signal(false);

  protected toggleFallback(): void {
    if (!this.supportsPopover) this.fallbackOpen.update((open) => !open);
  }
}
