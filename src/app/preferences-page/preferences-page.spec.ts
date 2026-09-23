import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { ImportExportService } from '../preferences/import-export.service';
import { PreferencesPageComponent } from './preferences-page';

describe('PreferencesPageComponent', () => {
  let dropsResponse: Subject<readonly ActiveDrop[]>;
  beforeEach(async () => {
    localStorage.clear();
    dropsResponse = new Subject<readonly ActiveDrop[]>();
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => dropsResponse } }],
    }).compileComponents();
  });

  it('hides the ignored date and changes the remove button to Confirm? before removing an entry', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.blacklist-disclosure')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Ignored on');
    const remove = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-blacklist-id="/game/sea-of-thieves"] .remove-blacklist');
    remove?.click();
    fixture.detectChanges();
    expect(remove?.textContent?.trim()).toBe('Confirm?');
    expect(fixture.nativeElement.textContent).not.toContain('Press again to remove from Ignore List');
    remove?.click();
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

  it('anchors the animated chevron strokes inside their icon wrapper', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const chevron = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.disclosure-chevron');
    expect(getComputedStyle(chevron!).position).toBe('relative');
    expect(getComputedStyle(chevron!.querySelector<HTMLElement>('i:first-child')!).left).toBe('0px');
    expect(getComputedStyle(chevron!.querySelector<HTMLElement>('i:last-child')!).right).toBe('0px');
  });

  it('lists active and inactive favorites above the ignore list', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves","/game/valorant"]');
    localStorage.setItem('personal-twitch-drops.favorite-names.v1', '{"/game/sea-of-thieves":"Sea of Thieves","/game/valorant":"VALORANT"}');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('main section');
    expect(sections[0].textContent).toContain('Favorites (2)');
    expect(sections[1].textContent).toContain('Ignore List');
    sections[0].querySelector('button')?.click();
    fixture.detectChanges();
    expect(sections[0].querySelector('[data-favorite-id="/game/sea-of-thieves"]')?.textContent).toContain('Active');
    expect(sections[0].querySelector('[data-favorite-id="/game/valorant"]')?.textContent).toContain('Inactive');
  });

  it('keeps a legacy inactive favorite readable and removable', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves"]');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.next([]);
    fixture.detectChanges();

    const favorites = (fixture.nativeElement as HTMLElement).querySelector('main section');
    favorites?.querySelector('button')?.click();
    fixture.detectChanges();
    const row = favorites?.querySelector('[data-favorite-id="/game/sea-of-thieves"]');
    expect(row?.textContent?.toLowerCase()).toContain('sea of thieves');
    expect(row?.textContent).toContain('Inactive');
    const remove = row?.querySelector<HTMLButtonElement>('.remove-favorite');
    remove?.click();
    fixture.detectChanges();
    expect(remove?.textContent?.trim()).toBe('Confirm?');
    expect(favorites?.textContent).not.toContain('Press again to remove from Favorites');
    remove?.click();
    fixture.detectChanges();
    expect(favorites?.textContent).toContain('No favorite games yet.');
    expect(localStorage.getItem(FAVORITE_IDS_STORAGE_KEY)).toBeNull();
  });

  it('does not label favorites inactive when the drops feed fails', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves"]');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.error(new Error('Feed unavailable'));
    fixture.detectChanges();

    const favorites = (fixture.nativeElement as HTMLElement).querySelector('main section');
    favorites?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(favorites?.querySelector('[data-favorite-id="/game/sea-of-thieves"]')?.textContent).toContain('Status unavailable');
  });

  it('replaces both lists when an opaque share code is imported', () => {
    const preferences = TestBed.inject(PreferencesService);
    const importExport = TestBed.inject(ImportExportService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const shareCode = importExport.export();
    preferences.removeFavorite('/game/sea-of-thieves');
    preferences.removeBlacklist('/game/valorant');
    preferences.addFavorite('/game/old-game', 'Old Game');

    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.import-code');
    input!.value = shareCode;
    input!.dispatchEvent(new Event('input'));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.import-button')?.click();
    fixture.detectChanges();

    expect([...preferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(preferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/valorant']);
  });

  it('shows a generated share code outside a text field with a copy button', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.export-button')?.click();
    fixture.detectChanges();

    const code = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.share-code');
    expect(code?.tagName).not.toBe('TEXTAREA');
    expect(code?.textContent?.trim()).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.copy-share-code')?.textContent?.trim()).toBe('Copy to clipboard');
  });
});
