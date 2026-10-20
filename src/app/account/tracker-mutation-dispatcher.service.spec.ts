import { TestBed } from '@angular/core/testing';
import { TrackerMutationDispatcherService } from './tracker-mutation-dispatcher.service';

describe('TrackerMutationDispatcherService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('records direct mutations in their original order', () => {
    const dispatcher = TestBed.inject(TrackerMutationDispatcherService);
    dispatcher.record({ type: 'favorite', gameId: '/game/sea-of-thieves', gameName: 'Sea of Thieves' });
    dispatcher.record({ type: 'ignore', gameId: '/game/valorant', gameName: 'VALORANT' });

    expect(dispatcher.mutations().map((mutation) => mutation.type)).toEqual(['favorite', 'ignore']);
  });
});
