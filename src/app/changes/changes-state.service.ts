import { inject, Injectable, signal } from '@angular/core';
import { ActiveDrop } from '../drops/active-drop';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { detectChanges, DropChange } from './change-detection';

const SNAPSHOTS_STORAGE_KEY = 'personal-twitch-drops.daily-snapshots.v1';

interface DatedDropSnapshot {
  readonly date: string;
  readonly drops: readonly ActiveDrop[];
}

interface DailyDropSnapshots {
  readonly baseline: DatedDropSnapshot | null;
  readonly current: DatedDropSnapshot;
}

@Injectable({ providedIn: 'root' })
export class ChangesStateService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  readonly drops = signal<readonly ActiveDrop[]>([]);
  readonly changes = signal<readonly DropChange[]>([]);
  private sessionSnapshots = this.readSnapshots();
  private storageOutOfSync = false;

  updateDrops(current: readonly ActiveDrop[]): void {
    const date = this.localDateKey(new Date());
    const saved = this.storageOutOfSync ? this.sessionSnapshots : this.readSnapshots() ?? this.sessionSnapshots;
    const baseline = saved?.current.date === date ? saved.baseline : saved?.current ?? null;

    this.changes.set(baseline ? detectChanges(baseline.drops, current) : []);
    this.drops.set(current);
    this.persistSnapshots({ baseline, current: { date, drops: current } });
  }

  seed(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): readonly DropChange[] {
    this.changes.set(detectChanges(previous, current));
    this.drops.set(current);
    return this.changes();
  }

  clear(): readonly DropChange[] { this.drops.set([]); this.changes.set([]); return this.changes(); }

  private readSnapshots(): DailyDropSnapshots | null {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

      const { baseline, current } = parsed as Record<string, unknown>;
      if (!this.isSnapshot(current) || (baseline !== null && !this.isSnapshot(baseline))) return null;
      return { baseline, current };
    } catch {
      return null;
    }
  }

  private persistSnapshots(snapshots: DailyDropSnapshots): void {
    this.sessionSnapshots = snapshots;
    if (!this.storage) return;
    try {
      this.storage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
      this.storageOutOfSync = false;
    } catch {
      this.storageOutOfSync = true;
      // Change detection remains available for this browser session.
    }
  }

  private isSnapshot(value: unknown): value is DatedDropSnapshot {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const { date, drops } = value as Record<string, unknown>;
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(drops) && drops.every((drop) => this.isActiveDrop(drop));
  }

  private isActiveDrop(value: unknown): value is ActiveDrop {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const { id, gameName, rewardCount, rewards, endsAt, imageUrl } = value as Record<string, unknown>;
    return typeof id === 'string' && !!id
      && typeof gameName === 'string' && !!gameName
      && typeof rewardCount === 'number' && Number.isFinite(rewardCount)
      && (rewards === undefined || (Array.isArray(rewards) && rewards.every((reward) => typeof reward === 'string')))
      && typeof endsAt === 'string'
      && (imageUrl === undefined || typeof imageUrl === 'string');
  }

  private localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
