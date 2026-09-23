import { TestBed } from '@angular/core/testing';
import { ActiveDrop } from '../drops/active-drop';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { ChangesStateService } from './changes-state.service';

const first: ActiveDrop = { id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 1, rewards: ['Atlas'], endsAt: '2026-09-23T00:00:00.000Z' };
const second: ActiveDrop = { id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 1, rewards: ['Nebula'], endsAt: '2026-09-23T00:00:00.000Z' };
const third: ActiveDrop = { id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 2, rewards: ['Nebula', 'Starship'], endsAt: '2026-09-23T00:00:00.000Z' };

const SNAPSHOTS_STORAGE_KEY = 'personal-twitch-drops.daily-snapshots.v1';

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('ChangesStateService', () => {
  function configure(storage: Storage | null): ChangesStateService {
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: storage }] });
    return TestBed.inject(ChangesStateService);
  }

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('does not mark the first loaded snapshot as new', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const service = configure(createStorage());

    service.updateDrops([first]);

    expect(service.changes()).toEqual([]);
  });

  it('compares a new day with the final snapshot from the previous day', () => {
    const storage = createStorage();
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    configure(storage).updateDrops([first]);

    TestBed.resetTestingModule();
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const service = configure(storage);
    service.updateDrops([second]);

    expect(service.changes()).toEqual([{ type: 'updated', drop: second, addedRewards: ['Nebula'], removedRewards: ['Atlas'] }]);
  });

  it('keeps comparing with yesterday after same-day reloads while updating today', () => {
    const storage = createStorage();
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    configure(storage).updateDrops([first]);

    TestBed.resetTestingModule();
    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    configure(storage).updateDrops([second]);

    TestBed.resetTestingModule();
    vi.setSystemTime(new Date('2026-09-23T18:00:00'));
    const reloaded = configure(storage);
    reloaded.updateDrops([third]);

    expect(reloaded.changes()).toEqual([{ type: 'updated', drop: third, addedRewards: ['Nebula', 'Starship'], removedRewards: ['Atlas'] }]);

    TestBed.resetTestingModule();
    vi.setSystemTime(new Date('2026-09-24T09:00:00'));
    const tomorrow = configure(storage);
    tomorrow.updateDrops([third]);

    expect(tomorrow.changes()).toEqual([]);
  });

  it('stores the latest successful load as today\'s rolling snapshot', () => {
    const storage = createStorage();
    vi.setSystemTime(new Date('2026-09-23T09:00:00'));
    const service = configure(storage);

    service.updateDrops([first]);
    service.updateDrops([second]);

    expect(JSON.parse(storage.getItem(SNAPSHOTS_STORAGE_KEY) ?? '')).toEqual({
      baseline: null,
      current: { date: '2026-09-23', drops: [second] },
    });
  });

  it('ignores malformed saved snapshots', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const service = configure(createStorage({ [SNAPSHOTS_STORAGE_KEY]: '{"current":"broken"}' }));

    service.updateDrops([first]);

    expect(service.changes()).toEqual([]);
  });

  it('keeps session-only snapshots when browser storage is unavailable', () => {
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    const service = configure(null);
    service.updateDrops([first]);

    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    service.updateDrops([second]);

    expect(service.changes()).toEqual([{ type: 'updated', drop: second, addedRewards: ['Nebula'], removedRewards: ['Atlas'] }]);
  });

  it('prefers fresher session snapshots after browser storage rejects a write', () => {
    const storage = createStorage({
      [SNAPSHOTS_STORAGE_KEY]: JSON.stringify({ baseline: null, current: { date: '2026-09-21', drops: [first] } }),
    });
    storage.setItem = () => { throw new Error('Storage quota exceeded'); };
    const service = configure(storage);

    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    service.updateDrops([second]);
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    service.updateDrops([third]);

    expect(service.changes()).toEqual([{ type: 'updated', drop: third, addedRewards: ['Starship'], removedRewards: [] }]);
  });

  it('seeds a comparison for developer scenarios', () => {
    const service = configure(createStorage());

    const changes = service.seed([first], [second]);

    expect(service.drops()).toEqual([second]);
    expect(changes).toEqual([{ type: 'updated', drop: second, addedRewards: ['Nebula'], removedRewards: ['Atlas'] }]);
  });

  it('returns an empty change list when a developer scenario is cleared', () => {
    const service = configure(createStorage());
    service.seed([first], [second]);

    expect(service.clear()).toEqual([]);
  });
});
