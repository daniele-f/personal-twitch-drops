import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-refresh-loader',
  templateUrl: './refresh-loader.html',
  styleUrl: './refresh-loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefreshLoaderComponent {
  readonly spinning = input(false);
}
