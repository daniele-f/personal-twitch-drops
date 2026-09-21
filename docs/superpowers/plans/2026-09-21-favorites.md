# Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a user's favorite active Drops and show them in an exclusive Favorites list with a two-click, hover/focus-cancellable unfavorite action.

**Architecture:** `PreferencesService` owns validated, browser-local favorite IDs and exposes them as a Signal-backed preference boundary. `App` derives mutually exclusive favorite and active lists from live provider rows, while `DropListComponent` remains presentational and owns only the temporary armed-unfavorite UI state.

**Tech Stack:** Angular standalone components, Signals, localStorage, Vitest, jsdom, SCSS.

**Spec:** `docs/superpowers/specs/2026-09-21-favorites-design.md`

## Global Constraints

- Store only favorite normalized drop IDs under one versioned localStorage key; add no dependency or backend.
- Treat unavailable or malformed storage as an empty preference set without breaking in-memory favorite actions.
- Keep an active drop in exactly one list: Favorites or Active Drops.
- Hide the entire Favorites section when it has no currently active rows.
- Use the exact armed-removal copy: `Press the star again to unfavorite`.
- Cancel an armed removal when pointer or keyboard focus leaves its star control.
- Preserve existing loading skeletons, source failure, Retry behavior, GitHub Pages compatibility, and 320px readability.
- Do not add blacklist controls, subscription filtering, snapshots, automatic refresh/cooldowns, changes, notifications, import/export, or an alternate provider.

## Review Focus

- A malformed JSON value or a non-array localStorage value starts with no favorites and does not prevent later favorite actions; test in Task 1.
- A valid saved favorite for a game absent from the current provider response remains saved but renders no empty Favorites section; test in Tasks 1 and 3.
- Two source rows with different IDs and the same visible name remain independently favoritable because IDs, not names, are persisted; test in Task 3.
- Leaving an armed star with either pointer or keyboard focus cancels the red confirmation and removes its instruction; test in Task 2.
- An unavailable localStorage implementation still updates the visible lists for the current session; test in Task 1.

---

## File Structure

- Create `src/app/preferences/preferences-storage.ts`: injectable, safe browser-storage boundary and versioned favorite key.
- Create `src/app/preferences/preferences.service.ts`: Signal-backed favorite-ID persistence operations.
- Create `src/app/preferences/preferences.service.spec.ts`: deterministic storage parsing, persistence, and unavailable-storage coverage.
- Modify `src/app/drop-list/drop-list.ts`: list inputs, favorite/unfavorite outputs, and temporary armed-star state.
- Modify `src/app/drop-list/drop-list.html`: conditional Favorites section, exclusive Active Drops section, and accessible star controls.
- Modify `src/app/drop-list/drop-list.scss`: action layout, favorite and armed-red states, visible focus, hint, and narrow-width behavior.
- Modify `src/app/drop-list/drop-list.spec.ts`: component state and event coverage.
- Modify `src/app/app.ts`: derive favorite and active rows from provider rows plus `PreferencesService`.
- Modify `src/app/app.html`: bind derived lists and favorite events.
- Modify `src/app/app.spec.ts`: app-level partitioning and immediate move coverage.

### Task 1: Add browser-local favorites preference boundary

**Files:**
- Create: `src/app/preferences/preferences-storage.ts`, `src/app/preferences/preferences.service.ts`, `src/app/preferences/preferences.service.spec.ts`
- Test: `src/app/preferences/preferences.service.spec.ts`

**Interfaces:**
- Produces `PREFERENCES_STORAGE: InjectionToken<Storage | null>` and `FAVORITE_IDS_STORAGE_KEY = 'personal-twitch-drops.favorite-ids.v1'`.
- Produces `PreferencesService.favoriteIds: Signal<ReadonlySet<string>>`, `addFavorite(id: string): void`, and `removeFavorite(id: string): void`.

- [ ] **Step 1: Write the failing preference-service tests**

Use a small in-memory `Storage` fake and override `PREFERENCES_STORAGE`. Assert valid unique string IDs load; invalid JSON, an object, arrays containing non-strings, and thrown storage access load an empty set. Assert add/remove writes the deterministic string array and updates `favoriteIds()` even when `setItem` throws.

```typescript
it('keeps in-memory favorites when persistence is unavailable', () => {
  storage.setItem = vi.fn(() => { throw new Error('blocked'); });
  const service = TestBed.inject(PreferencesService);

  service.addFavorite('/game/sea-of-thieves');

  expect(service.favoriteIds().has('/game/sea-of-thieves')).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/preferences/preferences.service.spec.ts`

Expected: FAIL because the preferences modules do not exist.

- [ ] **Step 3: Implement the storage token and service**

Create a storage token whose factory catches access to `globalThis.localStorage` and returns `null`. In the service, read once during signal initialization, accept only an array of non-empty strings, de-duplicate it, and catch `getItem`, `setItem`, and `removeItem` errors. Update the signal before attempting persistence, and remove the key when the final favorite is removed.

```typescript
readonly favoriteIds = signal<ReadonlySet<string>>(this.readFavoriteIds());

addFavorite(id: string): void {
  if (!id || this.favoriteIds().has(id)) return;
  const next = new Set(this.favoriteIds());
  next.add(id);
  this.favoriteIds.set(next);
  this.persist(next);
}

removeFavorite(id: string): void {
  const next = new Set(this.favoriteIds());
  if (!next.delete(id)) return;
  this.favoriteIds.set(next);
  this.persist(next);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --watch=false --run src/app/preferences/preferences.service.spec.ts`

Expected: PASS for valid persistence, malformed/unavailable storage, absent active items, and in-memory fallback.

- [ ] **Step 5: Commit the preference boundary**

```powershell
git add src/app/preferences
git commit -m "feat: persist favorite drop IDs"
```

### Task 2: Render exclusive lists and star confirmation affordance

**Files:**
- Modify: `src/app/drop-list/drop-list.ts`, `src/app/drop-list/drop-list.html`, `src/app/drop-list/drop-list.scss`, `src/app/drop-list/drop-list.spec.ts`
- Test: `src/app/drop-list/drop-list.spec.ts`

**Interfaces:**
- Consumes `favoriteDrops: readonly ActiveDrop[]`, `activeDrops: readonly ActiveDrop[]`, and `loading: boolean` inputs.
- Produces `favoriteRequested: OutputEmitterRef<string>` and `unfavoriteRequested: OutputEmitterRef<string>`.
- Uses `armedForId: Signal<string | null>` only for a temporary favorite-card confirmation.

- [ ] **Step 1: Write failing list interaction tests**

Replace the single `drops` input setup with favorite and active inputs. Test that an empty favorite input renders no Favorites section, a populated favorite section precedes Active Drops, and each supplied row renders once. Test a normal star emits `favoriteRequested`, while a first click on a favorite adds the red state and exact instruction; a second click emits `unfavoriteRequested`. Add pointer-leave and focus-out tests that clear the armed state and hint.

```typescript
const favoriteStar = fixture.nativeElement.querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-star');
favoriteStar?.click();
fixture.detectChanges();
expect(fixture.nativeElement.textContent).toContain('Press the star again to unfavorite');

favoriteStar?.dispatchEvent(new Event('mouseleave'));
fixture.detectChanges();
expect(fixture.nativeElement.textContent).not.toContain('Press the star again to unfavorite');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts`

Expected: FAIL because the component accepts only one flat list and has no star events.

- [ ] **Step 3: Refactor the component inputs, outputs, and template**

Replace `drops` with the two required list inputs. Keep the loading branch exactly four decorative skeletons. In the success branch render a Favorites `<section>` only when `favoriteDrops().length > 0`, then an Active Drops section. Use the drop ID as the track key and action data attribute. A normal Active Drops star emits `favoriteRequested`; a favorite star arms, then on a second click emits `unfavoriteRequested` and clears its armed state. Bind `mouseleave` and `focusout` to the star action wrapper to call `cancelArmed(id)`.

```typescript
readonly favoriteRequested = output<string>();
readonly unfavoriteRequested = output<string>();
protected readonly armedForId = signal<string | null>(null);

protected activateStar(drop: ActiveDrop, isFavorite: boolean): void {
  if (!isFavorite) { this.favoriteRequested.emit(drop.id); return; }
  if (this.armedForId() === drop.id) {
    this.unfavoriteRequested.emit(drop.id);
    this.armedForId.set(null);
    return;
  }
  this.armedForId.set(drop.id);
}
```

Give the button a dynamic accessible name and `aria-describedby` while armed. Keep the instruction in text, apply the red style only when armed, add a clear `:focus-visible` outline, and at narrow widths use a three-column row grid (`cover`, `copy`, `action`) with no horizontal overflow.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts`

Expected: PASS for hidden empty Favorites, single-list rendering, star emissions, two-click removal, pointer/focus cancellation, images, cover fallbacks, and skeletons.

- [ ] **Step 5: Commit the list interaction**

```powershell
git add src/app/drop-list
git commit -m "feat: add favorite star controls"
```

### Task 3: Derive app lists from saved favorites

**Files:**
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes injected `PreferencesService`, provider-loaded `drops`, and `DropListComponent` favorite outputs.
- Produces `favoriteDrops: Signal<readonly ActiveDrop[]>` and `activeDrops: Signal<readonly ActiveDrop[]>`.

- [ ] **Step 1: Write failing app-flow tests**

Provide a `PreferencesService` test double or token-backed service with an initial favorite ID. After a provider success, assert the favorite card appears in Favorites, is absent from Active Drops, and a saved but currently absent ID produces no Favorites section. Click a normal star and assert the card immediately moves upward; then arm and confirm its favorite star and assert it returns to Active Drops. Include two rows with the same `gameName` but distinct IDs to prove the stored IDs act independently.

```typescript
provider.requests[0].next([seaOfThieves, { ...seaOfThieves, id: '/game/sea-of-thieves-2' }]);
fixture.detectChanges();
fixture.nativeElement.querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .favorite-star')?.click();
fixture.detectChanges();
expect(fixture.nativeElement.querySelector('.favorites-section')?.textContent).toContain('Sea of Thieves');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/app.spec.ts`

Expected: FAIL because `App` neither injects preferences nor partitions the provider rows.

- [ ] **Step 3: Wire the derived Signals and template bindings**

Inject `PreferencesService`. Derive each list with `computed`, filtering provider drops by whether their ID is in `favoriteIds()`. Preserve the original provider `drops` signal for the total count, loading, timestamp, error, Retry, and superseded-request logic. Bind the two lists and `loading` to `app-drop-list`; bind its outputs directly to `preferences.addFavorite($event)` and `preferences.removeFavorite($event)`.

```typescript
protected readonly favoriteDrops = computed(() => {
  const favoriteIds = this.preferences.favoriteIds();
  return this.drops().filter((drop) => favoriteIds.has(drop.id));
});
protected readonly activeDrops = computed(() => {
  const favoriteIds = this.preferences.favoriteIds();
  return this.drops().filter((drop) => !favoriteIds.has(drop.id));
});
```

```html
<app-drop-list
  [favoriteDrops]="favoriteDrops()"
  [activeDrops]="activeDrops()"
  [loading]="loading()"
  (favoriteRequested)="preferences.addFavorite($event)"
  (unfavoriteRequested)="preferences.removeFavorite($event)"
/>
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --watch=false --run src/app/app.spec.ts`

Expected: PASS for saved favorite partitioning, no duplicate cards, immediate moves, absent-current favorite IDs, same-name independent IDs, and all existing loading/failure/Retry tests.

- [ ] **Step 5: Commit the integrated favorites flow**

```powershell
git add src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat: show saved favorite Drops first"
```

### Task 4: Verify Favorites end to end

**Files:**
- Modify: none unless verification reveals a scoped defect
- Test: full application checks and browser smoke test

- [ ] **Step 1: Run all required automated checks**

```powershell
npm test -- --watch=false
npm run lint
npm run build
git diff --check
git diff main...HEAD --name-only
git status --short
```

Expected: all checks pass and only Favorites feature files are on the feature branch.

- [ ] **Step 2: Manually smoke-test the live UI**

Run `npm start` and inspect the local URL. Verify an empty favorites section is hidden, favoriting moves a live card to the top list, a page reload retains it, no card duplicates, the armed star is red with the exact instruction, pointer/focus exit cancels the confirmation, the second click unfavorites, and the layout stays readable at desktop and 320px widths.

- [ ] **Step 3: Commit only a scoped verification fix if needed**

```powershell
git add src/app
git commit -m "fix: polish favorite star interaction"
```

Do not commit if verification finds no scoped defect.

