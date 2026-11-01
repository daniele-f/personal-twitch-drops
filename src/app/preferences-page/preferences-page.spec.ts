import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from '../drops/drops-provider';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesPageComponent } from './preferences-page';
import { AuthService } from '../account/auth.service';

describe('PreferencesPageComponent', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('does not advertise or expose browser-to-browser transfer controls', async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [
        provideRouter([]),
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    const controls = [...fixture.nativeElement.querySelectorAll('button, input, textarea')]
      .map((element: HTMLElement) => `${element.getAttribute('aria-label') ?? ''} ${element.textContent ?? ''}`.trim());

    expect(text).not.toContain('share them with a simple code');
    expect(controls.join(' ')).not.toMatch(/import|export|share code/i);
  });

  it('shows linked Twitch status in the account section before preference lists', async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [
        provideRouter([]),
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'viewer@example.test' }), identities: signal([{ provider: 'email', identityId: 'email-1' }, { provider: 'twitch', identityId: 'twitch-1' }]), error: signal(null) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Account');
    expect(text).toContain('Twitch linked');
    expect(text.indexOf('Account')).toBeLessThan(text.indexOf('Favorites List'));
  });

  it('opens a modal and validates matching passwords before updating, then closes and clears it', async () => {
    const updatePassword = vi.fn().mockResolvedValue({ outcome: 'password-updated' });
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: PREFERENCES_STORAGE, useValue: localStorage },
      { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
      { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'viewer@example.test' }), identities: signal([{ provider: 'email', identityId: 'email-1' }]), error: signal(null), updatePassword } },
    ] });
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    // jsdom does not implement native dialog lifecycle methods.
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    dialog.showModal = showModal;
    dialog.close = close;
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((element) => (element as HTMLButtonElement).textContent?.trim() === 'Change password') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(showModal).toHaveBeenCalledOnce();
    const inputs = [...dialog.querySelectorAll('input')];
    for (const [index, value] of ['current-secret', 'new-secret-123', 'different-secret'].entries()) {
      inputs[index].value = value;
      inputs[index].dispatchEvent(new Event('input'));
    }
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('matching');
    inputs[2].value = 'new-secret-123';
    inputs[2].dispatchEvent(new Event('input'));
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(updatePassword).toHaveBeenCalledWith('new-secret-123', 'current-secret');
    expect(close).toHaveBeenCalledOnce();
    expect(inputs.map((input) => input.value)).toEqual(['', '', '']);
  });
});
