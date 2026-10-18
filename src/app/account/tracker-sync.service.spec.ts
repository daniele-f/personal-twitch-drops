import { mergeTrackerSnapshots } from './tracker-sync.service';
import { LocalTrackerSnapshot } from './tracker-sync.models';

const local: LocalTrackerSnapshot = {
  settings: { themeColor: 'electric-blue', showSubscriptions: false, showBadges: false, updatedAt: '2026-10-18T12:00:00.000Z' },
  favorites: [{ gameId: '/game/local', gameName: 'Local game', updatedAt: '2026-10-18T12:00:00.000Z' }],
  ignoredGames: [{ gameId: '/game/ignored-local', gameName: 'Ignored local game', updatedAt: '2026-10-18T12:00:00.000Z' }],
  collectedRewards: [{ campaignId: '/campaign/local', rewardName: 'Local reward', updatedAt: '2026-10-18T12:00:00.000Z' }],
};

describe('mergeTrackerSnapshots', () => {
  it('unions tracker collections, chooses the newest settings, and excludes snapshots', () => {
    const merged = mergeTrackerSnapshots(local, {
      settings: { themeColor: 'emerald-glow', showSubscriptions: true, showBadges: true, updatedAt: '2026-10-18T13:00:00.000Z' },
      favorites: [{ gameId: '/game/remote', gameName: 'Remote game', updatedAt: '2026-10-18T13:00:00.000Z' }],
      ignoredGames: [{ gameId: '/game/ignored-remote', gameName: 'Ignored remote game', updatedAt: '2026-10-18T13:00:00.000Z' }],
      collectedRewards: [{ campaignId: '/campaign/remote', rewardName: 'Remote reward', updatedAt: '2026-10-18T13:00:00.000Z' }],
    });

    expect(merged.settings.themeColor).toBe('emerald-glow');
    expect(merged.favorites.map((favorite) => favorite.gameId)).toEqual(['/game/local', '/game/remote']);
    expect(merged.ignoredGames.map((game) => game.gameId)).toEqual(['/game/ignored-local', '/game/ignored-remote']);
    expect(merged.collectedRewards.map((reward) => reward.rewardName)).toEqual(['Local reward', 'Remote reward']);
    expect(merged).not.toHaveProperty('snapshots');
  });

  it('does not restore a record that has a newer remote deletion tombstone', () => {
    const merged = mergeTrackerSnapshots(local, {
      settings: null,
      favorites: [{ gameId: '/game/local', gameName: 'Local game', updatedAt: '2026-10-18T12:00:00.000Z', removedAt: '2026-10-18T14:00:00.000Z' }],
      ignoredGames: [],
      collectedRewards: [],
    });

    expect(merged.favorites).toEqual([]);
  });
});
