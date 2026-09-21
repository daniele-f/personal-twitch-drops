import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ActiveDrop } from './drops/active-drop';
import { DropsProvider } from './drops/drops-provider';
import { App } from './app';

class TestDropsProvider extends DropsProvider {
  readonly requests: Subject<readonly ActiveDrop[]>[] = [];

  loadActiveDrops(): Subject<readonly ActiveDrop[]> {
    const request = new Subject<readonly ActiveDrop[]>();
    this.requests.push(request);
    return request;
  }
}

describe('App', () => {
  let provider: TestDropsProvider;

  beforeEach(async () => {
    provider = new TestDropsProvider();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: DropsProvider, useValue: provider }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the active drops heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Active Drops');
  });

  it('keeps the wordmark within the deployed application base path', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.wordmark')?.getAttribute('href')).toBe('./');
  });

  it('shows skeletons before the initial request completes', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(provider.requests).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
  });

  it('renders live Drops after a successful request', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    provider.requests[0].next([
      { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 8, endsAt: '2026-09-28T12:00:00.000Z' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 active Drop');
    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
  });

  it('shows a retryable failure and reloads after Retry', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    provider.requests[0].error(new Error('offline'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("We couldn't load active Drops right now.");
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.retry')?.click();
    fixture.detectChanges();

    expect(provider.requests).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
  });

  it('ignores a superseded request that completes after the latest request fails', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.refresh')?.click();
    fixture.detectChanges();

    provider.requests[1].error(new Error('offline'));
    provider.requests[0].next([
      { id: '/game/stale', gameName: 'Stale Game', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("We couldn't load active Drops right now.");
    expect(fixture.nativeElement.textContent).not.toContain('Stale Game');
  });
});
