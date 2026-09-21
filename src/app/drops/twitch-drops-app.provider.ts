import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ActiveDrop } from './active-drop';
import { DropsProvider } from './drops-provider';

const TWITCH_DROPS_URL = 'https://twitchdrops.app/';

@Injectable()
export class TwitchDropsAppProvider extends DropsProvider {
  private readonly http = inject(HttpClient);

  loadActiveDrops(): Observable<readonly ActiveDrop[]> {
    return this.http.get(TWITCH_DROPS_URL, { responseType: 'text' }).pipe(map((html) => this.parseActiveDrops(html)));
  }

  private parseActiveDrops(html: string): readonly ActiveDrop[] {
    const document = new DOMParser().parseFromString(html, 'text/html');

    return [...document.querySelectorAll<HTMLAnchorElement>('.game-card[data-game][data-drops][data-end]')]
      .map((card) => this.normalizeCard(card))
      .filter((drop): drop is ActiveDrop => drop !== null);
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

    return {
      id,
      gameName,
      rewardCount,
      endsAt: endDate.toISOString(),
      ...(image ? { imageUrl: image.src } : {}),
    };
  }

  private toDisplayName(value: string): string {
    return value.replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
