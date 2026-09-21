import { Component, inject, signal } from '@angular/core';
import { PreferencesService } from '../preferences/preferences.service';

@Component({ selector: 'app-preferences-page', templateUrl: './preferences-page.html', styleUrl: './preferences-page.scss' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly expanded = signal(false);
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
}
