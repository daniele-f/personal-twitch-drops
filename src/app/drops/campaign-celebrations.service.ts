import { Injectable, inject, signal } from '@angular/core';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';

export const CELEBRATED_CAMPAIGNS_STORAGE_KEY = 'personal-twitch-drops.celebrated-campaigns.v1';

interface ActiveCampaign {
  readonly id: string;
  readonly rewards?: readonly string[];
}

type CelebrationMilestone = 'visible' | 'complete';
type CelebrationMarkers = ReadonlyMap<CelebrationMilestone, string | null>;

@Injectable({ providedIn: 'root' })
export class CampaignCelebrationsService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly celebratedCampaigns = signal<ReadonlyMap<string, CelebrationMarkers>>(this.readCelebratedCampaigns());

  markCelebrated(campaignId: string, rewardNames: readonly string[] = [], milestone: CelebrationMilestone = 'complete'): boolean {
    const markers = this.celebratedCampaigns().get(campaignId);
    if (!campaignId || markers?.has(milestone)) return false;

    const next = new Map(this.celebratedCampaigns()).set(campaignId, new Map(markers).set(milestone, this.rewardSignature(rewardNames)));
    this.celebratedCampaigns.set(next);
    this.persist(next);
    return true;
  }

  reconcileActiveCampaigns(activeCampaigns: readonly ActiveCampaign[]): void {
    const activeCampaignsById = new Map(activeCampaigns.map((campaign) => [campaign.id, campaign]));
    const next = new Map<string, CelebrationMarkers>();
    for (const [campaignId, markers] of this.celebratedCampaigns()) {
      const campaign = activeCampaignsById.get(campaignId);
      if (!campaign) continue;

      const currentSignature = this.rewardSignature(campaign.rewards ?? []);
      const nextMarkers = new Map(markers);
      const completeSignature = markers.get('complete');
      if (completeSignature === null) nextMarkers.set('complete', currentSignature);
      else if (completeSignature !== undefined && completeSignature !== currentSignature) nextMarkers.delete('complete');
      if (nextMarkers.size) next.set(campaignId, nextMarkers);
    }
    if (this.mapsEqual(next, this.celebratedCampaigns())) return;
    this.celebratedCampaigns.set(next);
    this.persist(next);
  }

  clearCelebrations(): void {
    this.celebratedCampaigns.set(new Map());
    this.persist(new Map());
  }

  private readCelebratedCampaigns(): ReadonlyMap<string, CelebrationMarkers> {
    if (!this.storage) return new Map();
    try {
      const stored = this.storage.getItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      const parsed: unknown = stored === null ? [] : JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((campaignId) => typeof campaignId === 'string' && campaignId)) {
        return new Map(parsed.map((campaignId) => [campaignId, new Map([['complete', null]])]));
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
      return new Map(Object.entries(parsed).flatMap(([campaignId, storedMarkers]) => {
        if (typeof campaignId !== 'string' || !campaignId) return [];
        if (typeof storedMarkers === 'string') return [[campaignId, new Map([['complete', storedMarkers]])] as const];
        if (!storedMarkers || typeof storedMarkers !== 'object' || Array.isArray(storedMarkers)) return [];
        const markers = new Map(Object.entries(storedMarkers).flatMap(([milestone, signature]) =>
          (milestone === 'visible' || milestone === 'complete') && typeof signature === 'string'
            ? [[milestone, signature] as const]
            : [],
        ));
        return markers.size ? [[campaignId, markers] as const] : [];
      }));
    } catch {
      return new Map();
    }
  }

  private persist(campaigns: ReadonlyMap<string, CelebrationMarkers>): void {
    if (!this.storage) return;
    try {
      if (campaigns.size === 0) this.storage.removeItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      else this.storage.setItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY, JSON.stringify(Object.fromEntries([...campaigns].map(([campaignId, markers]) => [campaignId, Object.fromEntries(markers)]))));
    } catch {
      // Celebration state remains available for this browser session.
    }
  }

  private rewardSignature(rewardNames: readonly string[]): string {
    return [...new Set(rewardNames)].sort().join('\u0000');
  }

  private mapsEqual(left: ReadonlyMap<string, CelebrationMarkers>, right: ReadonlyMap<string, CelebrationMarkers>): boolean {
    return left.size === right.size && [...left].every(([campaignId, leftMarkers]) => {
      const rightMarkers = right.get(campaignId);
      return rightMarkers?.size === leftMarkers.size && [...leftMarkers].every(([milestone, signature]) => rightMarkers.get(milestone) === signature);
    });
  }
}
