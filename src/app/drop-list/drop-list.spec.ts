import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { DropListComponent } from './drop-list';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;
  const loadDropDetails = vi.fn();
  const sea: ActiveDrop = { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 8, rewards: ['Coral Crown', 'Sailor’s Chest'], endsAt: '2026-09-28T12:00:00.000Z', imageUrl: 'https://cdn.example.test/sea.png', publisher: 'Rare', watchDuration: '1h–4h watch' };
  const valorant: ActiveDrop = { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-29T12:00:00.000Z' };

  beforeEach(async () => {
    loadDropDetails.mockReset();
    loadDropDetails.mockReturnValue(of({ requirementByReward: {}, badgeRewardNames: [] }));
    await TestBed.configureTestingModule({
      imports: [DropListComponent],
      providers: [{ provide: DropsProvider, useValue: { loadDropDetails } }],
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

  it('marks a changed favorite with a pill before its favorite star', () => {
    fixture.componentRef.setInput('newDropIds', new Set(['/game/sea-of-thieves']));
    render([sea], []);

    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-drop-id="/game/sea-of-thieves"]');
    expect(row?.querySelector('.new-pill')?.compareDocumentPosition(row.querySelector('.favorite-star')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
    expect(headings).toEqual(['Favorites', 'Active Drops']);
    expect(fixture.nativeElement.querySelectorAll('[data-drop-id="/game/sea-of-thieves"]')).toHaveLength(1);
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

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.reward-details') as HTMLElement;
    expect(loadDropDetails).toHaveBeenCalledWith('/game/elden-ring');
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

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorite-details-toggle')!.click();
    fixture.detectChanges();

    const cards = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.reward-card')];
    expect(cards.map((card) => card.querySelector('.reward-name')?.textContent?.trim())).toEqual([
      'Two Hour Reward', 'Four Hour Reward', 'Twelve Hour Reward', 'Subscription Reward',
    ]);
    const badge = cards.at(-1)?.querySelector('.reward-type');
    expect(badge?.parentElement?.classList).toContain('reward-media');
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
    expect(details.textContent).toContain('Sorcerer Rogier');
    expect(details.textContent).not.toContain('Loading requirement…');
  });

  it('requires a second favorite-star click to emit unfavorite', () => {
    const unfavoriteRequested = vi.fn();
    fixture.componentInstance.unfavoriteRequested.subscribe(unfavoriteRequested);
    render([sea], []);
    const star = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-star');
    expect(star?.getAttribute('aria-label')).toBe('Unfavorite Sea of Thieves');
    star?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Press again to remove from Favorites');
    expect(star?.getAttribute('title')).toBe('Remove from Favorites');
    expect(star?.classList).toContain('favorite-star--armed');
    star?.click();
    expect(unfavoriteRequested).toHaveBeenCalledWith('/game/sea-of-thieves');
  });

  it('cancels armed unfavorite when the star loses pointer or keyboard focus', () => {
    render([sea], []);
    const star = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-star');
    star?.click();
    star?.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Press again to remove from Favorites');
    star?.click();
    star?.dispatchEvent(new FocusEvent('focusout'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Press again to remove from Favorites');
  });

  it('shows four decorative skeleton rows while Drops are loading', () => {
    fixture.componentRef.setInput('favoriteDrops', []);
    fixture.componentRef.setInput('activeDrops', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
  });
});
