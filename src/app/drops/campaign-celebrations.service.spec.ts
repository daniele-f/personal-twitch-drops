import { TestBed } from '@angular/core/testing';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { CampaignCelebrationsService } from './campaign-celebrations.service';

describe('CampaignCelebrationsService', () => {
  let service: CampaignCelebrationsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES_STORAGE, useValue: localStorage }] });
    service = TestBed.inject(CampaignCelebrationsService);
  });

  it('allows a campaign celebration only once and persists the result', () => {
    expect(service.markCelebrated('/game/caliber')).toBe(true);
    expect(service.markCelebrated('/game/caliber')).toBe(false);
    expect(localStorage.getItem('personal-twitch-drops.celebrated-campaigns.v1')).toBe(JSON.stringify({ '/game/caliber': '' }));
  });

  it('removes celebration markers for campaigns absent from the active refresh', () => {
    service.markCelebrated('/game/caliber');
    service.markCelebrated('/game/ended');

    service.reconcileActiveCampaigns([{ id: '/game/caliber' }]);

    expect(service.markCelebrated('/game/caliber')).toBe(false);
    expect(service.markCelebrated('/game/ended')).toBe(true);
  });

  it('clears every persisted celebration marker', () => {
    service.markCelebrated('/game/caliber');
    service.markCelebrated('/game/another');

    service.clearCelebrations();

    expect(localStorage.getItem('personal-twitch-drops.celebrated-campaigns.v1')).toBeNull();
    expect(service.markCelebrated('/game/caliber')).toBe(true);
  });

  it('re-arms a campaign when its active reward set changes', () => {
    service.markCelebrated('/game/no-mans-sky', ['Atlas', 'Cosmic', 'Explorer', 'Fleet', 'Galaxy']);

    service.reconcileActiveCampaigns([{ id: '/game/no-mans-sky', rewards: ['Nebula', 'Stellar', 'Sentinel', 'Freighter', 'Atlas'] }]);

    expect(service.markCelebrated('/game/no-mans-sky', ['Nebula', 'Stellar', 'Sentinel', 'Freighter', 'Atlas'])).toBe(true);
  });

  it('keeps a campaign disarmed when its active reward set is unchanged', () => {
    const rewards = ['Atlas', 'Cosmic', 'Explorer', 'Fleet', 'Galaxy'];
    service.markCelebrated('/game/no-mans-sky', rewards);

    service.reconcileActiveCampaigns([{ id: '/game/no-mans-sky', rewards: [...rewards].reverse() }]);

    expect(service.markCelebrated('/game/no-mans-sky', rewards)).toBe(false);
  });
});
