import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { DropListComponent } from './drop-list';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;
  const loadDropDetails = vi.fn();
  const sea: ActiveDrop = { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 8, rewards: ['Coral Crown', 'Sailor’s Chest'], endsAt: '2026-09-28T12:00:00.000Z', imageUrl: 'https://cdn.example.test/sea.png', publisher: 'Rare', watchDuration: '1h–4h watch' };
  const valorant: ActiveDrop = { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-29T12:00:00.000Z' };

  beforeEach(async () => {
    localStorage.clear();
    loadDropDetails.mockReset();
    loadDropDetails.mockReturnValue(of({ requirementByReward: {}, badgeRewardNames: [] }));
    await TestBed.configureTestingModule({
      imports: [DropListComponent],
      providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadDropDetails } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DropListComponent);
  });

  function render(favoriteDrops: readonly ActiveDrop[] = [], activeDrops: readonly ActiveDrop[] = [sea]): void {
    fixture.componentRef.setInput('favoriteDrops', favoriteDrops);
    fixture.componentRef.setInput('activeDrops', activeDrops);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
  }

  it('hides Favorites when empty and renders active Drops', () => {
    render();
    expect(fixture.nativeElement.querySelector('.favorites-section')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
  });

  it('marks a newly active game with a New pill', () => {
    fixture.componentRef.setInput('newDropIds', new Set(['/game/sea-of-thieves']));
    render();

    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"]')?.textContent).toContain('New');
  });

  it('marks an updated game with an Updated pill before its favorite star', () => {
    fixture.componentRef.setInput('updatedDropIds', new Set(['/game/sea-of-thieves']));
    render();

    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/sea-of-thieves"]');
    expect(row?.textContent).toContain('Updated');
    expect(row?.querySelector('.updated-pill')?.compareDocumentPosition(row.querySelector('.favorite-star')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps the unfavorite star beside a changed favorite tag', () => {
    fixture.componentRef.setInput('newDropIds', new Set(['/game/sea-of-thieves']));
    render([sea], []);

    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/sea-of-thieves"]');
    expect(row?.querySelector('.new-pill')?.textContent).toBe('New');
    expect(row?.querySelector('.favorite-star')?.textContent?.trim()).toBe('★');
  });

  it('places favorite tags, star, and disclosure chevron in the active-row action order', () => {
    fixture.componentRef.setInput('updatedDropIds', new Set(['/game/sea-of-thieves']));
    render([sea], []);

    const rowEnd = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/sea-of-thieves"] .row-end')!;
    const actions = rowEnd.querySelector('.row-actions')!;
    expect([...rowEnd.children].map((element) => element.className)).toEqual(['updated-pill', 'row-actions']);
    expect([...actions.children].map((element) => element.className)).toEqual([
      'favorite-star favorite-star--selected',
      'favorite-details-toggle favorite-details-toggle--icon',
    ]);
  });

  it('keeps a changed game tag and its actions in one row-end group', () => {
    fixture.componentRef.setInput('updatedDropIds', new Set(['/game/sea-of-thieves']));
    render();

    const rowEnd = fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"] .row-end');
    expect(rowEnd?.querySelector('.updated-pill')).toBeTruthy();
    expect(rowEnd?.querySelector('.favorite-star')).toBeTruthy();
    expect(rowEnd?.querySelector('.blacklist-button')).toBeTruthy();
  });

  it('renders Favorites before Active Drops without duplicating rows', () => {
    render([sea], [valorant]);
    const headings = [...fixture.nativeElement.querySelectorAll('h2')].map((heading: HTMLElement) => heading.textContent?.trim());
    expect(headings).toEqual(['Favorites (1)', 'Active Drops (1)']);
    expect(fixture.nativeElement.querySelectorAll('[data-drop-id="/game/sea-of-thieves"]')).toHaveLength(1);
  });

  it('shows the visible drop total beside each section heading', () => {
    const secondActiveDrop = { ...valorant, id: '/game/apex-legends', gameName: 'Apex Legends' } as ActiveDrop;
    render([sea], [valorant, secondActiveDrop]);

    const headings = [...fixture.nativeElement.querySelectorAll('h2')].map((heading: HTMLElement) => heading.textContent?.trim());
    expect(headings).toEqual(['Favorites (1)', 'Active Drops (2)']);
  });

  it('links the Favorites manage action to the favorites preferences section', () => {
    render([sea], []);

    const manage = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.favorites-manage');
    expect(manage?.textContent?.trim()).toBe('Manage');
    expect(manage?.getAttribute('href')).toBe('/preferences#favorites');
  });

  it('renders default-off Subs and Badges switches alongside the single Manage action', () => {
    render();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('.active-section .section-heading');
    const controls = heading?.querySelector('.section-heading-actions');
    const switches = controls?.querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');

    expect(controls?.querySelector('.favorites-manage')?.textContent?.trim()).toBe('Manage');
    expect(switches).toHaveLength(2);
    expect(switches?.[0].getAttribute('aria-label')).toBe('Show subscription Drops');
    expect(switches?.[1].getAttribute('aria-label')).toBe('Show badge Drops');
    expect(switches?.[0].checked).toBe(false);
    expect(switches?.[1].checked).toBe(false);
    expect(getComputedStyle(controls!).flexWrap).toBe('wrap');
  });

  it('restores persisted Subs and Badges switches', () => {
    localStorage.setItem('personal-twitch-drops.display-preferences.v1', JSON.stringify({ showSubscriptions: true, showBadges: true }));
    fixture.destroy();
    fixture = TestBed.createComponent(DropListComponent);
    render();

    const switches = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');
    expect(switches[0].checked).toBe(true);
    expect(switches[1].checked).toBe(true);
  });

  it('persists changed Subs and Badges switches', () => {
    render();

    const switches = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');
    switches[0].click();
    switches[1].click();

    expect(localStorage.getItem('personal-twitch-drops.display-preferences.v1')).toBe(JSON.stringify({ showSubscriptions: true, showBadges: true }));
  });

  it('reveals subscription and badge rewards only when their switches are enabled', () => {
    const favorite = { ...sea, rewards: ['Watch Reward', 'Subscription Reward', 'Badge Reward'] } as ActiveDrop;
    loadDropDetails.mockReturnValue(of({
      requirementByReward: { 'Watch Reward': '1h watch', 'Subscription Reward': '1 sub', 'Badge Reward': '2h watch' },
      badgeRewardNames: ['Badge Reward'],
    }));
    render([favorite], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('.reward-name')].map((reward: Element) => reward.textContent?.trim())).toEqual(['Watch Reward']);

    const switches = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');
    switches[0].click();
    switches[1].click();
    fixture.detectChanges();

    expect([...fixture.nativeElement.querySelectorAll('.reward-name')].map((reward: Element) => reward.textContent?.trim())).toEqual([
      'Watch Reward', 'Badge Reward', 'Subscription Reward',
    ]);
  });

  it('withholds unclassified rewards while their details are loading', () => {
    const favorite = { ...sea, rewards: ['Subscription Reward'], watchDuration: undefined } as ActiveDrop;
    const details = new Subject<{ requirementByReward: Record<string, string>; badgeRewardNames: string[] }>();
    loadDropDetails.mockReturnValue(details);
    render([favorite], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.reward-card')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.reward-details')?.textContent).toContain('Loading requirement…');
    expect(fixture.nativeElement.querySelector('.reward-details')?.textContent).not.toContain('Current reward details are unavailable.');
  });

  it('removes favorite and active games when every reward is hidden by the default filters', () => {
    const subscriptionOnly = { ...sea, id: '/game/subscription-only', gameName: 'Subscription Only', rewards: ['Subscription Reward'] } as ActiveDrop;
    const badgeOnly = { ...sea, id: '/game/badge-only', gameName: 'Badge Only', rewards: ['Badge Reward'] } as ActiveDrop;
    const watchOnly = { ...sea, id: '/game/watch-only', gameName: 'Watch Only', rewards: ['Watch Reward'] } as ActiveDrop;
    loadDropDetails.mockImplementation((id: string) => of(
      id === subscriptionOnly.id
        ? { requirementByReward: { 'Subscription Reward': '1 sub' }, badgeRewardNames: [] }
        : id === badgeOnly.id
          ? { requirementByReward: { 'Badge Reward': '1h watch' }, badgeRewardNames: ['Badge Reward'] }
          : { requirementByReward: { 'Watch Reward': '1h watch' }, badgeRewardNames: [] },
    ));
    render([subscriptionOnly], [badgeOnly, watchOnly]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-drop-id="/game/subscription-only"]')).toBeNull();
    expect(page.querySelector('[data-drop-id="/game/badge-only"]')).toBeNull();
    expect(page.querySelector('[data-drop-id="/game/watch-only"]')?.textContent).toContain('Watch Only');
    expect(page.querySelector('.favorites-section')).toBeNull();
    expect(page.querySelector('.active-section .section-heading')?.textContent).toContain('Manage');
  });

  it('shows a search result hidden by reward filters with an explanatory state', () => {
    const subscriptionOnly = { ...sea, id: '/game/subscription-only', gameName: 'Subscription Only', rewards: ['Subscription Reward'] } as ActiveDrop;
    loadDropDetails.mockReturnValue(of({ requirementByReward: { 'Subscription Reward': '1 sub' }, badgeRewardNames: [] }));
    fixture.componentRef.setInput('searchActive', true);
    fixture.componentRef.setInput('ignoredDropIds', new Set([subscriptionOnly.id]));
    render([], [subscriptionOnly]);

    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/subscription-only"]');
    expect(row?.textContent).toContain('Subscription Only');
    expect(row?.textContent).toContain('Ignored');
    expect(row?.textContent).toContain('Hidden by reward filter');
  });

  it('reports how many games are hidden by the reward filters', () => {
    const subscriptionOnly = { ...sea, id: '/game/subscription-only', gameName: 'Subscription Only', rewards: ['Subscription Reward'] } as ActiveDrop;
    const badgeOnly = { ...sea, id: '/game/badge-only', gameName: 'Badge Only', rewards: ['Badge Reward'] } as ActiveDrop;
    loadDropDetails.mockImplementation((id: string) => of(
      id === subscriptionOnly.id
        ? { requirementByReward: { 'Subscription Reward': '1 sub' }, badgeRewardNames: [] }
        : { requirementByReward: { 'Badge Reward': '1h watch' }, badgeRewardNames: ['Badge Reward'] },
    ));
    render([subscriptionOnly], [badgeOnly]);

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.hidden-games-count')?.textContent?.trim()).toBe('2 games hidden');
    const toggles = page.querySelector('.active-section .display-toggles')!;
    expect([...toggles.children].map((element) => element.className)).toEqual([
      'hidden-games-count', 'toggle-control', 'toggle-control',
    ]);
    const hiddenCount = toggles.querySelector<HTMLElement>('.hidden-games-count')!;
    expect(getComputedStyle(hiddenCount).fontSize).toBe('11px');
    expect(getComputedStyle(hiddenCount).color).toBe('rgb(184, 184, 189)');

    const switches = page.querySelectorAll<HTMLInputElement>('.active-section .toggle input[type="checkbox"]');
    switches[0].click();
    switches[1].click();
    fixture.detectChanges();

    expect(page.querySelector('.hidden-games-count')).toBeNull();
  });

  it('reclassifies a game when a refresh changes its reward set', () => {
    const initial = { ...sea, id: '/game/changing-game', gameName: 'Changing Game', rewards: ['Watch Reward'] } as ActiveDrop;
    const changed = { ...initial, rewards: ['Subscription Reward'] } as ActiveDrop;
    loadDropDetails.mockImplementation((id: string) => of(
      id === initial.id && fixture.componentInstance.activeDrops()[0]?.rewards?.[0] === 'Subscription Reward'
        ? { requirementByReward: { 'Subscription Reward': '1 sub' }, badgeRewardNames: [] }
        : { requirementByReward: { 'Watch Reward': '1h watch' }, badgeRewardNames: [] },
    ));
    render([], [initial]);
    fixture.componentRef.setInput('activeDrops', [changed]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/changing-game"]')).toBeNull();
  });

  it('keeps keyboard focus on the Badge switch when it moves from Favorites to Active Drops', async () => {
    const badgeOnly = { ...sea, id: '/game/badge-only', gameName: 'Badge Only', rewards: ['Badge Reward'] } as ActiveDrop;
    loadDropDetails.mockReturnValue(of({ requirementByReward: { 'Badge Reward': '1h watch' }, badgeRewardNames: ['Badge Reward'] }));
    render([badgeOnly], []);

    const activeBadgeSwitch = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.active-section .toggle input[type="checkbox"]')[1];
    activeBadgeSwitch.click();
    fixture.detectChanges();

    const favoriteBadgeSwitch = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.favorites-section .toggle input[type="checkbox"]')[1];
    favoriteBadgeSwitch.focus();
    favoriteBadgeSwitch.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.active-section .toggle input[type="checkbox"]')[1]);
  });

  it('reclassifies a game when a refresh changes the campaign end time but not its rewards', () => {
    const initial = { ...sea, id: '/game/changing-campaign', gameName: 'Changing Campaign', rewards: ['Reward'], endsAt: '2026-09-28T12:00:00.000Z' } as ActiveDrop;
    const changed = { ...initial, endsAt: '2026-09-29T12:00:00.000Z' } as ActiveDrop;
    loadDropDetails.mockImplementation(() => of(
      fixture.componentInstance.activeDrops()[0]?.endsAt === changed.endsAt
        ? { requirementByReward: { Reward: '1 sub' }, badgeRewardNames: [] }
        : { requirementByReward: { Reward: '1h watch' }, badgeRewardNames: [] },
    ));
    render([], [initial]);
    fixture.componentRef.setInput('activeDrops', [changed]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/changing-campaign"]')).toBeNull();
  });

  it('retries a failed detail lookup after the drops refresh', () => {
    const drop = { ...sea, id: '/game/retry-game', gameName: 'Retry Game', rewards: ['Reward'] } as ActiveDrop;
    loadDropDetails.mockReturnValueOnce(throwError(() => new Error('Unavailable'))).mockReturnValueOnce(of({
      requirementByReward: { Reward: '1 sub' }, badgeRewardNames: [],
    }));
    render([], [drop]);
    fixture.componentRef.setInput('activeDrops', [{ ...drop }]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/retry-game"]')).toBeNull();
  });

  it('emits a favorite request from an active row star', () => {
    const favoriteRequested = vi.fn();
    fixture.componentInstance.favoriteRequested.subscribe(favoriteRequested);
    render();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-star')?.click();
    expect(favoriteRequested).toHaveBeenCalledWith(sea);
  });

  it('emits the active drop from its blacklist button', () => {
    const blacklistRequested = vi.fn();
    fixture.componentInstance.blacklistRequested.subscribe(blacklistRequested);
    render();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .blacklist-button');
    expect(button?.title).toBe('Ignore');
    expect(button?.getAttribute('aria-label')).toBe('Ignore Sea of Thieves');
    button?.click();

    expect(blacklistRequested).toHaveBeenCalledWith(sea);
  });

  it('does not render a blacklist button on favorite rows', () => {
    render([sea], []);

    expect(fixture.nativeElement.querySelector('.favorites-section .blacklist-button')).toBeNull();
  });

  it('shows the selected favorite’s current rewards below its row', () => {
    const valorantFavorite: ActiveDrop = { ...valorant, rewards: ['Arcade Spray'] };
    render([sea, valorantFavorite], []);

    const seaToggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-details-toggle');
    expect(seaToggle).toBeTruthy();
    seaToggle!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"] .reward-details')?.textContent).toContain('Coral Crown');

    const valorantToggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/valorant"] .favorite-details-toggle');
    valorantToggle!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"] .reward-details')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/valorant"] .reward-details')?.textContent).toContain('Arcade Spray');
  });

  it('shows an active game’s current rewards when its disclosure chevron is opened', () => {
    render([], [sea]);

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.active-section .favorite-details-toggle--icon');
    expect(toggle).toBeTruthy();
    toggle?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"] .reward-details')?.textContent).toContain('Coral Crown');
  });

  it('defers game-link enrichment until a game is opened', () => {
    render([], [sea, valorant]);

    expect(loadDropDetails).toHaveBeenCalledWith(sea.id);
    expect(loadDropDetails).toHaveBeenCalledWith(valorant.id);
    expect(loadDropDetails).not.toHaveBeenCalledWith(sea.id, sea.gameName);
    expect(loadDropDetails).not.toHaveBeenCalledWith(valorant.id, valorant.gameName);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-details-toggle--icon')!.click();
    fixture.detectChanges();

    expect(loadDropDetails).toHaveBeenCalledWith(sea.id, sea.gameName);
    expect(loadDropDetails).not.toHaveBeenCalledWith(valorant.id, valorant.gameName);
  });

  it('starts game-link enrichment after details finish loading for an opened game', () => {
    const initialDetails = new Subject<{ requirementByReward: Record<string, string>; badgeRewardNames: string[] }>();
    loadDropDetails.mockImplementation((_id: string, gameName?: string) => gameName
      ? of({ requirementByReward: {}, badgeRewardNames: [], primaryLink: { label: 'Official website', url: 'https://example-game.test/' } })
      : initialDetails);
    render([], [sea]);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle--icon')!.click();
    fixture.detectChanges();
    expect(loadDropDetails).not.toHaveBeenCalledWith(sea.id, sea.gameName);

    initialDetails.next({ requirementByReward: {}, badgeRewardNames: [] });
    initialDetails.complete();
    fixture.detectChanges();

    expect(loadDropDetails).toHaveBeenCalledWith(sea.id, sea.gameName);
  });

  it('cancels queued game-link enrichment when the game is closed before details finish loading', () => {
    const initialDetails = new Subject<{ requirementByReward: Record<string, string>; badgeRewardNames: string[] }>();
    loadDropDetails.mockReturnValue(initialDetails);
    render([], [sea]);
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle--icon')!;

    toggle.click();
    toggle.click();
    initialDetails.next({ requirementByReward: {}, badgeRewardNames: [] });
    initialDetails.complete();
    fixture.detectChanges();

    expect(loadDropDetails).not.toHaveBeenCalledWith(sea.id, sea.gameName);
  });

  it('retries game-link enrichment after its source request fails and details refresh', () => {
    loadDropDetails.mockImplementation((_id: string, gameName?: string) => gameName
      ? throwError(() => new Error('Unavailable'))
      : of({ requirementByReward: {}, badgeRewardNames: [] }));
    render([], [sea]);
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle--icon')!;

    toggle.click();
    fixture.detectChanges();
    fixture.componentRef.setInput('activeDrops', [{ ...sea }]);
    fixture.detectChanges();
    toggle.click();
    toggle.click();
    fixture.detectChanges();

    expect(loadDropDetails.mock.calls.filter((call) => call[0] === sea.id && call[1] === sea.gameName)).toHaveLength(2);
  });

  it('opens an active game’s rewards when its card is clicked', () => {
    render([], [sea]);

    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.active-section .active-details-toggle--card');
    expect(card).toBeTruthy();
    card?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"] .reward-details')?.textContent).toContain('Coral Crown');
  });

  it('uses the favorite card image as part of the reward disclosure button', () => {
    render([sea], []);

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle');
    expect(toggle?.querySelector<HTMLImageElement>('.cover-image')?.alt).toBe('Sea of Thieves');
    toggle!.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
  });

  it('marks an expanded favorite card as selected', () => {
    render([sea], []);
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-drop-id="/game/sea-of-thieves"] .drop-row');
    const toggle = row?.querySelector<HTMLButtonElement>('.favorite-details-toggle');

    expect(row?.classList).not.toContain('drop-row--expanded');
    toggle!.click();
    fixture.detectChanges();
    expect(row?.classList).toContain('drop-row--expanded');
  });

  it('keeps a favorite disclosure in a flexible card column', () => {
    render([sea], []);

    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-drop-id="/game/sea-of-thieves"] .drop-row');
    expect(getComputedStyle(row!).gridTemplateColumns).not.toContain('3.5rem');
  });

  it('renders supplied reward thumbnails in the selected favorite’s reward strip', () => {
    const seaWithRewardImage = { ...sea, rewardImages: ['https://cdn.example.test/coral-crown.png'] } as ActiveDrop;
    render([seaWithRewardImage], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const thumbnail = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>('.reward-card img');
    expect(thumbnail?.src).toBe('https://cdn.example.test/coral-crown.png');
    expect(thumbnail?.alt).toBe('Coral Crown');
  });

  it('shows publisher, watch range, and an exact end-time tooltip for an expanded favorite', () => {
    render([sea], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.reward-details') as HTMLElement;
    const endTime = details.querySelector<HTMLTimeElement>('.drop-end-time');
    expect(details.textContent).toContain('Rare');
    expect(details.textContent).toContain('1h–4h watch');
    expect(endTime?.getAttribute('datetime')).toBe(sea.endsAt);
    expect(endTime?.title).toContain('2026');
  });

  it('renders Steam and eligible-stream links without a TwitchDrops details link for an opened game', () => {
    loadDropDetails.mockReturnValue(of({
      requirementByReward: {},
      badgeRewardNames: [],
      primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/1172470/Apex_Legends/' },
      detailsUrl: 'https://twitchdrops.app/game/apex-legends',
      streamersUrl: 'https://www.twitch.tv/directory/category/apex-legends',
    }));
    render([sea], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.game-links a')];
    expect(links.map((link) => ({ label: link.textContent?.trim(), url: link.href }))).toEqual([
      { label: 'Steam', url: 'https://store.steampowered.com/app/1172470/Apex_Legends/' },
      { label: 'Watch eligible streams', url: 'https://www.twitch.tv/directory/category/apex-legends' },
    ]);
    expect(links.every((link) => link.target === '_blank' && link.rel === 'noopener noreferrer')).toBe(true);
  });

  it('logs the Steam link after a game is opened', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    loadDropDetails.mockReturnValue(of({
      requirementByReward: {}, badgeRewardNames: [], primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/123456/' },
    }));
    render([], [sea]);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle--icon')!.click();

    expect(consoleLog).toHaveBeenCalledWith('[Game links] Sea of Thieves: Steam — https://store.steampowered.com/app/123456/');
  });

  it.each([
    [{ label: 'Official website' as const, url: 'https://example-game.test/' }, '[Game links] Sea of Thieves: Official website — https://example-game.test/'],
    [undefined, '[Game links] Sea of Thieves: None'],
  ])('logs the resolved primary-link state after a game is opened', (primaryLink, expectedMessage) => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    loadDropDetails.mockReturnValue(of({ requirementByReward: {}, badgeRewardNames: [], ...(primaryLink ? { primaryLink } : {}) }));
    render([], [sea]);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle--icon')!.click();

    expect(consoleLog).toHaveBeenCalledWith(expectedMessage);
  });

  it('shows the remaining time in the card summary and the end date in expanded details', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-26T12:00:00.000Z'));
    render([sea], []);

    const card = fixture.nativeElement.querySelector('[data-drop-id="/game/sea-of-thieves"]') as HTMLElement;
    expect(card.querySelector('.drop-copy p')?.textContent?.trim()).toBe('8 rewards · 2d left');

    card.querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    expect(card.querySelector('.drop-end-time')?.textContent?.trim()).toBe('Ends Sep 28');
  });

  it('shows the exact end time as a tooltip for the card countdown', () => {
    render([sea], []);

    const countdown = (fixture.nativeElement as HTMLElement).querySelector<HTMLTimeElement>('[data-drop-id="/game/sea-of-thieves"] .drop-copy time');
    expect(countdown?.textContent?.trim()).toMatch(/\d+[dh] left/);
    expect(countdown?.getAttribute('datetime')).toBe(sea.endsAt);
    expect(countdown?.title).toContain('2026');
  });

  it('shows a subscription requirement and labels badge rewards after loading drop details', () => {
    const eldenRing: ActiveDrop = {
      id: '/game/elden-ring',
      gameName: 'ELDEN RING',
      rewardCount: 1,
      rewards: ['Sorcerer Rogier'],
      endsAt: '2026-09-28T12:00:00.000Z',
    };
    loadDropDetails.mockReturnValue(of({
      requirementByReward: { 'Sorcerer Rogier': '1 sub' },
      badgeRewardNames: ['Sorcerer Rogier'],
    }));
    render([eldenRing], []);

    const switches = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');
    switches[0].click();
    switches[1].click();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.reward-details') as HTMLElement;
    expect(loadDropDetails).toHaveBeenCalledWith('/game/elden-ring', 'ELDEN RING');
    expect(details.textContent).toContain('1 sub');
    expect(details.querySelector('.reward-type')?.textContent).toContain('Badge');
  });

  it('orders timed rewards by watch duration and places a badge tag beneath its image', () => {
    const rewards = ['Twelve Hour Reward', 'Subscription Reward', 'Two Hour Reward', 'Four Hour Reward'];
    const favorite = { ...sea, rewards, rewardImages: rewards.map((reward) => `https://cdn.example.test/${reward}.png`) } as ActiveDrop;
    loadDropDetails.mockReturnValue(of({
      requirementByReward: {
        'Twelve Hour Reward': '12h watch',
        'Subscription Reward': '1 sub',
        'Two Hour Reward': '2h watch',
        'Four Hour Reward': '4h watch',
      },
      badgeRewardNames: ['Subscription Reward'],
    }));
    render([favorite], []);

    const switches = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.toggle input[type="checkbox"]');
    switches[0].click();
    switches[1].click();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const cards = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.reward-card')];
    expect(cards.map((card) => card.querySelector('.reward-name')?.textContent?.trim())).toEqual([
      'Two Hour Reward', 'Four Hour Reward', 'Twelve Hour Reward', 'Subscription Reward',
    ]);
    const badge = cards.at(-1)?.querySelector('.reward-type');
    expect(badge?.parentElement?.classList).toContain('reward-media');
    expect(cards.at(-1)?.classList).toContain('reward-card--badge');
    expect(getComputedStyle(cards.at(-1)!).columnGap).toBe('0.9rem');
    expect(cards[0].querySelector('.reward-requirement')?.classList).toContain('reward-requirement--watch');
    expect(cards.at(-1)?.querySelector('.reward-requirement')?.classList).toContain('reward-requirement--subscription');
  });

  it('centers a reward requirement in a row below its name', () => {
    const favorite = { ...sea, rewards: ['Coral Crown'] } as ActiveDrop;
    loadDropDetails.mockReturnValue(of({
      requirementByReward: { 'Coral Crown': '1h watch' }, badgeRewardNames: [],
    }));
    render([favorite], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.reward-card');
    const requirement = card?.querySelector<HTMLElement>('.reward-requirement');
    expect(getComputedStyle(card!).display).toBe('grid');
    expect(getComputedStyle(requirement!).gridColumn).toBe('1/-1');
    expect(getComputedStyle(requirement!).justifySelf).toBe('center');
  });

  it('reserves five equal reward columns on desktop', () => {
    render([{ ...sea, rewards: ['Coral Crown'] }], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const grid = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.reward-grid');
    expect(getComputedStyle(grid!).gridTemplateColumns).toBe('repeat(5, minmax(0, 1fr))');
  });

  it('keeps the reward panel usable when drop details cannot be loaded', () => {
    const eldenRing: ActiveDrop = {
      id: '/game/elden-ring', gameName: 'ELDEN RING', rewardCount: 1, rewards: ['Sorcerer Rogier'], endsAt: '2026-09-28T12:00:00.000Z',
    };
    loadDropDetails.mockReturnValue(throwError(() => new Error('Unavailable')));
    render([eldenRing], []);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.reward-details') as HTMLElement;
    expect(details.textContent).toContain('Current reward details are unavailable.');
    expect(details.textContent).not.toContain('Loading requirement…');
  });

  it('requires a second click to unfavorite a favorite game', () => {
    const unfavoriteRequested = vi.fn();
    fixture.componentInstance.unfavoriteRequested.subscribe(unfavoriteRequested);
    render([sea], []);

    const star = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorites-section .favorite-star')!;
    expect(star.textContent?.trim()).toBe('★');
    expect(star.getAttribute('aria-label')).toBe('Unfavorite Sea of Thieves');

    star.click();
    fixture.detectChanges();
    expect(star.textContent?.trim()).toBe('Confirm');
    expect(unfavoriteRequested).not.toHaveBeenCalled();

    star.click();
    expect(unfavoriteRequested).toHaveBeenCalledWith(sea);
  });

  it('cancels unfavorite confirmation when the pointer leaves the star', () => {
    render([sea], []);
    const star = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorites-section .favorite-star')!;

    star.click();
    star.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();

    expect(star.textContent?.trim()).toBe('★');
  });

  it('shows four decorative skeleton rows while Drops are loading', () => {
    fixture.componentRef.setInput('favoriteDrops', []);
    fixture.componentRef.setInput('activeDrops', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
  });
});
