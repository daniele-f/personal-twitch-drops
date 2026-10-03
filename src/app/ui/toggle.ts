import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({ selector: 'app-toggle', host: { class: 'toggle-control' }, templateUrl: './toggle.html', styleUrl: './toggle.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ToggleComponent {
  readonly checked = input(false);
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly ariaLabel = input<string>();
  readonly tooltip = input<string>();
  readonly checkedChange = output<boolean>();
  protected change(checked: boolean): void { this.checkedChange.emit(checked); }
}
