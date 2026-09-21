import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictResolutionComponent } from './conflict-resolution';

describe('ConflictResolutionComponent', () => {
  let fixture: ComponentFixture<ConflictResolutionComponent>;
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [ConflictResolutionComponent] }).compileComponents(); fixture = TestBed.createComponent(ConflictResolutionComponent); fixture.componentRef.setInput('conflicts', [{ id: '/game/sea', gameName: 'Sea', blacklistedAt: '2026-09-21T00:00:00.000Z' }]); fixture.detectChanges(); });
  it('moves keyboard focus into the dialog and keeps Tab within its actions', () => {
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.conflict-dialog button')];
    expect(document.activeElement).toBe(buttons[0]);
    buttons[1].focus();
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });
});
