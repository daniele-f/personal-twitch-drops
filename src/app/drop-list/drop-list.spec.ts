import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveDrop } from '../drops/active-drop';
import { DropListComponent } from './drop-list';

describe('DropListComponent', () => {
  let fixture: ComponentFixture<DropListComponent>;

  const drops: readonly ActiveDrop[] = [
    {
      id: '/game/sea-of-thieves',
      gameName: 'Sea of Thieves',
      rewardCount: 8,
      endsAt: '2026-09-28T12:00:00.000Z',
      imageUrl: 'https://cdn.example.test/sea.png',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DropListComponent] }).compileComponents();
    fixture = TestBed.createComponent(DropListComponent);
  });

  it('renders a normalized Drop with its image and summary', () => {
    fixture.componentRef.setInput('drops', drops);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
    expect(fixture.nativeElement.textContent).toContain('8 rewards · Ends Sep 28');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.test/sea.png');
  });

  it('shows four decorative skeleton rows while Drops are loading', () => {
    fixture.componentRef.setInput('drops', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Loading active Drops');
    expect(fixture.nativeElement.textContent).not.toContain('Sea of Thieves');
  });

  it('uses the visual cover fallback when a Drop has no image', () => {
    fixture.componentRef.setInput('drops', [{ ...drops[0], imageUrl: undefined }]);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.cover-placeholder')).toBeTruthy();
  });
});
