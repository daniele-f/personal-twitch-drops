import { TestBed } from '@angular/core/testing';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { TrackerMutationQueueService } from './tracker-mutation-queue.service';

function storage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => values.delete(key), setItem: (key, value) => values.set(key, value) };
}

describe('TrackerMutationQueueService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps a failed desired-state mutation for the linked account until acknowledged', () => {
    const localStorage = storage();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: localStorage }] });
    const queue = TestBed.inject(TrackerMutationQueueService);

    queue.enqueue('user-1', { type: 'ignore', gameId: '/game/sea-of-thieves', gameName: 'Sea of Thieves' });

    expect(queue.loadForAccount('user-1')).toMatchObject([{ sequence: 1, mutation: { type: 'ignore', gameId: '/game/sea-of-thieves' } }]);
    expect(queue.loadForAccount('user-2')).toEqual([]);
    queue.removeThrough('user-1', 1);
    expect(queue.loadForAccount('user-1')).toEqual([]);
  });

  it('can discard only one account\'s pre-link mutations', () => {
    const localStorage = storage();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: localStorage }] });
    const queue = TestBed.inject(TrackerMutationQueueService);
    queue.enqueue('user-1', { type: 'ignore', gameId: '/game/browser', gameName: 'Browser game' });
    queue.enqueue('user-2', { type: 'favorite', gameId: '/game/other', gameName: 'Other game' });

    queue.clearForAccount('user-1');

    expect(queue.loadForAccount('user-1')).toEqual([]);
    expect(queue.loadForAccount('user-2')).toHaveLength(1);
  });
});
