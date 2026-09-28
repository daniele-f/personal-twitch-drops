import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { appConfig } from './app.config';
import { DropsProvider } from './drops/drops-provider';
import { PREFERENCES_STORAGE } from './preferences/preferences-storage';

describe('App layout', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ...appConfig.providers,
        { provide: PREFERENCES_STORAGE, useValue: localStorage },
        { provide: DropsProvider, useValue: { loadActiveDrops: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('keeps overlay panels fixed below the header with internal scrolling on desktop only', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const componentStyles = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
      .join('');
    expect(componentStyles).toMatch(/@media \(min-width: 521px\)[\s\S]*?\.changes-popover[^}]*position: fixed[^}]*top: 4\.5rem[^}]*max-height: calc\(100dvh - 5\.5rem\)[^}]*overflow-y: auto/);
    expect(componentStyles).toMatch(/@media \(min-width: 521px\)[\s\S]*?\.debug-menu[^}]*position: fixed[^}]*top: 4\.5rem[^}]*max-height: calc\(100dvh - 5\.5rem\)[^}]*overflow-y: auto/);
    expect(componentStyles).not.toMatch(/@media \(max-width: 520px\)[\s\S]*?\.changes-popover[^}]*position: fixed/);
  });
});
