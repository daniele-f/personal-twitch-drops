export interface ActiveDrop {
  readonly id: string;
  readonly gameName: string;
  readonly rewardCount: number;
  readonly endsAt: string;
  readonly imageUrl?: string;
}
