import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropListComponent } from './drop-list';
import { DropListSection } from '../shell-data';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;

  const sections: readonly DropListSection[] = [
    {
      title: 'Favorites',
      countLabel: '1 active',
      items: [{ game: 'The Elder Scrolls Online', campaign: 'Crown Crate drops', indicator: 'Favorite', indicatorKind: 'favorite' }],
    },
    {
      title: 'Newly added',
      countLabel: '1 game',
      items: [{ game: 'Rust', campaign: 'Twitch Rivals collection', indicator: 'New', indicatorKind: 'new' }],
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
