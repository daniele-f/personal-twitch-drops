import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDialogComponent } from './account-dialog';
import { AuthService } from './auth.service';
import { TrackerSyncService } from './tracker-sync.service';

describe('AccountDialogComponent', () => {
  it('offers password recovery from the sign-in form', () => {
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          user: signal(null),
          status: signal('guest'),
          error: signal(null),
        },
      }, {
        provide: TrackerSyncService,
        useValue: { restoreAllIgnored: vi.fn() },
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    const signIn = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Sign in') as HTMLButtonElement;
    signIn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Forgot password?');
  });

  it('requires confirmation before restoring all ignored games', () => {
    const restoreAllIgnored = vi.fn(() => Promise.resolve({ status: 'synced' }));
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'person@example.com' }), status: signal('authenticated'), error: signal(null) } },
      {
        provide: TrackerSyncService,
        useValue: {
          restoreAllIgnored,
          chooseInitialSource: vi.fn(),
          retryPending: vi.fn(),
          summary: signal(null),
          reconciliation: signal(null),
          status: signal('idle'),
        },
      },
    ] });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    const restore = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent?.trim() === 'Restore all ignored games') as HTMLButtonElement;
    restore.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restore every ignored game on all linked devices?');
    expect(restoreAllIgnored).not.toHaveBeenCalled();
  });
});
