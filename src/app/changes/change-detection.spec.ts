import { ActiveDrop } from '../drops/active-drop';
import { detectChanges } from './change-detection';

const yesterday: ActiveDrop = {
  id: '/game/no-mans-sky', gameName: 'No Man\'s Sky', rewardCount: 5, endsAt: '2026-09-23T00:00:00.000Z', rewards: ['Atlas', 'Cosmic', 'Explorer', 'Fleet', 'Galaxy'],
};

describe('detectChanges', () => {
  it('reports an updated game when its reward set changes without changing the count', () => {
    const today: ActiveDrop = { ...yesterday, rewards: ['Atlas', 'Cosmic', 'Explorer', 'Fleet', 'Nebula'] };

    expect(detectChanges([yesterday], [today])).toEqual([
      { type: 'updated', drop: today, addedRewards: ['Nebula'], removedRewards: ['Galaxy'] },
    ]);
  });

  it('reports newly active and ended games', () => {
    const newGame: ActiveDrop = { id: '/game/arc-raiders', gameName: 'Arc Raiders', rewardCount: 1, endsAt: '2026-09-24T00:00:00.000Z', rewards: ['Raider pack'] };

    expect(detectChanges([yesterday], [newGame])).toEqual([
      { type: 'new', drop: newGame },
      { type: 'ended', drop: yesterday },
    ]);
  });
});
