export interface ActiveDrop {
  readonly id: string;
  readonly gameName: string;
  readonly rewardCount: number;
  readonly rewards?: readonly string[];
  readonly rewardImages?: readonly string[];
  readonly publisher?: string;
  readonly watchDuration?: string;
  readonly endsAt: string;
  readonly imageUrl?: string;
}
