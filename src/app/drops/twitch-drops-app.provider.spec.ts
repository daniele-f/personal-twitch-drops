import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ACTIVE_DROPS_FIXTURE, DROP_DETAILS_FIXTURE } from '../../test/fixtures/twitchdrops-active.fixture';
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
        rewards: ['Coral Crown'],
        rewardImages: ['https://cdn.example.test/coral-crown.png'],
        publisher: 'Rare',
        watchDuration: '1h–4h watch',
        endsAt: '2026-09-28T12:00:00.000Z',
        imageUrl: 'https://cdn.example.test/sea.png',
      },
      {
        id: '/game/no-image',
        gameName: 'No Image Game',
        rewardCount: 1,
        rewards: [],
        endsAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
  });

  it('orders campaigns by their end datetime when the source cards are out of order', () => {
    let result: unknown;

    provider.loadActiveDrops().subscribe((drops) => (result = drops));
    httpTesting.expectOne('https://twitchdrops.app/').flush(`
      <main class="games-grid">
        <a class="game-card" href="/game/later" data-game="later" data-drops="1" data-end="2026-10-02T12:00:00.000Z"></a>
        <a class="game-card" href="/game/earlier" data-game="earlier" data-drops="1" data-end="2026-09-29T12:00:00.000Z"></a>
      </main>
    `);

    expect(result).toEqual([
      { id: '/game/earlier', gameName: 'Earlier', rewardCount: 1, rewards: [], endsAt: '2026-09-29T12:00:00.000Z' },
      { id: '/game/later', gameName: 'Later', rewardCount: 1, rewards: [], endsAt: '2026-10-02T12:00:00.000Z' },
    ]);
  });

  it('normalizes subscription requirements and badge rewards from a game detail page', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/elden-ring').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/elden-ring').flush(DROP_DETAILS_FIXTURE);

    expect(result).toEqual({
      requirementByReward: { 'Sorcerer Rogier': '1 sub' },
      badgeRewardNames: ['Sorcerer Rogier'],
      detailsUrl: 'https://twitchdrops.app/game/elden-ring',
    });
  });

  it('normalizes Steam, details, and eligible-stream links from a game detail page', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/escape-from-tarkov-arena').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/escape-from-tarkov-arena').flush(`
      <main>
        <a href="https://store.steampowered.com/app/3931680/Escape_from_Tarkov_Arena/">Steam</a>
        <a href="https://www.escapefromtarkov.com/">Official website</a>
        <p>Watch an eligible stream — <a href="https://www.twitch.tv/directory/category/escape-from-tarkov-arena">Escape from Tarkov: Arena stream on Twitch</a></p>
      </main>
    `);

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/3931680/Escape_from_Tarkov_Arena/' },
      detailsUrl: 'https://twitchdrops.app/game/escape-from-tarkov-arena',
      streamersUrl: 'https://www.twitch.tv/directory/category/escape-from-tarkov-arena',
    });
  });

  it('uses an official website when a game detail page has no Steam link', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush(`
      <main><a href="https://example-game.test/">Official website</a></main>
    `);

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      primaryLink: { label: 'Official website', url: 'https://example-game.test/' },
      detailsUrl: 'https://twitchdrops.app/game/example-game',
    });
  });

  it('does not treat a lookalike host as a Twitch stream directory', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush(`
      <main><a href="https://eviltwitch.tv/directory/category/example-game">Watch a stream</a></main>
    `);

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/example-game',
    });
  });

  it('omits a details link when a source game id resolves outside the Twitch Drops game pages', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string): Observable<unknown> };

    detailsProvider.loadDropDetails('//phish.example/game/example-game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app//phish.example/game/example-game').flush('<main></main>');

    expect(result).toEqual({ requirementByReward: {}, badgeRewardNames: [] });
  });

  it('uses the Steam app ID from an exact Wikidata game match', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush('<main></main>');
    httpTesting.expectOne((request) =>
      request.url === 'https://www.wikidata.org/w/api.php' &&
      request.params.get('action') === 'wbsearchentities' &&
      request.params.get('search') === 'Example Game' &&
      request.params.get('origin') === '*',
    ).flush({ search: [{ id: 'Q123', label: 'Example Game' }] });
    httpTesting.expectOne((request) =>
      request.url === 'https://www.wikidata.org/w/api.php' &&
      request.params.get('action') === 'wbgetentities' &&
      request.params.get('ids') === 'Q123' &&
      request.params.get('props') === 'claims',
    ).flush({
      entities: {
        Q123: { claims: { P1733: [{ mainsnak: { datavalue: { value: '123456' } } }] } },
      },
    });

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/example-game',
      primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/123456/' },
    });
  });

  it('uses the official website from an exact Wikidata game match without a Steam app ID', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush('<main></main>');
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game')
      .flush({ search: [{ id: 'Q123', label: 'Example Game' }] });
    httpTesting.expectOne((request) => request.params.get('action') === 'wbgetentities' && request.params.get('ids') === 'Q123')
      .flush({
        entities: {
          Q123: { claims: { P856: [{ mainsnak: { datavalue: { value: 'https://example-game.test/' } } }] } },
        },
      });

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/example-game',
      primaryLink: { label: 'Official website', url: 'https://example-game.test/' },
    });
  });

  it('reuses an in-session Wikidata lookup for the same game name', () => {
    const results: unknown[] = [];
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => results.push(details));
    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => results.push(details));
    const detailRequests = httpTesting.match('https://twitchdrops.app/game/example-game');
    expect(detailRequests).toHaveLength(2);
    detailRequests.forEach((request) => request.flush('<main></main>'));

    const searchRequests = httpTesting.match((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game');
    expect(searchRequests).toHaveLength(1);
    searchRequests[0].flush({ search: [{ id: 'Q123', label: 'Example Game' }] });
    const entityRequests = httpTesting.match((request) => request.params.get('action') === 'wbgetentities' && request.params.get('ids') === 'Q123');
    expect(entityRequests).toHaveLength(1);
    entityRequests[0].flush({
      entities: {
        Q123: { claims: { P1733: [{ mainsnak: { datavalue: { value: '123456' } } }] } },
      },
    });

    expect(results).toEqual([
      { requirementByReward: {}, badgeRewardNames: [], detailsUrl: 'https://twitchdrops.app/game/example-game', primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/123456/' } },
      { requirementByReward: {}, badgeRewardNames: [], detailsUrl: 'https://twitchdrops.app/game/example-game', primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/123456/' } },
    ]);
  });

  it('does not use a similarly named Wikidata game result', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush('<main></main>');
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game')
      .flush({ search: [{ id: 'Q999', label: 'Example Game 2' }] });

    httpTesting.expectNone((request) => request.params.get('action') === 'wbgetentities');
    expect(result).toEqual({ requirementByReward: {}, badgeRewardNames: [], detailsUrl: 'https://twitchdrops.app/game/example-game' });
  });

  it('does not use an ambiguous exact Wikidata game match', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush('<main></main>');
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game')
      .flush({ search: [{ id: 'Q123', label: 'Example Game' }, { id: 'Q456', label: 'Example Game' }] });

    httpTesting.expectNone((request) => request.params.get('action') === 'wbgetentities');
    expect(result).toEqual({ requirementByReward: {}, badgeRewardNames: [], detailsUrl: 'https://twitchdrops.app/game/example-game' });
  });

  it('uses the sole video-game result among exact Wikidata title matches', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/world-of-warcraft', 'World of Warcraft').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/world-of-warcraft').flush('<main></main>');
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'World of Warcraft')
      .flush({ search: [
        { id: 'QGAME', label: 'World of Warcraft', description: '2004 video game by Blizzard Entertainment' },
        { id: 'QBOOK', label: 'World of Warcraft', description: 'book series' },
      ] });
    httpTesting.expectOne((request) => request.params.get('action') === 'wbgetentities' && request.params.get('ids') === 'QGAME')
      .flush({
        entities: {
          QGAME: { claims: { P856: [{ mainsnak: { datavalue: { value: 'https://worldofwarcraft.blizzard.com/en-us/' } } }] } },
        },
      });

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/world-of-warcraft',
      primaryLink: { label: 'Official website', url: 'https://worldofwarcraft.blizzard.com/en-us/' },
    });
  });

  it('keeps a source Steam link when the Wikidata lookup fails', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush(`
      <main><a href="https://store.steampowered.com/app/999999/Example_Game/">Steam</a></main>
    `);
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game')
      .flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/example-game',
      primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/999999/Example_Game/' },
    });
  });

  it('uses a later valid Steam app ID when an earlier Wikidata claim is malformed', () => {
    let result: unknown;
    const detailsProvider = provider as unknown as { loadDropDetails(id: string, gameName: string): Observable<unknown> };

    detailsProvider.loadDropDetails('/game/example-game', 'Example Game').subscribe((details) => (result = details));
    httpTesting.expectOne('https://twitchdrops.app/game/example-game').flush('<main></main>');
    httpTesting.expectOne((request) => request.params.get('action') === 'wbsearchentities' && request.params.get('search') === 'Example Game')
      .flush({ search: [{ id: 'Q123', label: 'Example Game' }] });
    httpTesting.expectOne((request) => request.params.get('action') === 'wbgetentities' && request.params.get('ids') === 'Q123')
      .flush({
        entities: {
          Q123: { claims: { P1733: [
            { mainsnak: { datavalue: { value: 'not-an-app-id' } } },
            { mainsnak: { datavalue: { value: '123456' } } },
          ] } },
        },
      });

    expect(result).toEqual({
      requirementByReward: {},
      badgeRewardNames: [],
      detailsUrl: 'https://twitchdrops.app/game/example-game',
      primaryLink: { label: 'Steam', url: 'https://store.steampowered.com/app/123456/' },
    });
  });

  it('passes source request errors to the caller', () => {
    let receivedError: unknown;

    provider.loadActiveDrops().subscribe({ error: (error: unknown) => (receivedError = error) });
    httpTesting.expectOne('https://twitchdrops.app/').flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError).toBeTruthy();
  });

  it('rejects an unexpected source document instead of treating it as empty Drops', () => {
    let receivedError: unknown;

    provider.loadActiveDrops().subscribe({ error: (error: unknown) => (receivedError = error) });
    httpTesting.expectOne('https://twitchdrops.app/').flush('<main><p>Maintenance</p></main>');

    expect(receivedError).toBeTruthy();
  });
});
