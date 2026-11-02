import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from '../drops/drops-provider';
import { BLACKLIST_ENTRIES_STORAGE_KEY, FAVORITE_IDS_STORAGE_KEY, FAVORITE_NAMES_STORAGE_KEY, PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesPageComponent } from './preferences-page';
import { AuthService } from '../account/auth.service';

describe('PreferencesPageComponent', () => {
  it('only offers email linking after identities confirm a Twitch-only account', () => {
    const identities = signal<{ provider: string; identityId: string }[] | null>(null);
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: PREFERENCES_STORAGE, useValue: localStorage },
      { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
      { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: null }), identities, error: signal(null) } },
    ] });
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeNull();
    identities.set([{ provider: 'twitch', identityId: 'twitch-1' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="email"]')).not.toBeNull();
    identities.set([{ provider: 'twitch', identityId: 'twitch-1' }, { provider: 'email', identityId: 'email-1' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeNull();
  });
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

  it('filters favorite and ignored lists by fuzzy game name and active status', async () => {
    const activeDrops = [
      { id: 'favorite-active', gameName: 'Hades II', rewardCount: 1, endsAt: '2026-12-01T00:00:00.000Z' },
      { id: 'ignored-active', gameName: "Baldur's Gate 3", rewardCount: 1, endsAt: '2026-12-01T00:00:00.000Z' },
    ];
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify(['favorite-active', 'favorite-inactive']));
    localStorage.setItem(FAVORITE_NAMES_STORAGE_KEY, JSON.stringify({ 'favorite-active': 'Hades II', 'favorite-inactive': 'Celeste' }));
    localStorage.setItem(BLACKLIST_ENTRIES_STORAGE_KEY, JSON.stringify([
      { id: 'ignored-active', gameName: "Baldur's Gate 3", blacklistedAt: '2026-11-01T00:00:00.000Z' },
      { id: 'ignored-inactive', gameName: 'League of Legends', blacklistedAt: '2026-11-01T00:00:00.000Z' },
    ]));
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [
        provideRouter([]),
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: DropsProvider, useValue: { loadActiveDrops: () => of(activeDrops) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    for (const button of page.querySelectorAll<HTMLButtonElement>('.app-disclosure')) button.click();
    fixture.detectChanges();

    const favoriteSearch = page.querySelector<HTMLInputElement>('[aria-label="Search favorites"]')!;
    favoriteSearch.value = 'hds';
    favoriteSearch.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-favorite-id]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-favorite-id]')?.textContent).toContain('Hades II');

    const ignoredStatus = page.querySelector<HTMLSelectElement>('[aria-label="Filter ignored games by status"]')!;
    ignoredStatus.value = 'inactive';
    ignoredStatus.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-blacklist-id]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-blacklist-id]')?.textContent).toContain('League of Legends');
  });

  it('keeps rows visible when a status filter is selected before activity status loads', async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [
        provideRouter([]),
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.componentInstance['preferences'].addFavorite('favorite-id', 'Favorite Game');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.app-disclosure')!.click();
    fixture.detectChanges();

    const statusFilter = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('[aria-label="Filter favorites by status"]')!;
    statusFilter.value = 'inactive';
    statusFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-favorite-id]')).toHaveLength(1);
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
    dialog.show = showModal;
    dialog.close = close;
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((element) => (element as HTMLButtonElement).textContent?.trim() === 'Change password') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog.querySelector('input[autocomplete="username"]')?.getAttribute('name')).toBe('username');
    const inputs = [...dialog.querySelectorAll<HTMLInputElement>('input[type="password"]')];
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
