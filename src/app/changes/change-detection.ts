import { ActiveDrop } from '../drops/active-drop';

export interface UpdatedDropChange {
  readonly type: 'updated';
  readonly drop: ActiveDrop;
  readonly addedRewards: readonly string[];
  readonly removedRewards: readonly string[];
}

export interface NewDropChange { readonly type: 'new'; readonly drop: ActiveDrop; }
export interface EndedDropChange { readonly type: 'ended'; readonly drop: ActiveDrop; }
export interface RenamedDropChange { readonly type: 'renamed'; readonly drop: ActiveDrop; readonly previousGameName: string; }
export type DropChange = NewDropChange | UpdatedDropChange | RenamedDropChange | EndedDropChange;

export function detectChanges(previous: readonly ActiveDrop[], current: readonly ActiveDrop[]): readonly DropChange[] {
  const previousById = new Map(previous.map((drop) => [drop.id, drop]));
  const currentIds = new Set(current.map((drop) => drop.id));

  const currentChanges: DropChange[] = [];
  for (const drop of current) {
    const earlier = previousById.get(drop.id);
    if (!earlier) {
      currentChanges.push({ type: 'new', drop });
      continue;
    }

    if (earlier.gameName !== drop.gameName) currentChanges.push({ type: 'renamed', drop, previousGameName: earlier.gameName });

    const currentRewards = drop.rewards ?? [];
    const earlierRewards = earlier.rewards ?? [];
    const addedRewards = currentRewards.filter((reward) => !earlierRewards.includes(reward));
    const removedRewards = earlierRewards.filter((reward) => !currentRewards.includes(reward));
    if (addedRewards.length || removedRewards.length) currentChanges.push({ type: 'updated', drop, addedRewards, removedRewards });
  }
  const endedChanges = previous.filter((drop) => !currentIds.has(drop.id)).map((drop) => ({ type: 'ended' as const, drop }));
  return [...currentChanges, ...endedChanges];
}
