import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropListComponent } from './drop-list';
import { DropListSection } from '../shell-data';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;

  const sections: readonly DropListSection[] = [
    {
      title: 'Favorites',
      countLabel: '1 active',
      items: [
        { game: 'The Elder Scrolls Online', campaign: 'Crown Crate drops', isNew: false },
        { game: 'Sea of Thieves', campaign: 'Community Weekend', isNew: true },
      ],
    },
    {
      title: 'Newly added',
      countLabel: '1 game',
      items: [{ game: 'Rust', campaign: 'Twitch Rivals collection', isNew: true }],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DropListComponent] }).compileComponents();
    fixture = TestBed.createComponent(DropListComponent);
    fixture.componentRef.setInput('sections', sections);
    fixture.detectChanges();
  });

  it('renders Favorites before Newly added', () => {
    const titles = [...fixture.nativeElement.querySelectorAll('h2')].map((title: Element) => title.textContent?.trim());
    expect(titles).toEqual(['Favorites', 'Newly added']);
  });

  it('renders representative campaign content and a new indicator', () => {
    expect(fixture.nativeElement.textContent).toContain('The Elder Scrolls Online');
    expect(fixture.nativeElement.querySelector('.indicator.new')?.textContent?.trim()).toBe('New');
  });

  it('shows no favorite badge, and marks only a newly added favorite as new', () => {
    const favoriteSection = fixture.nativeElement.querySelectorAll('.drop-section')[0] as HTMLElement;
    const favoriteRows = [...favoriteSection.querySelectorAll('.drop-row')];
    const regularFavorite = favoriteRows[0] as HTMLElement;
    const newlyAddedFavorite = favoriteRows[1] as HTMLElement;

    expect(favoriteRows).toHaveLength(2);
    expect(regularFavorite.textContent).toContain('The Elder Scrolls Online');
    expect(newlyAddedFavorite.textContent).toContain('Sea of Thieves');
    expect(regularFavorite?.querySelector('.indicator')).toBeFalsy();
    expect(newlyAddedFavorite?.querySelector('.indicator')?.textContent?.trim()).toBe('New');
  });

  it('connects every section to a valid heading ID', () => {
    const sections = [...fixture.nativeElement.querySelectorAll('section')];
    for (const section of sections) {
      const headingId = section.getAttribute('aria-labelledby');
      expect(headingId).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`#${headingId}`)?.textContent).toBeTruthy();
    }
  });

  it('shows an empty message for sections without campaigns', () => {
    fixture.componentRef.setInput('sections', [{ title: 'Favorites', countLabel: '0 active', items: [] }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('No favorites right now');
  });
});
