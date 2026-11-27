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

  it('reports a rename for the same game ID even when rewards are unchanged', () => {
    const today: ActiveDrop = { ...yesterday, gameName: "No Man's Sky: Worlds" };

    expect(detectChanges([yesterday], [today])).toEqual([
      { type: 'renamed', drop: today, previousGameName: yesterday.gameName },
    ]);
    expect(detectChanges([today], [today])).toEqual([]);
  });

  it('reports both a rename and a reward change when they occur together', () => {
    const today: ActiveDrop = { ...yesterday, gameName: "No Man's Sky: Worlds", rewards: ['Nebula'] };

    expect(detectChanges([yesterday], [today])).toEqual([
      { type: 'renamed', drop: today, previousGameName: yesterday.gameName },
      { type: 'updated', drop: today, addedRewards: ['Nebula'], removedRewards: yesterday.rewards },
    ]);
  });

  it('does not infer a rename when the source game ID changes', () => {
    const today: ActiveDrop = { ...yesterday, id: '/game/other-game', gameName: 'Other Game' };

    expect(detectChanges([yesterday], [today]).map((change) => change.type)).toEqual(['new', 'ended']);
  });

  it('reports newly active and ended games', () => {
    const newGame: ActiveDrop = { id: '/game/arc-raiders', gameName: 'Arc Raiders', rewardCount: 1, endsAt: '2026-09-24T00:00:00.000Z', rewards: ['Raider pack'] };

    expect(detectChanges([yesterday], [newGame])).toEqual([
      { type: 'new', drop: newGame },
      { type: 'ended', drop: yesterday },
    ]);
  });
});
