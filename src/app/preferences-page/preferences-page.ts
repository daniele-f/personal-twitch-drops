import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PreferencesService } from '../preferences/preferences.service';

@Component({ imports: [RouterLink], selector: 'app-preferences-page', templateUrl: './preferences-page.html', styleUrl: './preferences-page.scss' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
}
