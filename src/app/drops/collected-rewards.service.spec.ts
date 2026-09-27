import { TestBed } from '@angular/core/testing';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { CollectedRewardsService } from './collected-rewards.service';

describe('CollectedRewardsService', () => {
  let service: CollectedRewardsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: localStorage }] });
    service = TestBed.inject(CollectedRewardsService);
  });

  it('persists an individually collected reward for its active campaign', () => {
    service.setCollected('/game/caliber', 'S13 60000 credits', true);

    expect(service.isCollected('/game/caliber', 'S13 60000 credits')).toBe(true);
    expect(localStorage.getItem('personal-twitch-drops.collected-rewards.v1')).toBe(
      JSON.stringify({ '/game/caliber': ['S13 60000 credits'] }),
    );
  });

  it('marks every reward in one campaign as collected', () => {
    service.markAllCollected('/game/caliber', ['S13 60000 credits', 'S13 Twitch Container']);

    expect(service.isCollected('/game/caliber', 'S13 60000 credits')).toBe(true);
    expect(service.isCollected('/game/caliber', 'S13 Twitch Container')).toBe(true);
  });

  it('clears only the selected rewards when a campaign is marked none collected', () => {
    service.markAllCollected('/game/caliber', ['S13 60000 credits', 'S13 Twitch Container', 'S13 Weapon Container']);

    service.markNoneCollected('/game/caliber', ['S13 60000 credits', 'S13 Twitch Container']);

    expect(service.isCollected('/game/caliber', 'S13 60000 credits')).toBe(false);
    expect(service.isCollected('/game/caliber', 'S13 Twitch Container')).toBe(false);
    expect(service.isCollected('/game/caliber', 'S13 Weapon Container')).toBe(true);
  });

  it('removes collection state for campaigns absent from the active refresh', () => {
    service.markAllCollected('/game/caliber', ['S13 60000 credits']);
    service.markAllCollected('/game/another', ['Reward']);

    service.retainActiveCampaigns(['/game/caliber']);

    expect(service.isCollected('/game/caliber', 'S13 60000 credits')).toBe(true);
    expect(service.isCollected('/game/another', 'Reward')).toBe(false);
    expect(localStorage.getItem('personal-twitch-drops.collected-rewards.v1')).toBe(
      JSON.stringify({ '/game/caliber': ['S13 60000 credits'] }),
    );
  });
});
