import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from './drops/drops-provider';
import { PREFERENCES_STORAGE } from './preferences/preferences-storage';
import { PreferencesService } from './preferences/preferences.service';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } }] }).compileComponents();
  });

  it('shows every favorite-blacklist conflict and removes them one at a time', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves');
    preferences.addFavorite('/game/valorant');
    preferences.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.conflict-row')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Active Drops');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-conflict-id="/game/sea-of-thieves"] .keep-favorite')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.conflict-row')).toHaveLength(1);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-conflict-id="/game/valorant"] .hide-game')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.conflict-row')).toBeNull();
  });
});
