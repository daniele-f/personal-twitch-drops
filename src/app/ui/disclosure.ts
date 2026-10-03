import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CollapseChevronComponent } from './collapse-chevron';

@Component({ selector: 'app-disclosure', imports: [CollapseChevronComponent], templateUrl: './disclosure.html', styleUrl: './disclosure.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class DisclosureComponent {
  readonly expanded = input(false);
  readonly icon = input<string>();
  readonly starIcon = input(false);
  readonly count = input<number>();
  readonly toggled = output<void>();
}
