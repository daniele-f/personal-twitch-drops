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

  it('opens navigation and closes on an action or outside click', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.navigation-toggle') as HTMLButtonElement;
    const nav = fixture.nativeElement.querySelector('#header-actions') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(nav.classList.contains('header-actions--open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    nav.querySelector<HTMLButtonElement>('.changes-button')!.click();
    fixture.detectChanges();
    expect(nav.classList.contains('header-actions--open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.changes-popover')).toBeTruthy();
    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.changes-popover')).toBeFalsy();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes navigation on Escape and restores focus to its toggle', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.navigation-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes on an outside press even when the target stops click propagation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.navigation-toggle') as HTMLButtonElement;
    const outside = document.createElement('button');
    outside.addEventListener('click', (event) => event.stopPropagation());
    document.body.append(outside);
    try {
      toggle.click();
      fixture.detectChanges();
      toggle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      fixture.nativeElement.querySelector('#header-actions').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      outside.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    } finally {
      outside.remove();
    }
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
