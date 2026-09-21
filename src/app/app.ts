import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActiveDrop } from './drops/active-drop';
import { DropListComponent } from './drop-list/drop-list';

@Component({
  imports: [DropListComponent, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly drops: readonly ActiveDrop[] = [];
  protected readonly loading = false;
}
