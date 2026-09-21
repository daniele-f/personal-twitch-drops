import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ACTIVE_DROPS_FIXTURE } from '../../test/fixtures/twitchdrops-active.fixture';
import { TwitchDropsAppProvider } from './twitch-drops-app.provider';

describe('TwitchDropsAppProvider', () => {
  let httpTesting: HttpTestingController;
  let provider: TwitchDropsAppProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TwitchDropsAppProvider],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    provider = TestBed.inject(TwitchDropsAppProvider);
  });

  afterEach(() => httpTesting.verify());

  it('normalizes valid source cards and ignores incomplete cards', () => {
    let result: unknown;

    provider.loadActiveDrops().subscribe((drops) => (result = drops));
    httpTesting.expectOne('https://twitchdrops.app/').flush(ACTIVE_DROPS_FIXTURE);

    expect(result).toEqual([
      {
        id: '/game/sea-of-thieves',
        gameName: 'Sea of Thieves',
        rewardCount: 8,
        endsAt: '2026-09-28T12:00:00.000Z',
        imageUrl: 'https://cdn.example.test/sea.png',
      },
      {
        id: '/game/no-image',
        gameName: 'No Image Game',
        rewardCount: 1,
        endsAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
  });

  it('passes source request errors to the caller', () => {
    let receivedError: unknown;

    provider.loadActiveDrops().subscribe({ error: (error: unknown) => (receivedError = error) });
    httpTesting.expectOne('https://twitchdrops.app/').flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError).toBeTruthy();
  });
});
