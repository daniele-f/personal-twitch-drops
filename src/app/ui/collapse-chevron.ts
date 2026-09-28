import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-collapse-chevron',
  templateUrl: './collapse-chevron.html',
  styleUrl: './collapse-chevron.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapseChevronComponent {
  readonly expanded = input(false);
}
