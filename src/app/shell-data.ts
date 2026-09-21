export interface DropListItem {
  readonly game: string;
  readonly campaign: string;
  readonly isNew: boolean;
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
      { game: 'The Elder Scrolls Online', campaign: 'Crown Crate drops · Ends in 5 days', isNew: false },
      { game: 'Sea of Thieves', campaign: 'Community Weekend · Ends tomorrow', isNew: true },
    ],
  },
  {
    title: 'Newly added',
    countLabel: '2 games',
    items: [
      { game: 'Rust', campaign: 'Twitch Rivals collection · 2 campaigns', isNew: true },
      { game: 'Warframe', campaign: 'TennoGen rewards · Ends in 8 days', isNew: true },
    ],
  },
];
