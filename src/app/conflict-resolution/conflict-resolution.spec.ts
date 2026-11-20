import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictResolutionComponent } from './conflict-resolution';

describe('ConflictResolutionComponent', () => {
  let fixture: ComponentFixture<ConflictResolutionComponent>;
  beforeEach(async () => { await TestBed.configureTestingModule({ imports: [ConflictResolutionComponent] }).compileComponents(); fixture = TestBed.createComponent(ConflictResolutionComponent); fixture.componentRef.setInput('conflicts', [{ id: '/game/sea', gameName: 'Sea', blacklistedAt: '2026-09-21T00:00:00.000Z' }]); fixture.detectChanges(); });
  it('uses a native modal and requires a conflict-resolution action before dismissal', () => {
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.open).toBe(true);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });
});
