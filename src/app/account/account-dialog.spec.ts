import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDialogComponent } from './account-dialog';
import { AuthService } from './auth.service';

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
});
