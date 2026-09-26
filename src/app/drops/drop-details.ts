export interface DropDetails {
  readonly requirementByReward: Readonly<Record<string, string>>;
  readonly badgeRewardNames: readonly string[];
  readonly primaryLink?: { readonly label: 'Steam' | 'Official website'; readonly url: string };
  readonly detailsUrl?: string;
  readonly streamersUrl?: string;
}
