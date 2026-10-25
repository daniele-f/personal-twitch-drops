import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DropsProvider } from '../drops/drops-provider';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesPageComponent } from './preferences-page';

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
});
