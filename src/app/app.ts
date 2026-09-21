import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DropListComponent } from './drop-list/drop-list';
import { SHELL_SECTIONS } from './shell-data';

@Component({
  imports: [DropListComponent, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly sections = SHELL_SECTIONS;
}
