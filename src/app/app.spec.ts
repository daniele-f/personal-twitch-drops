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

  it('toggles the developer menu from a header button before Preferences', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const header = fixture.nativeElement as HTMLElement;
    const button = header.querySelector<HTMLButtonElement>('.debug-button');
    expect(button?.nextElementSibling?.classList).toContain('preferences-link');
    expect(button?.getAttribute('aria-expanded')).toBe('false');

    button?.click();
    fixture.detectChanges();
    expect(header.querySelector('.debug-menu')).toBeTruthy();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(button?.classList).toContain('debug-button--active');

    button?.click();
    fixture.detectChanges();
    expect(header.querySelector('.debug-menu')).toBeNull();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });

  it('groups debug actions in collapsed Changes and Storage sections', () => {
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const groups = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details');
    expect([...groups].map((group) => group.querySelector('summary')?.textContent?.trim())).toEqual(['Changes', 'Storage']);
    expect([...groups].every((group) => !group.open)).toBe(true);
    groups[0].querySelector('summary')?.click();
    expect(groups[0].open).toBe(true);
    expect(groups[1].open).toBe(false);
  });

  it('shows current saved preferences from the Storage menu action', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const storageGroup = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details')[1];
    storageGroup.querySelector('summary')?.click();
    storageGroup.querySelector('button')?.click();
    fixture.detectChanges();

    expect(storageGroup.querySelector('pre')?.textContent).toContain('/game/sea-of-thieves');
    expect(storageGroup.querySelector('pre')?.textContent).toContain('VALORANT');
  });

  it('shows the saved favorites and ignored games through the developer storage command', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    TestBed.createComponent(App);

    const debug = (window as unknown as { twitchDropsDebug: { storage: { show(): unknown } } }).twitchDropsDebug;
    expect(debug.storage.show()).toMatchObject({
      available: true,
      favoriteIds: ['/game/sea-of-thieves'],
      favoriteNames: { '/game/sea-of-thieves': 'Sea of Thieves' },
      blacklistEntries: [{ id: '/game/valorant', gameName: 'VALORANT' }],
    });
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
