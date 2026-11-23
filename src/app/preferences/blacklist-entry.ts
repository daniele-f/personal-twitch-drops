export interface BlacklistEntry {
  readonly id: string;
  readonly gameName: string;
  readonly oldNames?: readonly string[];
  readonly blacklistedAt: string;
}
