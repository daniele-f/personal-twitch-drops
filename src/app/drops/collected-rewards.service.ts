import { Injectable, inject, signal } from '@angular/core';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';

export const COLLECTED_REWARDS_STORAGE_KEY = 'personal-twitch-drops.collected-rewards.v1';

@Injectable({ providedIn: 'root' })
export class CollectedRewardsService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly collectedRewardsByCampaign = signal<ReadonlyMap<string, ReadonlySet<string>>>(this.readCollectedRewards());

  isCollected(campaignId: string, rewardName: string): boolean {
    return this.collectedRewardsByCampaign().get(campaignId)?.has(rewardName) ?? false;
  }

  setCollected(campaignId: string, rewardName: string, collected: boolean): void {
    if (!campaignId || !rewardName) return;

    const next = new Map(this.collectedRewardsByCampaign());
    const rewards = new Set(next.get(campaignId) ?? []);
    if (collected) rewards.add(rewardName);
    else rewards.delete(rewardName);

    if (rewards.size) next.set(campaignId, rewards);
    else next.delete(campaignId);
    this.update(next);
  }

  markAllCollected(campaignId: string, rewardNames: readonly string[]): void {
    if (!campaignId || rewardNames.length === 0) return;

    const next = new Map(this.collectedRewardsByCampaign());
    next.set(campaignId, new Set([...(next.get(campaignId) ?? []), ...rewardNames.filter(Boolean)]));
    this.update(next);
  }

  markNoneCollected(campaignId: string, rewardNames: readonly string[]): void {
    const next = new Map(this.collectedRewardsByCampaign());
    const rewards = new Set(next.get(campaignId) ?? []);
    for (const rewardName of rewardNames) rewards.delete(rewardName);
    if (rewards.size) next.set(campaignId, rewards);
    else next.delete(campaignId);
    this.update(next);
  }

  retainActiveCampaigns(activeCampaignIds: readonly string[]): void {
    const activeIds = new Set(activeCampaignIds);
    const next = new Map([...this.collectedRewardsByCampaign()].filter(([campaignId]) => activeIds.has(campaignId)));
    if (next.size !== this.collectedRewardsByCampaign().size) this.update(next);
  }

  private update(next: ReadonlyMap<string, ReadonlySet<string>>): void {
    this.collectedRewardsByCampaign.set(next);
    this.persist(next);
  }

  private readCollectedRewards(): ReadonlyMap<string, ReadonlySet<string>> {
    if (!this.storage) return new Map();
    try {
      const stored = this.storage.getItem(COLLECTED_REWARDS_STORAGE_KEY);
      const parsed: unknown = stored === null ? {} : JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
      return new Map(Object.entries(parsed).flatMap(([campaignId, rewards]) =>
        typeof campaignId === 'string' && campaignId && Array.isArray(rewards) && rewards.every((reward) => typeof reward === 'string' && reward)
          ? [[campaignId, new Set(rewards)]]
          : [],
      ));
    } catch {
      return new Map();
    }
  }

  private persist(collectedRewardsByCampaign: ReadonlyMap<string, ReadonlySet<string>>): void {
    if (!this.storage) return;
    try {
      if (collectedRewardsByCampaign.size === 0) this.storage.removeItem(COLLECTED_REWARDS_STORAGE_KEY);
      else this.storage.setItem(COLLECTED_REWARDS_STORAGE_KEY, JSON.stringify(Object.fromEntries([...collectedRewardsByCampaign].map(([campaignId, rewards]) => [campaignId, [...rewards]]))));
    } catch {
      // Collection state remains available for this browser session.
    }
  }
}
