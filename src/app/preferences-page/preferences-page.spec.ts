import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from '../drops/drops-provider';
import { FAVORITE_IDS_STORAGE_KEY, FAVORITE_NAMES_STORAGE_KEY, PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesPageComponent } from './preferences-page';
import { AuthService } from '../account/auth.service';
import { routes } from '../app.routes';

describe('PreferencesPageComponent', () => {
  function configure(): void {
    TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [provideRouter(routes), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } }],
    });
  }
  afterEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });

  it('renders Manage games as the default Settings section with list search and filters', async () => {
    configure(); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent); fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Settings');
    expect(page.textContent).toContain('Back to drops');
    expect(page.textContent).toContain('Manage games');
    expect(page.textContent).toContain('Hidden');
    expect(page.querySelector<HTMLInputElement>('input[placeholder="Search favorite games"]')).not.toBeNull();
    expect(page.querySelector<HTMLButtonElement>('[aria-label="Show game filters"]')).not.toBeNull();
  });

  it('switches from Favorites to Hidden and explains the active list', async () => {
    configure(); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent); fixture.detectChanges();
    const hidden = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((button) => button.textContent?.includes('Hidden'))!;
    hidden.click(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hidden games are excluded from your drop feed.');
    expect(fixture.nativeElement.querySelector('[aria-label="Hidden games"]')).toBeNull();
  });

  it('keeps fuzzy search and status filtering available for favorite games', async () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify(['favorite-active', 'favorite-inactive']));
    localStorage.setItem(FAVORITE_NAMES_STORAGE_KEY, JSON.stringify({ 'favorite-active': 'Hades II', 'favorite-inactive': 'Celeste' }));
    TestBed.configureTestingModule({ imports: [PreferencesPageComponent], providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([{ id: 'favorite-active', gameName: 'Hades II', rewardCount: 1, endsAt: '2026-12-01T00:00:00.000Z' }]) } }] }); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(PreferencesPageComponent); fixture.detectChanges(); const page = fixture.nativeElement as HTMLElement;
    const search = page.querySelector<HTMLInputElement>('[aria-label="Search favorites"]')!; search.value = 'hds'; search.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(page.querySelectorAll('[data-favorite-id]')).toHaveLength(1);
    expect(page.querySelector('[data-favorite-id]')?.textContent).toContain('Active');
    page.querySelector<HTMLButtonElement>('[aria-label="Show game filters"]')!.click(); fixture.detectChanges();
    const filter = page.querySelector<HTMLSelectElement>('[aria-label="Filter favorites by status"]')!;
    filter.value = 'active'; filter.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(page.querySelector('[data-active-filter-indicator]')).not.toBeNull();
  });

  it('shows signed-in account controls on the Account route', async () => {
    TestBed.configureTestingModule({ imports: [PreferencesPageComponent], providers: [provideRouter(routes), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } }, { provide: AuthService, useValue: { user: signal({ id: 'user-1', email: 'viewer@example.test' }), identities: signal([{ provider: 'email', identityId: 'email-1' }, { provider: 'twitch', identityId: 'twitch-1' }]), error: signal(null) } }] }); await TestBed.compileComponents();
    await TestBed.inject(Router).navigateByUrl('/settings/account');
    const fixture = TestBed.createComponent(PreferencesPageComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Twitch linked');
    expect(fixture.nativeElement.textContent).toContain('viewer@example.test');
  });

  it('explains local storage and offers sign-in from the Account section to guests', async () => {
    configure(); await TestBed.compileComponents();
    await TestBed.inject(Router).navigateByUrl('/settings/account');
    const fixture = TestBed.createComponent(PreferencesPageComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Everything is stored locally on this device.');
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Sign in');
  });
});
