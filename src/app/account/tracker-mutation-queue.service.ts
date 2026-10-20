import { Injectable, inject, signal } from '@angular/core';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { QueuedTrackerMutation, TrackerMutation } from './tracker-mutation';

const STORAGE_KEY = 'personal-twitch-drops.tracker-sync.v1';

@Injectable({ providedIn: 'root' })
export class TrackerMutationQueueService {
  private readonly storage = inject(PREFERENCES_STORAGE);
  private readonly entries = signal<readonly QueuedTrackerMutation[]>(this.read());

  enqueue(accountId: string, mutation: TrackerMutation): void {
    if (!accountId) return;
    const next = [...this.entries(), { accountId, sequence: Math.max(0, ...this.entries().map((entry) => entry.sequence)) + 1, mutation }];
    this.entries.set(next);
    this.persist(next);
  }

  loadForAccount(accountId: string): readonly QueuedTrackerMutation[] { return this.entries().filter((entry) => entry.accountId === accountId).sort((left, right) => left.sequence - right.sequence); }

  removeThrough(accountId: string, sequence: number): void {
    const next = this.entries().filter((entry) => entry.accountId !== accountId || entry.sequence > sequence);
    this.entries.set(next);
    this.persist(next);
  }

  clearForAccount(accountId: string): void {
    const next = this.entries().filter((entry) => entry.accountId !== accountId);
    this.entries.set(next);
    this.persist(next);
  }

  private read(): readonly QueuedTrackerMutation[] {
    try { const parsed: unknown = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.filter((entry): entry is QueuedTrackerMutation => this.isEntry(entry)) : []; } catch { return []; }
  }
  private persist(entries: readonly QueuedTrackerMutation[]): void { try { if (entries.length) this.storage?.setItem(STORAGE_KEY, JSON.stringify(entries)); else this.storage?.removeItem(STORAGE_KEY); } catch { /* Retain the in-memory queue. */ } }
  private isEntry(value: unknown): value is QueuedTrackerMutation { if (!value || typeof value !== 'object') return false; const entry = value as Record<string, unknown>; return typeof entry['accountId'] === 'string' && !!entry['accountId'] && typeof entry['sequence'] === 'number' && Number.isInteger(entry['sequence']) && entry['sequence'] > 0 && !!entry['mutation'] && typeof entry['mutation'] === 'object'; }
}
