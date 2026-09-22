import { TestBed } from '@angular/core/testing';
import { ActiveDrop } from '../drops/active-drop';
import { ChangesStateService } from './changes-state.service';

const first: ActiveDrop = { id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 1, rewards: ['Atlas'], endsAt: '2026-09-23T00:00:00.000Z' };
const second: ActiveDrop = { id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 1, rewards: ['Nebula'], endsAt: '2026-09-23T00:00:00.000Z' };

describe('ChangesStateService', () => {
  it('does not mark the first loaded snapshot as new', () => {
    const service = TestBed.inject(ChangesStateService);

    service.updateDrops([first]);

    expect(service.changes()).toEqual([]);
  });

  it('keeps the latest comparison after a subsequent load', () => {
    const service = TestBed.inject(ChangesStateService);

    service.updateDrops([first]);
    service.updateDrops([second]);

    expect(service.changes()).toEqual([{ type: 'updated', drop: second, addedRewards: ['Nebula'], removedRewards: ['Atlas'] }]);
  });

  it('seeds a comparison for developer scenarios', () => {
    const service = TestBed.inject(ChangesStateService);

    const changes = service.seed([first], [second]);

    expect(service.drops()).toEqual([second]);
    expect(changes).toEqual([{ type: 'updated', drop: second, addedRewards: ['Nebula'], removedRewards: ['Atlas'] }]);
  });

  it('returns an empty change list when a developer scenario is cleared', () => {
    const service = TestBed.inject(ChangesStateService);
    service.seed([first], [second]);

    expect(service.clear()).toEqual([]);
  });
});
