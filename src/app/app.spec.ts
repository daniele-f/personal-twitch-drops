import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DropsProvider } from './drops/drops-provider';
import { PREFERENCES_STORAGE } from './preferences/preferences-storage';
import { PreferencesService } from './preferences/preferences.service';
import { App } from './app';
import { appConfig } from './app.config';
import { ChangesStateService, DAILY_SNAPSHOTS_STORAGE_KEY } from './changes/changes-state.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App], providers: [...appConfig.providers, { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } }] }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  it('renders Preferences as a button-styled hash route link', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.preferences-link');
    expect(link?.classList).toContain('app-button');
    expect(link?.getAttribute('href')).toBe('#/preferences');
  });

  it('does not render a placeholder Changes control', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No Changes');
  });

  it('shows Changes only after a real comparison is available', () => {
    vi.useFakeTimers();
    const changes = TestBed.inject(ChangesStateService);
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([]);
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    changes.updateDrops([{ id: '/game/arc-raiders', gameName: 'Arc Raiders', rewardCount: 1, rewards: ['Raider pack'], endsAt: '2026-09-24T00:00:00.000Z' }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Changes · 1');
  });

  it('marks unseen changes with a notification dot until the panel is opened', () => {
    const changes = TestBed.inject(ChangesStateService);
    changes.seed([], [{ id: '/game/arc-raiders', gameName: 'Arc Raiders', rewardCount: 1, rewards: ['Raider pack'], endsAt: '2026-09-24T00:00:00.000Z' }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')!;
    expect(button.querySelector('.changes-notification-dot')).toBeTruthy();

    button.click();
    fixture.detectChanges();
    expect(button.querySelector('.changes-notification-dot')).toBeNull();
  });

  it('marks the Changes control active while its panel is open', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button');

    button?.click();
    fixture.detectChanges();

    expect(button?.classList).toContain('changes-button--active');
  });

  it('keeps the Changes control active while hovered', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')!;

    button.click();
    button.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();

    const componentStyles = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
      .join('');
    expect(componentStyles).toMatch(/\.changes-button--active\[[^\]]+\]:hover:not\(:disabled\)/);
  });

  it('closes the Changes panel when a click lands outside it', () => {
    vi.useFakeTimers();
    const changes = TestBed.inject(ChangesStateService);
    const existing = { id: '/game/existing', gameName: 'Existing Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const added = { id: '/game/added', gameName: 'Added Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([existing]);
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    changes.updateDrops([existing]);
    changes.updateDrops([existing, added]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')!;

    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.change-since-refresh-dot')).toBeTruthy();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.changes-popover')).toBeNull();
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.change-since-refresh-dot')).toBeNull();
  });

  it('groups new, updated, and ended games in the Changes panel', () => {
    const changes = TestBed.inject(ChangesStateService);
    changes.seed(
      [
        { id: '/game/updated', gameName: 'Updated Game', rewardCount: 1, rewards: ['Old reward'], endsAt: '2026-09-24T00:00:00.000Z' },
        { id: '/game/ended', gameName: 'Ended Game', rewardCount: 1, rewards: ['Final reward'], endsAt: '2026-09-24T00:00:00.000Z' },
      ],
      [
        { id: '/game/new', gameName: 'New Game', rewardCount: 1, rewards: ['New reward'], endsAt: '2026-09-24T00:00:00.000Z' },
        { id: '/game/updated', gameName: 'Updated Game', rewardCount: 1, rewards: ['Updated reward'], endsAt: '2026-09-24T00:00:00.000Z' },
      ],
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    fixture.detectChanges();

    const groups = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.changes-group');
    expect([...groups].map((group) => group.querySelector('h3')?.textContent?.trim())).toEqual(['Newly added', 'Updated drops', 'Ended campaign']);
    expect([...groups].map((group) => group.querySelector('li')?.textContent?.trim())).toEqual(['New Game', 'Updated Game', 'Ended Game']);
  });

  it('hides ignored games until Show ignored games is enabled and persists the setting', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/hidden', 'Hidden Game');
    const changes = TestBed.inject(ChangesStateService);
    changes.seed([], [
      { id: '/game/visible', gameName: 'Visible Game', rewardCount: 1, rewards: ['Visible reward'], endsAt: '2026-09-24T00:00:00.000Z' },
      { id: '/game/hidden', gameName: 'Hidden Game', rewardCount: 1, rewards: ['Hidden reward'], endsAt: '2026-09-24T00:00:00.000Z' },
    ]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    fixture.detectChanges();

    const panel = fixture.nativeElement as HTMLElement;
    const toggle = panel.querySelector<HTMLInputElement>('#changes-show-hidden')!;
    expect(toggle.checked).toBe(false);
    expect(panel.textContent).toContain('Show ignored games');
    expect(panel.querySelector('.changes-show-hidden .toggle')).toBeTruthy();
    expect([...panel.querySelectorAll('.changes-group li')].map((item) => item.textContent?.trim())).toEqual(['Visible Game']);

    toggle.click();
    fixture.detectChanges();

    expect([...panel.querySelectorAll('.changes-group li')].map((item) => item.textContent?.trim())).toEqual(['Visible Game', 'Hidden Game']);
    const ignoredGame = [...panel.querySelectorAll<HTMLElement>('.changes-group li')].find((item) => item.textContent?.includes('Hidden Game'))!;
    expect(getComputedStyle(ignoredGame).opacity).toBe('0.65');
    expect(localStorage.getItem('personal-twitch-drops.changes-show-hidden.v1')).toBe('true');

    const reloadedFixture = TestBed.createComponent(App);
    reloadedFixture.detectChanges();
    (reloadedFixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    reloadedFixture.detectChanges();
    expect((reloadedFixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#changes-show-hidden')?.checked).toBe(true);
  });

  it('clears newly added dots when the Changes panel is closed', () => {
    vi.useFakeTimers();
    const changes = TestBed.inject(ChangesStateService);
    const existing = { id: '/game/existing', gameName: 'Existing Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const added = { id: '/game/added', gameName: 'Added Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([existing]);
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    changes.updateDrops([existing]);
    changes.updateDrops([existing, added]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')!;
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.change-since-refresh-dot')).toBeTruthy();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-close')?.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.change-since-refresh-dot')).toBeNull();
  });

  it('marks newly added games that arrived since the prior same-day refresh', () => {
    vi.useFakeTimers();
    const existing = { id: '/game/existing', gameName: 'Existing Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const added = { id: '/game/added', gameName: 'Added Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const changes = TestBed.inject(ChangesStateService);
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([existing]);
    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    changes.updateDrops([existing]);
    changes.updateDrops([existing, added]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    fixture.detectChanges();

    const newGame = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.changes-group li')]
      .find((item) => item.textContent?.includes('Added Game'));
    expect(newGame?.querySelector('.change-since-refresh-dot')).toBeTruthy();
  });

  it('marks updated games that changed since the prior same-day refresh', () => {
    vi.useFakeTimers();
    const previous = { id: '/game/existing', gameName: 'Existing Game', rewardCount: 1, rewards: ['Old reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const updated = { ...previous, rewards: ['Updated reward'] };
    const changes = TestBed.inject(ChangesStateService);
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([previous]);
    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    changes.updateDrops([previous]);
    changes.updateDrops([updated]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    fixture.detectChanges();

    const updatedGame = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.changes-group li')]
      .find((item) => item.textContent?.includes('Existing Game'));
    expect(updatedGame?.querySelector('.change-since-refresh-dot')).toBeTruthy();
  });

  it('marks ended games that were removed since the prior same-day refresh', () => {
    vi.useFakeTimers();
    const removed = { id: '/game/removed', gameName: 'Removed Game', rewardCount: 1, rewards: ['Reward'], endsAt: '2026-09-24T00:00:00.000Z' };
    const changes = TestBed.inject(ChangesStateService);
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    changes.updateDrops([removed]);
    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    changes.updateDrops([removed]);
    changes.updateDrops([]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.changes-button')?.click();
    fixture.detectChanges();

    const endedGame = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.changes-group li')]
      .find((item) => item.textContent?.includes('Removed Game'));
    expect(endedGame?.querySelector('.change-since-refresh-dot')).toBeTruthy();
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

  it('uses generic game names in every Changes menu scenario', () => {
    const fixture = TestBed.createComponent(App);
    const changes = TestBed.inject(ChangesStateService);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const group = (fixture.nativeElement as HTMLElement).querySelector<HTMLDetailsElement>('.debug-menu details')!;
    group.querySelector('summary')?.click();
    const scenarios: [string, string[]][] = [
      ['New game', ['Game 01:new']],
      ['Reward swap', ['Game 01:updated']],
      ['Ended game', ['Game 01:ended']],
      ['Multiple games', ['Game 01:new', 'Game 02:new', 'Game 03:new']],
      ['New and updated', ['Game 01:updated', 'Game 02:new']],
    ];
    for (const [label, expected] of scenarios) {
      [...group.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)?.click();
      fixture.detectChanges();
      expect(changes.changes().map((change) => `${change.drop.gameName}:${change.type}`)).toEqual(expected);
    }
  });

  it('mocks yesterday against the live campaigns without replacing them', () => {
    const liveDrops = [
      { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, rewards: ['Supply crate'], endsAt: '2026-09-30T00:00:00.000Z' },
      { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, rewards: ['Spray'], endsAt: '2026-09-30T00:00:00.000Z' },
    ];
    const changes = TestBed.inject(ChangesStateService);
    changes.updateDrops(liveDrops);
    const storedBefore = localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY);
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const changesGroup = (fixture.nativeElement as HTMLElement).querySelector<HTMLDetailsElement>('.debug-menu details')!;
    changesGroup.querySelector('summary')?.click();
    [...changesGroup.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Mock yesterday\'s campaigns')?.click();

    expect(changes.drops()).toEqual(liveDrops);
    expect(changes.changes().map((change) => `${change.drop.gameName}:${change.type}`)).toEqual([
      'Sea of Thieves:new',
      'VALORANT:updated',
      'Yesterday Game:ended',
    ]);
    expect(localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY)).toBe(storedBefore);
  });

  it('uses the same generic game names in every Changes console command', () => {
    TestBed.createComponent(App);
    const debug = (window as unknown as { twitchDropsDebug: { changes: Record<string, () => unknown> } }).twitchDropsDebug;
    const changes = TestBed.inject(ChangesStateService);
    const scenarios: [string, string[]][] = [
      ['newGame', ['Game 01:new']],
      ['rewardSwap', ['Game 01:updated']],
      ['endedGame', ['Game 01:ended']],
      ['multipleGames', ['Game 01:new', 'Game 02:new', 'Game 03:new']],
      ['newAndUpdated', ['Game 01:updated', 'Game 02:new']],
    ];
    for (const [command, expected] of scenarios) {
      debug.changes[command]();
      expect(changes.changes().map((change) => `${change.drop.gameName}:${change.type}`)).toEqual(expected);
    }
  });

  it('shows favorites separately from ignored games in the Storage menu', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const storageGroup = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details')[1];
    storageGroup.querySelector('summary')?.click();
    const buttons = [...storageGroup.querySelectorAll('button')];
    buttons.find((button) => button.textContent?.trim() === 'Show favorites')?.click();
    fixture.detectChanges();
    const favoritesOutput = storageGroup.querySelector<HTMLElement>('[data-storage-view="favorites"] pre')?.textContent ?? '';
    expect(favoritesOutput).toContain('Sea of Thieves');
    expect(favoritesOutput).not.toContain('VALORANT');

    buttons.find((button) => button.textContent?.trim() === 'Show ignored games')?.click();
    fixture.detectChanges();
    const ignoredOutput = storageGroup.querySelector<HTMLElement>('[data-storage-view="ignored"] pre')?.textContent ?? '';
    expect(ignoredOutput).toContain('VALORANT');
    expect(ignoredOutput).not.toContain('Sea of Thieves');
  });

  it('shows previous-day and today snapshots separately in the Storage menu', () => {
    localStorage.setItem(DAILY_SNAPSHOTS_STORAGE_KEY, JSON.stringify({
      baseline: { date: '2026-09-22', drops: [{ id: '/game/yesterday', gameName: 'Yesterday Game', rewardCount: 1, rewards: ['Old reward'], endsAt: '2026-09-30T00:00:00.000Z' }] },
      current: { date: '2026-09-23', drops: [{ id: '/game/today', gameName: 'Today Game', rewardCount: 1, rewards: ['New reward'], endsAt: '2026-09-30T00:00:00.000Z' }] },
    }));
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const storageGroup = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details')[1];
    storageGroup.querySelector('summary')?.click();
    const buttons = [...storageGroup.querySelectorAll('button')];
    buttons.find((button) => button.textContent?.trim() === 'Show previous day')?.click();
    buttons.find((button) => button.textContent?.trim() === 'Show today\'s latest')?.click();
    fixture.detectChanges();

    const previousOutput = storageGroup.querySelector<HTMLElement>('[data-storage-view="previous-day"] pre')?.textContent ?? '';
    const todayOutput = storageGroup.querySelector<HTMLElement>('[data-storage-view="today"] pre')?.textContent ?? '';
    expect(previousOutput).toContain('2026-09-22');
    expect(previousOutput).toContain('Yesterday Game');
    expect(previousOutput).not.toContain('Today Game');
    expect(todayOutput).toContain('2026-09-23');
    expect(todayOutput).toContain('Today Game');
    expect(todayOutput).not.toContain('Yesterday Game');
  });

  it('shows missing previous-day and today snapshots as null', () => {
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const storageGroup = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details')[1];
    storageGroup.querySelector('summary')?.click();
    const buttons = [...storageGroup.querySelectorAll('button')];
    buttons.find((button) => button.textContent?.trim() === 'Show previous day')?.click();
    buttons.find((button) => button.textContent?.trim() === 'Show today\'s latest')?.click();
    fixture.detectChanges();

    expect(storageGroup.querySelector<HTMLElement>('[data-storage-view="previous-day"] pre')?.textContent?.trim()).toBe('null');
    expect(storageGroup.querySelector<HTMLElement>('[data-storage-view="today"] pre')?.textContent?.trim()).toBe('null');
  });

  it('temporarily adjusts snapshots with generated rewards and end dates without changing storage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const first = { id: '/game/second', gameName: 'Second', rewardCount: 1, rewards: ['Atlas'], endsAt: '2026-09-30T00:00:00.000Z' };
    const second = { id: '/game/second', gameName: 'Second', rewardCount: 1, rewards: ['Nebula'], endsAt: '2026-09-30T00:00:00.000Z' };
    const third = { id: '/game/third', gameName: 'Third', rewardCount: 1, rewards: ['Starship'], endsAt: '2026-09-30T00:00:00.000Z' };
    localStorage.setItem(DAILY_SNAPSHOTS_STORAGE_KEY, JSON.stringify({
      baseline: { date: '2026-09-22', drops: [first] },
      current: { date: '2026-09-23', drops: [second] },
    }));
    const storedBefore = localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY);
    const changes = TestBed.inject(ChangesStateService);
    const fixture = TestBed.createComponent(App);
    (window as unknown as { twitchDropsDebug: { openMenu(): void } }).twitchDropsDebug.openMenu();
    fixture.detectChanges();

    const storageGroup = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLDetailsElement>('.debug-menu details')[1];
    storageGroup.querySelector('summary')?.click();
    const previousName = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="previous-day"] input[aria-label="Game name"]');
    const previousRewardCount = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="previous-day"] input[aria-label="Reward count"]');
    const previousEndsInDays = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="previous-day"] input[aria-label="Ends in days"]');
    expect(previousName).toBeTruthy();
    expect(previousRewardCount).toBeTruthy();
    expect(previousEndsInDays).toBeTruthy();

    previousName!.value = 'Second';
    previousName!.dispatchEvent(new Event('input'));
    previousRewardCount!.value = '2';
    previousRewardCount!.dispatchEvent(new Event('input'));
    previousEndsInDays!.value = '3';
    previousEndsInDays!.dispatchEvent(new Event('input'));
    [...storageGroup.querySelectorAll<HTMLButtonElement>('[data-storage-view="previous-day"] button')].find((button) => button.textContent?.trim() === 'Add')?.click();
    fixture.detectChanges();
    expect(changes.changes().map((change) => change.type)).toEqual(['updated']);
    expect(changes.drops()).toEqual([second]);

    const todayName = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="today"] input[aria-label="Game name"]');
    const todayRewardCount = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="today"] input[aria-label="Reward count"]');
    const todayEndsInDays = storageGroup.querySelector<HTMLInputElement>('[data-storage-view="today"] input[aria-label="Ends in days"]');
    todayName!.value = 'Third';
    todayName!.dispatchEvent(new Event('input'));
    todayRewardCount!.value = '1';
    todayRewardCount!.dispatchEvent(new Event('input'));
    todayEndsInDays!.value = '1';
    todayEndsInDays!.dispatchEvent(new Event('input'));
    [...storageGroup.querySelectorAll<HTMLButtonElement>('[data-storage-view="today"] button')].find((button) => button.textContent?.trim() === 'Replace')?.click();
    fixture.detectChanges();
    const expectedEndsAt = new Date();
    expectedEndsAt.setHours(0, 0, 0, 0);
    expectedEndsAt.setDate(expectedEndsAt.getDate() + 1);
    expect(changes.drops()).toEqual([{ ...third, rewards: ['Reward 01'], endsAt: expectedEndsAt.toISOString() }]);
    expect(localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY)).toBe(storedBefore);
  });

  it('exposes every saved-data category through separate developer commands', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    TestBed.createComponent(App);

    const debug = (window as unknown as { twitchDropsDebug: { storage: { favorites(): unknown; ignored(): unknown; previousDay(): unknown; today(): unknown } } }).twitchDropsDebug;
    expect(debug.storage.favorites()).toMatchObject({
      available: true,
      favoriteIds: ['/game/sea-of-thieves'],
      favoriteNames: { '/game/sea-of-thieves': 'Sea of Thieves' },
    });
    expect(debug.storage.ignored()).toMatchObject({
      available: true,
      blacklistEntries: [{ id: '/game/valorant', gameName: 'VALORANT' }],
    });
    expect(debug.storage.previousDay()).toBeNull();
    expect(debug.storage.today()).toBeNull();
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
