import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from './drops/drops-provider';
import { routes } from './app.routes';
import { PREFERENCES_STORAGE } from './preferences/preferences-storage';
import { PreferencesService } from './preferences/preferences.service';
import { App } from './app';
import { ChangesStateService } from './changes/changes-state.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } }] }).compileComponents();
  });

  it('renders Preferences as a button-styled route link', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.preferences-link');
    expect(link?.classList).toContain('app-button');
    expect(link?.getAttribute('href')).toContain('/preferences');
  });

  it('does not render a placeholder Changes control', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No Changes');
  });

  it('shows Changes only after a real comparison is available', () => {
    const changes = TestBed.inject(ChangesStateService);
    changes.updateDrops([]);
    changes.updateDrops([{ id: '/game/arc-raiders', gameName: 'Arc Raiders', rewardCount: 1, rewards: ['Raider pack'], endsAt: '2026-09-24T00:00:00.000Z' }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Changes · 1');
  });

  it('marks the Changes control active while its panel is open', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button');

    button?.click();
    fixture.detectChanges();

    expect(button?.classList).toContain('changes-button--active');
  });

  it('does not show the developer menu until it is opened', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.debug-menu')).toBeNull();
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.debug-menu')).toBeTruthy();
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
