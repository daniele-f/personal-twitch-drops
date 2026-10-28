import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { AccountDialogComponent } from './account-dialog';
import { AuthService } from './auth.service';
import { TrackerSyncService } from './tracker-sync.service';

type AccountDialogTestApi = {
  mode: WritableSignal<'sign-in' | 'sign-up' | 'request-reset'>;
  email: WritableSignal<string>;
  password: WritableSignal<string>;
  submit(): Promise<void>;
};

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
        useValue: {},
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

  it('opens with sign-in fields that password managers can autofill', () => {
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
        useValue: {},
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    const signIn = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Sign in') as HTMLButtonElement;
    const password = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;

    expect([...fixture.nativeElement.querySelectorAll('[role="tab"]')].map((tab: HTMLElement) => tab.textContent?.trim())).toEqual(['Sign in', 'Create account']);
    expect(signIn.getAttribute('aria-selected')).toBe('true');
    expect(password.autocomplete).toBe('current-password');
  });

  it('closes after a successful sign-in', async () => {
    const signIn = vi.fn().mockResolvedValue({ outcome: 'signed-in' });
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          user: signal(null),
          status: signal('guest'),
          error: signal(null),
          signIn,
        },
      }, {
        provide: TrackerSyncService,
        useValue: {},
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => { closed = true; });
    const component = fixture.componentInstance as unknown as AccountDialogTestApi;
    component.mode.set('sign-in');
    component.email.set('person@example.com');
    component.password.set('password123');

    await component.submit();

    expect(signIn).toHaveBeenCalledWith('person@example.com', 'password123');
    expect(closed).toBe(true);
  });

  it('starts Twitch sign-in from the guest account dialog', async () => {
    const signInWithTwitch = vi.fn().mockResolvedValue({ outcome: 'redirect-started' });
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          user: signal(null),
          status: signal('guest'),
          error: signal(null),
          signInWithTwitch,
        },
      }, {
        provide: TrackerSyncService,
        useValue: {},
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    const twitchButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Continue with Twitch') as HTMLButtonElement;
    twitchButton.click();
    await fixture.whenStable();

    expect(signInWithTwitch).toHaveBeenCalledOnce();
  });

  it('starts Twitch identity linking from an authenticated account dialog', async () => {
    const linkTwitchIdentity = vi.fn().mockResolvedValue({ outcome: 'redirect-started' });
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          user: signal({ id: 'user-123', email: 'viewer@example.test' }),
          status: signal('authenticated'),
          error: signal(null),
          linkTwitchIdentity,
        },
      }, {
        provide: TrackerSyncService,
        useValue: { summary: signal(null), status: signal('idle') },
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    const linkButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Link Twitch account') as HTMLButtonElement;
    linkButton.click();
    await fixture.whenStable();

    expect(linkTwitchIdentity).toHaveBeenCalledOnce();
  });

  it('does not render a null email for an OAuth account', () => {
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          user: signal({ id: 'user-123', email: null }),
          status: signal('authenticated'),
          error: signal(null),
        },
      }, {
        provide: TrackerSyncService,
        useValue: { summary: signal(null), status: signal('idle') },
      }],
    });
    const fixture = TestBed.createComponent(AccountDialogComponent);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Signed in.');
    expect(fixture.nativeElement.textContent).not.toContain('null');
  });

});
