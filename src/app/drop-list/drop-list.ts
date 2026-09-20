import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DropListSection } from '../shell-data';

@Component({
  selector: 'app-drop-list',
  templateUrl: './drop-list.html',
  styleUrl: './drop-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropListComponent {
  readonly sections = input.required<readonly DropListSection[]>();
}
