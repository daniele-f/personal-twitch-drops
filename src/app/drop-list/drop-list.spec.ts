import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveDrop } from '../drops/active-drop';
import { DropListComponent } from './drop-list';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;
  const sea: ActiveDrop = { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 8, endsAt: '2026-09-28T12:00:00.000Z', imageUrl: 'https://cdn.example.test/sea.png' };
  const valorant: ActiveDrop = { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-29T12:00:00.000Z' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DropListComponent] }).compileComponents();
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
