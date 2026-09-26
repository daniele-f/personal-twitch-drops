import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { ActiveDrop } from './active-drop';
import { DropDetails } from './drop-details';
import { DropsProvider } from './drops-provider';
import { WikidataGameLinkLookup } from './wikidata-game-link-lookup';

const TWITCH_DROPS_URL = 'https://twitchdrops.app/';

@Injectable()
export class TwitchDropsAppProvider extends DropsProvider {
  private readonly http = inject(HttpClient);
  private readonly gameLinkLookup = inject(WikidataGameLinkLookup);

  loadActiveDrops(): Observable<readonly ActiveDrop[]> {
    return this.http.get(TWITCH_DROPS_URL, { responseType: 'text' }).pipe(map((html) => this.parseActiveDrops(html)));
  }

  loadDropDetails(id: string, gameName?: string): Observable<DropDetails> {
    return this.http.get(`https://twitchdrops.app${id}`, { responseType: 'text' }).pipe(
      map((html) => this.parseDropDetails(html, id)),
      switchMap((details) => gameName
        ? this.gameLinkLookup.lookup(gameName).pipe(map((primaryLink) => primaryLink ? { ...details, primaryLink } : details))
        : of(details)),
    );
  }

  private parseActiveDrops(html: string): readonly ActiveDrop[] {
    const document = new DOMParser().parseFromString(html, 'text/html');

    if (!document.querySelector('.games-grid')) {
      throw new Error('The Twitch Drops source document has an unexpected structure.');
    }

    return [...document.querySelectorAll<HTMLAnchorElement>('.game-card[data-game][data-drops][data-end]')]
      .map((card) => this.normalizeCard(card))
      .filter((drop): drop is ActiveDrop => drop !== null)
      .sort((left, right) => Date.parse(left.endsAt) - Date.parse(right.endsAt));
  }

  private normalizeCard(card: HTMLAnchorElement): ActiveDrop | null {
    const id = card.getAttribute('href')?.trim();
    const sourceName = card.dataset['game']?.trim();
    const rewardCount = Number(card.dataset['drops']);
    const endDate = new Date(card.dataset['end'] ?? '');

    if (!id || !sourceName || !Number.isSafeInteger(rewardCount) || rewardCount <= 0 || Number.isNaN(endDate.getTime())) {
      return null;
    }

    const image = card.querySelector<HTMLImageElement>('img[src]');
    const gameName = image?.alt.trim() || this.toDisplayName(sourceName);
    const rewards = [...card.querySelectorAll<HTMLElement>('.card-rewards .reward-name')]
      .map((reward) => reward.textContent?.trim() ?? '')
      .filter((reward) => reward.length > 0);
    const rewardImages = [...card.querySelectorAll<HTMLImageElement>('.card-rewards .reward-thumb[src]')]
      .map((image) => image.src);
    const publisher = card.querySelector<HTMLElement>('.card-publisher')?.textContent?.trim();
    const watchDuration = card.querySelector<HTMLElement>('.lv-watch')?.textContent?.trim();

    return {
      id,
      gameName,
      rewardCount,
      rewards,
      ...(rewardImages.length ? { rewardImages } : {}),
      ...(publisher ? { publisher } : {}),
      ...(watchDuration ? { watchDuration } : {}),
      endsAt: endDate.toISOString(),
      ...(image ? { imageUrl: image.src } : {}),
    };
  }

  private toDisplayName(value: string): string {
    return value.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private parseDropDetails(html: string, id: string): DropDetails {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const requirementByReward = Object.fromEntries([...document.querySelectorAll<HTMLElement>('.drop-card')]
      .map((card) => [
        card.querySelector<HTMLElement>('.drop-name')?.textContent?.trim(),
        card.querySelector<HTMLElement>('.drop-time')?.textContent?.trim(),
      ])
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])));
    const badgeRewardNames = [...document.querySelectorAll<HTMLElement>('.campaign-banner')]
      .filter((campaign) => campaign.querySelector<HTMLElement>('.cb-desc')?.textContent?.trim().toLocaleLowerCase().startsWith('this badge') ?? false)
      .map((campaign) => campaign.querySelector<HTMLElement>('.cb-name')?.textContent?.trim() ?? '')
      .filter((name) => name.length > 0);

    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const steamUrl = this.findUrl(links, (url) => url.hostname === 'store.steampowered.com');
    const officialWebsiteUrl = this.findUrl(links, (url, anchor) =>
      /official (website|site)/i.test(anchor.textContent ?? '') && url.hostname !== 'twitchdrops.app',
    );
    const streamersUrl = this.findUrl(links, (url) =>
      (url.hostname === 'twitch.tv' || url.hostname.endsWith('.twitch.tv')) && url.pathname.startsWith('/directory/category/'),
    );
    const detailsUrl = this.detailsUrlFor(id);

    return {
      requirementByReward,
      badgeRewardNames,
      ...(steamUrl ? { primaryLink: { label: 'Steam' as const, url: steamUrl } } : officialWebsiteUrl ? { primaryLink: { label: 'Official website' as const, url: officialWebsiteUrl } } : {}),
      ...(detailsUrl ? { detailsUrl } : {}),
      ...(streamersUrl ? { streamersUrl } : {}),
    };
  }

  private detailsUrlFor(id: string): string | undefined {
    try {
      const url = new URL(id, TWITCH_DROPS_URL);
      return url.origin === new URL(TWITCH_DROPS_URL).origin && url.pathname.startsWith('/game/') ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  }

  private findUrl(anchors: readonly HTMLAnchorElement[], predicate: (url: URL, anchor: HTMLAnchorElement) => boolean): string | undefined {
    for (const anchor of anchors) {
      try {
        const url = new URL(anchor.href);
        if (url.protocol === 'https:' && predicate(url, anchor)) return url.toString();
      } catch {
        // Ignore malformed source links.
      }
    }
    return undefined;
  }
}
