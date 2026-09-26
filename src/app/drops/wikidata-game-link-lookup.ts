import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { DropDetails } from './drop-details';

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';

interface WikidataSearchResponse {
  readonly search?: readonly { readonly id?: string; readonly label?: string; readonly description?: string }[];
}

interface WikidataClaim {
  readonly mainsnak?: { readonly datavalue?: { readonly value?: unknown } };
}

type WikidataClaims = Readonly<Record<string, readonly WikidataClaim[]>>;

interface WikidataEntityResponse {
  readonly entities?: Readonly<Record<string, { readonly claims?: WikidataClaims }>>;
}

@Injectable({ providedIn: 'root' })
export class WikidataGameLinkLookup {
  private readonly http = inject(HttpClient);
  private readonly requestsByGameName = new Map<string, Observable<DropDetails['primaryLink']>>();

  lookup(gameName: string): Observable<DropDetails['primaryLink']> {
    const normalizedGameName = this.normalize(gameName);
    if (!normalizedGameName) return of(undefined);

    const existing = this.requestsByGameName.get(normalizedGameName);
    if (existing) return existing;

    const request = this.http.get<WikidataSearchResponse>(WIKIDATA_API_URL, {
      params: new HttpParams()
        .set('action', 'wbsearchentities')
        .set('format', 'json')
        .set('language', 'en')
        .set('limit', '10')
        .set('origin', '*')
        .set('search', gameName)
        .set('type', 'item'),
    }).pipe(
      map((response) => {
        const exactMatches = response.search?.filter((item) => item.id && this.normalize(item.label ?? '') === normalizedGameName) ?? [];
        const videoGameMatches = exactMatches.filter((item) => /\bvideo game\b(?!\s+series)/i.test(item.description ?? ''));
        const matches = videoGameMatches.length === 1 ? videoGameMatches : exactMatches;
        return matches.length === 1 ? matches[0].id : undefined;
      }),
      switchMap((id) => id
        ? this.http.get<WikidataEntityResponse>(WIKIDATA_API_URL, {
          params: new HttpParams().set('action', 'wbgetentities').set('format', 'json').set('ids', id).set('origin', '*').set('props', 'claims'),
        }).pipe(map((response) => this.primaryLinkFrom(response.entities?.[id]?.claims)))
        : of(undefined)),
      catchError(() => of(undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.requestsByGameName.set(normalizedGameName, request);
    return request;
  }

  private primaryLinkFrom(claims: WikidataClaims | undefined): DropDetails['primaryLink'] {
    const steamAppId = this.stringClaims(claims, 'P1733').find((value) => /^\d+$/.test(value));
    if (steamAppId) return { label: 'Steam', url: `https://store.steampowered.com/app/${steamAppId}/` };

    const officialWebsite = this.stringClaims(claims, 'P856').find((value) => this.isHttpsUrl(value));
    return officialWebsite ? { label: 'Official website', url: officialWebsite } : undefined;
  }

  private stringClaims(claims: WikidataClaims | undefined, property: string): readonly string[] {
    return (claims?.[property] ?? [])
      .map((claim) => claim.mainsnak?.datavalue?.value)
      .filter((value): value is string => typeof value === 'string');
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  private isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }

}
