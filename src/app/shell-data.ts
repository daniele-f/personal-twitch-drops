export interface DropListItem {
  readonly game: string;
  readonly campaign: string;
  readonly indicator: string;
  readonly indicatorKind: 'favorite' | 'new';
}

export interface DropListSection {
  readonly title: string;
  readonly countLabel: string;
  readonly items: readonly DropListItem[];
}

export const SHELL_SECTIONS: readonly DropListSection[] = [
  {
    title: 'Favorites',
    countLabel: '2 active',
    items: [
      { game: 'The Elder Scrolls Online', campaign: 'Crown Crate drops · Ends in 5 days', indicator: 'Favorite', indicatorKind: 'favorite' },
      { game: 'Sea of Thieves', campaign: 'Community Weekend · Ends tomorrow', indicator: 'Favorite', indicatorKind: 'favorite' },
    ],
  },
  {
    title: 'Newly added',
    countLabel: '2 games',
    items: [
      { game: 'Rust', campaign: 'Twitch Rivals collection · 2 campaigns', indicator: 'New', indicatorKind: 'new' },
      { game: 'Warframe', campaign: 'TennoGen rewards · Ends in 8 days', indicator: 'New', indicatorKind: 'new' },
    ],
  },
];
