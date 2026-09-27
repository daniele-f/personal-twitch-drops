import { Injectable, inject, signal } from '@angular/core';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';

export const CELEBRATED_CAMPAIGNS_STORAGE_KEY = 'personal-twitch-drops.celebrated-campaigns.v1';

@Injectable({ providedIn: 'root' })
export class CampaignCelebrationsService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly celebratedCampaignIds = signal<ReadonlySet<string>>(this.readCelebratedCampaignIds());

  markCelebrated(campaignId: string): boolean {
    if (!campaignId || this.celebratedCampaignIds().has(campaignId)) return false;

    const next = new Set(this.celebratedCampaignIds()).add(campaignId);
    this.celebratedCampaignIds.set(next);
    this.persist(next);
    return true;
  }

  retainActiveCampaigns(activeCampaignIds: readonly string[]): void {
    const activeIds = new Set(activeCampaignIds);
    const next = new Set([...this.celebratedCampaignIds()].filter((campaignId) => activeIds.has(campaignId)));
    if (next.size === this.celebratedCampaignIds().size) return;
    this.celebratedCampaignIds.set(next);
    this.persist(next);
  }

  clearCelebrations(): void {
    this.celebratedCampaignIds.set(new Set());
    this.persist(new Set());
  }

  private readCelebratedCampaignIds(): ReadonlySet<string> {
    if (!this.storage) return new Set();
    try {
      const stored = this.storage.getItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      const parsed: unknown = stored === null ? [] : JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((campaignId) => typeof campaignId === 'string' && campaignId)
        ? new Set(parsed)
        : new Set();
    } catch {
      return new Set();
    }
  }

  private persist(campaignIds: ReadonlySet<string>): void {
    if (!this.storage) return;
    try {
      if (campaignIds.size === 0) this.storage.removeItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY);
      else this.storage.setItem(CELEBRATED_CAMPAIGNS_STORAGE_KEY, JSON.stringify([...campaignIds]));
    } catch {
      // Celebration state remains available for this browser session.
    }
  }
}
