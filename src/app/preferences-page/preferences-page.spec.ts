import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { PreferencesPageComponent } from './preferences-page';

describe('PreferencesPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }],
    }).compileComponents();
  });

  it('expands the blacklist table and removes an entry', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.blacklist-disclosure')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ignored on');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-blacklist-id="/game/sea-of-thieves"] .remove-blacklist')?.click();
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-blacklist-id="/game/sea-of-thieves"] .remove-blacklist')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No games are ignored.');
  });

  it('renders a Home route link before the Preferences title', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const home = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.home-link');
    expect(home?.textContent?.trim()).toBe('⌂ Home');
    expect(home?.getAttribute('href')).toBe('/');
  });
});
