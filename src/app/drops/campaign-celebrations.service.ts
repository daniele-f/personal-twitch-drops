import { Injectable, inject, signal } from '@angular/core';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';

export const CELEBRATED_CAMPAIGNS_STORAGE_KEY = 'personal-twitch-drops.celebrated-campaigns.v1';

interface ActiveCampaign {
  readonly id: string;
  readonly rewards?: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class CampaignCelebrationsService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly celebratedCampaigns = signal<ReadonlyMap<string, string | null>>(this.readCelebratedCampaigns());

  markCelebrated(campaignId: string, rewardNames: readonly string[] = []): boolean {
    if (!campaignId || this.celebratedCampaigns().has(campaignId)) return false;

    const next = new Map(this.celebratedCampaigns()).set(campaignId, this.rewardSignature(rewardNames));
    this.celebratedCampaigns.set(next);
    this.persist(next);
    return true;
  }

  reconcileActiveCampaigns(activeCampaigns: readonly ActiveCampaign[]): void {
    const activeCampaignsById = new Map(activeCampaigns.map((campaign) => [campaign.id, campaign]));
    const next = new Map<string, string | null>();
    for (const [campaignId, storedSignature] of this.celebratedCampaigns()) {
      const campaign = activeCampaignsById.get(campaignId);
      if (!campaign) continue;

      const currentSignature = this.rewardSignature(campaign.rewards ?? []);
      if (storedSignature === null) next.set(campaignId, currentSignature);
      else if (storedSignature === currentSignature) next.set(campaignId, storedSignature);
    }
    if (this.mapsEqual(next, this.celebratedCampaigns())) return;
    this.celebratedCampaigns.set(next);
    this.persist(next);
  }

  clearCelebrations(): void {
    this.celebratedCampaigns.set(new Map());
    this.persist(new Map());
  }

  private readCelebratedCampaigns(): ReadonlyMap<string, string | null> {
    if (!this.storage) return new Map();
    try {
      const stored = this.storage.getItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      const parsed: unknown = stored === null ? [] : JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((campaignId) => typeof campaignId === 'string' && campaignId)) {
        return new Map(parsed.map((campaignId) => [campaignId, null]));
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
      return new Map(Object.entries(parsed).flatMap(([campaignId, signature]) =>
        typeof campaignId === 'string' && campaignId && typeof signature === 'string'
          ? [[campaignId, signature] as const]
          : [],
      ));
    } catch {
      return new Map();
    }
  }

  private persist(campaigns: ReadonlyMap<string, string | null>): void {
    if (!this.storage) return;
    try {
      if (campaigns.size === 0) this.storage.removeItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      else this.storage.setItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY, JSON.stringify(Object.fromEntries(campaigns)));
    } catch {
      // Celebration state remains available for this browser session.
    }
  }

  private rewardSignature(rewardNames: readonly string[]): string {
    return [...new Set(rewardNames)].sort().join('\u0000');
  }

  private mapsEqual(left: ReadonlyMap<string, string | null>, right: ReadonlyMap<string, string | null>): boolean {
    return left.size === right.size && [...left].every(([campaignId, signature]) => right.get(campaignId) === signature);
  }
}
