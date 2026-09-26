import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { DropsPageComponent } from './drops-page';

class TestDropsProvider extends DropsProvider {
  readonly requests: Subject<readonly ActiveDrop[]>[] = [];
  loadActiveDrops(): Subject<readonly ActiveDrop[]> { const request = new Subject<readonly ActiveDrop[]>(); this.requests.push(request); return request; }
  loadDropDetails() { return of({ requirementByReward: {}, badgeRewardNames: [] }); }
}

describe('DropsPageComponent', () => {
  it('announces an indeterminate source fetch while Drops are loading', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();

    const progress = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="progressbar"]');
    expect(progress?.getAttribute('aria-label')).toBe('Fetching current Drops from TwitchDrops.app');
    expect(progress?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('confirms the loaded Drop count after a successful fetch', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const status = (fixture.nativeElement as HTMLElement).querySelector('.load-status');
    expect(status?.textContent).toMatch(/^✓ Loaded 1 active Drop at /);
  });

  it('keeps the completion confirmation beside Refresh without a duplicate count', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const refreshStatus = (fixture.nativeElement as HTMLElement).querySelector('.refresh-status');
    expect(refreshStatus?.textContent ?? '').toMatch(/✓ Loaded 1 active Drop at /);
    expect((fixture.nativeElement as HTMLElement).querySelector('.page-heading > p')).toBeNull();
  });

  it('keeps the Favorites manager beside Active Drops when no games are favorited', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const activeHeading = (fixture.nativeElement as HTMLElement).querySelector('.active-section .section-heading');
    const manageLink = activeHeading?.querySelector<HTMLAnchorElement>('.favorites-manage');
    expect(activeHeading?.textContent).toContain('Active Drops');
    expect(manageLink?.textContent?.trim()).toBe('Manage');
    expect(manageLink?.getAttribute('href')).toBe('/preferences#favorites');
  });

  it('shows the Favorites manager only once when favorite games exist', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.favorites-manage')).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('.active-section .favorites-manage')).toBeNull();
  });

  it('hides blacklisted active drops', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }, { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
    expect(fixture.nativeElement.textContent).not.toContain('VALORANT');
  });

  it('shows a matching ignored game in search results with its hidden state', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }, { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'valor';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const ignoredRow = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/valorant"]');
    expect(ignoredRow?.textContent).toContain('VALORANT');
    expect(ignoredRow?.textContent).toContain('Ignored');

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Clear search"]')!.click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/valorant"]')).toBeNull();
  });

  it('filters favorite and active games by a case-insensitive search term', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([
      { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' },
      { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' },
    ]);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).toBeTruthy();
    search!.value = 'sea';
    search!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
    expect(fixture.nativeElement.textContent).not.toContain('VALORANT');
  });

  it('reports when a search does not match an active game', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'minecraft';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const emptyState = (fixture.nativeElement as HTMLElement).querySelector('.search-empty');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No active Drops match “minecraft”.');
  });

  it('does not show a no-results message when loading Drops fails', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].error(new Error('Unavailable'));
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'minecraft';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.load-error')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.search-empty')).toBeNull();
  });

  it('clears the current search from the in-field clear control', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'sea';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const clear = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
    expect(clear).not.toBeNull();
    clear!.click();
    fixture.detectChanges();

    expect(search.value).toBe('');
    expect((fixture.nativeElement as HTMLElement).querySelector('.search-empty')).toBeNull();
  });

  it('gives the label-free search field an accessible name', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [provideRouter([]), { provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="search"]');
    expect(search?.getAttribute('aria-label')).toBe('Search games');
  });
});
