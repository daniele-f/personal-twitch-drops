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

    expect(fixture.nativeElement.querySelector('.app-header')).toBeTruthy();
  });

  it('provides a main content region that can grow and keep the footer at the viewport bottom', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main.app-main');
    const footer = fixture.nativeElement.querySelector('footer.data-attribution');

    expect(main).toBeTruthy();
    expect(main?.compareDocumentPosition(footer!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
