# Blacklist and Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent game blacklisting, a Preferences page for managing it, and a blocking resolution dialog for favorite/blacklist conflicts.

**Architecture:** `PreferencesService` remains the browser-storage boundary and gains typed blacklist entries. The app becomes a shell that gates routed content on unresolved preference conflicts; separate Drops and Preferences page components respectively own live-Drops presentation and blacklist management. `DropListComponent` remains presentational and emits blacklist requests alongside favorite actions.

**Tech Stack:** Angular 22 standalone components, Angular Router with hash location for GitHub Pages, signals/computed state, Vitest via Angular CLI, SCSS, browser `localStorage`.

**Spec:** `docs/superpowers/specs/2026-09-21-blacklist-preferences-design.md`

## Global Constraints

- Keep external provider parsing and DTOs out of Angular components; continue consuming normalized `ActiveDrop` objects only.
- Add no dependencies, backend, browser secrets, history, expiry, or automatic conflict resolution.
- Store blacklist entries as `{ id, gameName, blacklistedAt }`, where `blacklistedAt` is an ISO timestamp.
- The exact blacklist tooltip is `Blacklist`; the two conflict choices are `Keep it in Favorites` and `Hide it`.
- Favorite rows never offer a blacklist action; blacklisted drops do not appear on either main list.
- A conflict blocks all routed game or Preferences content before the first provider request; hiding the dialog must not expose content.
- Preserve static GitHub Pages compatibility and the existing live-Drops Retry behavior.
- Before handoff, run `npm test -- --watch=false`, `npm run lint`, and `npm run build`, then manually check desktop and 320px layouts plus persisted browser data.

## Review Focus

- A stored blacklist payload with a valid JSON shape but duplicate IDs must resolve deterministically to one newest entry; test this in Task 1.
- A valid stored entry with an invalid timestamp must be rejected rather than rendered as `Invalid Date`; test this in Task 1.
- A blacklist request for an already-blacklisted ID must not overwrite the original timestamp; test this in Task 1.
- A direct `/preferences` hash URL while conflicts exist must render only the dialog and make no provider request; test this in Task 4.
- A keyboard user must be able to expand the blacklist section and invoke every row action with native buttons; test this in Task 3.

---

## File structure

- `src/app/preferences/blacklist-entry.ts` — stable blacklist-entry interface shared by service, pages, and tests.
- `src/app/preferences/preferences-storage.ts` — versioned blacklist storage key next to the existing favorite key.
- `src/app/preferences/preferences.service.ts` — validates, persists, mutates, sorts, and exposes blacklist state.
- `src/app/preferences/preferences.service.spec.ts` — service storage and mutation coverage.
- `src/app/drop-list/drop-list.ts|html|scss|spec.ts` — emits and renders the non-favorite blacklist control.
- `src/app/drops-page/drops-page.ts|html|scss|spec.ts` — owns the live provider state and derives visible favorite and active lists.
- `src/app/preferences-page/preferences-page.ts|html|scss|spec.ts` — routed Preferences screen and collapsible table.
- `src/app/conflict-resolution/conflict-resolution.ts|html|scss|spec.ts` — focused accessible modal for resolving all stored preference conflicts.
- `src/app/app.ts|html|scss|spec.ts` — application shell, header, conflict gate, and router outlet.
- `src/app/app.routes.ts` and `src/app/app.config.ts` — page routes and hash-routing provider setup.

### Task 1: Persist typed blacklist preferences

**Files:**
- Create: `src/app/preferences/blacklist-entry.ts`
- Modify: `src/app/preferences/preferences-storage.ts`
- Modify: `src/app/preferences/preferences.service.ts`
- Modify: `src/app/preferences/preferences.service.spec.ts`

**Interfaces:**
- Produces `BlacklistEntry { id: string; gameName: string; blacklistedAt: string }`.
- Produces `PreferencesService.blacklistEntries: Signal<readonly BlacklistEntry[]>`.
- Produces `addBlacklist(id: string, gameName: string): void` and `removeBlacklist(id: string): void`.
- Existing `favoriteIds`, `addFavorite`, and `removeFavorite` remain unchanged.

- [ ] **Step 1: Write failing service tests for valid persistence, invalid input, ordering, removal, and session-only storage.**

Replace the current one-key `createStorage` helper with a `Map<string, string>`-backed `Storage` stub so favorite and blacklist keys can be tested independently:

```ts
function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
```

```ts
it('adds a dated blacklist entry once and persists it', () => {
  vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-09-21T10:00:00.000Z');
  const storage = createStorage();
  const service = configure(storage);

  service.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
  service.addBlacklist('/game/sea-of-thieves', 'Different name');

  expect(service.blacklistEntries()).toEqual([
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
  ]);
  expect(storage.getItem(BLACKLIST_ENTRIES_STORAGE_KEY)).toContain('2026-09-21T10:00:00.000Z');
});

it('rejects malformed entries and keeps the newest entry for duplicate IDs', () => {
  const service = configure(createStorage({ [BLACKLIST_ENTRIES_STORAGE_KEY]: JSON.stringify([
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-22T10:00:00.000Z' },
    { id: '/game/bad', gameName: '', blacklistedAt: 'not-a-date' },
  ]) }));

  expect(service.blacklistEntries()).toEqual([
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-22T10:00:00.000Z' },
  ]);
});
```

- [ ] **Step 2: Run the focused test file and verify it fails because blacklist APIs and storage key do not exist.**

Run: `npm test -- --watch=false src/app/preferences/preferences.service.spec.ts`

Expected: FAIL with TypeScript errors for `addBlacklist`, `blacklistEntries`, and `BLACKLIST_ENTRIES_STORAGE_KEY`.

- [ ] **Step 3: Define the model, storage key, and minimal validated persistence implementation.**

```ts
export interface BlacklistEntry {
  readonly id: string;
  readonly gameName: string;
  readonly blacklistedAt: string;
}

export const BLACKLIST_ENTRIES_STORAGE_KEY = 'personal-twitch-drops.blacklist-entries.v1';

readonly blacklistEntries = signal<readonly BlacklistEntry[]>(this.readBlacklistEntries());

addBlacklist(id: string, gameName: string): void {
  if (!id || !gameName || this.blacklistEntries().some((entry) => entry.id === id)) return;
  const next = [{ id, gameName, blacklistedAt: new Date().toISOString() }, ...this.blacklistEntries()];
  this.blacklistEntries.set(next);
  this.persistBlacklist(next);
}

removeBlacklist(id: string): void {
  const next = this.blacklistEntries().filter((entry) => entry.id !== id);
  if (next.length === this.blacklistEntries().length) return;
  this.blacklistEntries.set(next);
  this.persistBlacklist(next);
}
```

Implement `readBlacklistEntries` so it accepts only arrays of entries whose `id` and `gameName` are non-empty strings and whose timestamp round-trips through `new Date(value).toISOString()`. Collapse duplicate IDs to the newest timestamp and return descending timestamp order. Use the existing `try/catch` storage pattern. Keep the existing favorite persistence methods untouched.

- [ ] **Step 4: Run the service tests and verify they pass.**

Run: `npm test -- --watch=false src/app/preferences/preferences.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the preference boundary.**

```bash
git add src/app/preferences
git commit -m "feat: persist blacklisted games"
```

### Task 2: Add the blacklist action to active Drop rows

**Files:**
- Modify: `src/app/drop-list/drop-list.ts`
- Modify: `src/app/drop-list/drop-list.html`
- Modify: `src/app/drop-list/drop-list.scss`
- Modify: `src/app/drop-list/drop-list.spec.ts`

**Interfaces:**
- Consumes `activeDrops: readonly ActiveDrop[]` supplied by the future Drops page.
- Produces `blacklistRequested: OutputEmitterRef<ActiveDrop>`.
- Keeps `favoriteRequested: OutputEmitterRef<string>` and `unfavoriteRequested: OutputEmitterRef<string>` intact.

- [ ] **Step 1: Write failing component tests for the new control and favorite exclusion.**

```ts
it('emits the active drop when its blacklist button is clicked', () => {
  const blacklistRequested = vi.fn();
  fixture.componentInstance.blacklistRequested.subscribe(blacklistRequested);
  render([], [sea]);

  const button = fixture.nativeElement.querySelector<HTMLButtonElement>('[data-drop-id="/game/sea-of-thieves"] .blacklist-button');
  expect(button?.title).toBe('Blacklist');
  expect(button?.getAttribute('aria-label')).toBe('Blacklist Sea of Thieves');
  button?.click();
  expect(blacklistRequested).toHaveBeenCalledWith(sea);
});

it('does not render a blacklist button on favorite rows', () => {
  render([sea], []);
  expect(fixture.nativeElement.querySelector('.favorites-section .blacklist-button')).toBeNull();
});
```

- [ ] **Step 2: Run the focused test file and verify it fails because the output and button are absent.**

Run: `npm test -- --watch=false src/app/drop-list/drop-list.spec.ts`

Expected: FAIL with a missing `blacklistRequested` property and no `.blacklist-button`.

- [ ] **Step 3: Add a separate accessible circular-slash button to non-favorite rows.**

```ts
readonly blacklistRequested = output<ActiveDrop>();

protected blacklist(drop: ActiveDrop): void {
  this.blacklistRequested.emit(drop);
}
```

```html
<button class="blacklist-button" type="button" title="Blacklist"
  [attr.aria-label]="'Blacklist ' + drop.gameName" (click)="blacklist(drop)">⊘</button>
```

Place it beside the existing normal star in each Active Drops row, not in the Favorites markup. Add a visible `:focus-visible` outline, touch-safe padding, neutral color, and responsive behavior that preserves the row width at 320px. Do not alter the armed-unfavorite behavior.

- [ ] **Step 4: Run the focused test file and verify it passes.**

Run: `npm test -- --watch=false src/app/drop-list/drop-list.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the row-level interaction.**

```bash
git add src/app/drop-list
git commit -m "feat: add active drop blacklist control"
```

### Task 3: Split the routed pages and build Preferences

**Files:**
- Create: `src/app/drops-page/drops-page.ts`
- Create: `src/app/drops-page/drops-page.html`
- Create: `src/app/drops-page/drops-page.scss`
- Create: `src/app/drops-page/drops-page.spec.ts`
- Create: `src/app/preferences-page/preferences-page.ts`
- Create: `src/app/preferences-page/preferences-page.html`
- Create: `src/app/preferences-page/preferences-page.scss`
- Create: `src/app/preferences-page/preferences-page.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes `PreferencesService.blacklistEntries`, `addBlacklist`, and `removeBlacklist` from Task 1.
- Consumes `DropListComponent.blacklistRequested` from Task 2.
- Produces routes `'' -> DropsPageComponent` and `'preferences' -> PreferencesPageComponent`.
- `DropsPageComponent` owns the existing `DropsProvider` request/version/loading/failure behavior.

- [ ] **Step 1: Write failing page tests for list partitioning and Preferences table behavior.**

```ts
it('hides a blacklisted active drop while retaining favorites and other active drops', () => {
  preferences.addBlacklist('/game/valorant', 'VALORANT');
  const fixture = TestBed.createComponent(DropsPageComponent);
  fixture.detectChanges();
  provider.requests[0].next([sea, valorant]);
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
  expect(fixture.nativeElement.textContent).not.toContain('VALORANT');
});

it('toggles the Blacklisted Games table and removes a row', () => {
  preferences.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
  const fixture = TestBed.createComponent(PreferencesPageComponent);
  fixture.detectChanges();

  fixture.nativeElement.querySelector<HTMLButtonElement>('.blacklist-disclosure')?.click();
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Blacklisted on');
  fixture.nativeElement.querySelector<HTMLButtonElement>('[data-blacklist-id="/game/sea-of-thieves"] .remove-blacklist')?.click();
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('No games are blacklisted.');
});
```

- [ ] **Step 2: Run the two focused test files and verify they fail because page components and routes do not exist.**

Run: `npm test -- --watch=false src/app/drops-page/drops-page.spec.ts src/app/preferences-page/preferences-page.spec.ts`

Expected: FAIL with module-resolution errors.

- [ ] **Step 3: Move the current live-Drops behavior into `DropsPageComponent` and add blacklist partitioning.**

Move `drops`, `loading`, `updatedAt`, `loadFailed`, `requestVersion`, `loadDrops`, and `updatedLabel` from `App` unchanged except for the new partitions. Compute blacklisted IDs from `preferences.blacklistEntries()` and use them in both filters:

```ts
protected readonly favoriteDrops = computed(() => {
  const favoriteIds = this.preferences.favoriteIds();
  const blacklistedIds = new Set(this.preferences.blacklistEntries().map((entry) => entry.id));
  return this.drops().filter((drop) => favoriteIds.has(drop.id) && !blacklistedIds.has(drop.id));
});

protected readonly activeDrops = computed(() => {
  const favoriteIds = this.preferences.favoriteIds();
  const blacklistedIds = new Set(this.preferences.blacklistEntries().map((entry) => entry.id));
  return this.drops().filter((drop) => !favoriteIds.has(drop.id) && !blacklistedIds.has(drop.id));
});
```

Bind `(blacklistRequested)="preferences.addBlacklist($event.id, $event.gameName)"` on `app-drop-list`. Preserve the current heading, error, Retry, and refresh behavior in the new page template.

- [ ] **Step 4: Implement the Preferences page and router configuration.**

Use a `signal(false)` for disclosure state. Render the heading as a real button with `aria-expanded` and a chevron that changes between `⌄` and `⌃`. When expanded, render a semantic table from `preferences.blacklistEntries()`; format dates with `Intl.DateTimeFormat` in the component and provide the exact empty state `No games are blacklisted.`. Each row must include `data-blacklist-id`, a native `Remove from blacklist` button, and its own accessible name.

```ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DropsPageComponent },
  { path: 'preferences', component: PreferencesPageComponent },
  { path: '**', redirectTo: '' },
];
```

Add `withHashLocation()` to `provideRouter(routes, withHashLocation())` so `/#/preferences` works on static GitHub Pages hosting.

- [ ] **Step 5: Run page tests and verify they pass.**

Run: `npm test -- --watch=false src/app/drops-page/drops-page.spec.ts src/app/preferences-page/preferences-page.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the routed page split.**

```bash
git add src/app/drops-page src/app/preferences-page src/app/app.routes.ts src/app/app.config.ts
git commit -m "feat: add blacklist preferences page"
```

### Task 4: Gate the application with multi-conflict resolution

**Files:**
- Create: `src/app/conflict-resolution/conflict-resolution.ts`
- Create: `src/app/conflict-resolution/conflict-resolution.html`
- Create: `src/app/conflict-resolution/conflict-resolution.scss`
- Create: `src/app/conflict-resolution/conflict-resolution.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.scss`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Consumes `PreferencesService.favoriteIds`, `blacklistEntries`, `removeFavorite`, and `removeBlacklist` from Task 1.
- Produces `ConflictResolutionComponent` inputs `conflicts: readonly BlacklistEntry[]` and outputs `keepFavoriteRequested: string`, `hideRequested: string`.
- The root `App` derives conflicts as blacklist entries whose IDs exist in `favoriteIds`.

- [ ] **Step 1: Write failing modal and shell tests, including direct Preferences routing.**

```ts
it('gates all routed content and provider creation until every conflict is resolved', async () => {
  localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify(['/game/sea-of-thieves', '/game/valorant']));
  localStorage.setItem(BLACKLIST_ENTRIES_STORAGE_KEY, JSON.stringify([
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
    { id: '/game/valorant', gameName: 'VALORANT', blacklistedAt: '2026-09-20T10:00:00.000Z' },
  ]));
  await router.navigateByUrl('/preferences');
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();

  expect(provider.requests).toHaveLength(0);
  expect(fixture.nativeElement.querySelectorAll('.conflict-row')).toHaveLength(2);
  expect(fixture.nativeElement.textContent).not.toContain('Active Drops');
  expect(fixture.nativeElement.textContent).not.toContain('Blacklisted Games');
});

it('removes one conflict at a time and starts routed Drops only after the final choice', () => {
  localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify(['/game/sea-of-thieves', '/game/valorant']));
  localStorage.setItem(BLACKLIST_ENTRIES_STORAGE_KEY, JSON.stringify([
    { id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', blacklistedAt: '2026-09-21T10:00:00.000Z' },
    { id: '/game/valorant', gameName: 'VALORANT', blacklistedAt: '2026-09-20T10:00:00.000Z' },
  ]));
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  fixture.nativeElement.querySelector<HTMLButtonElement>('[data-conflict-id="/game/sea-of-thieves"] .keep-favorite')?.click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.conflict-row')).toHaveLength(1);
  expect(provider.requests).toHaveLength(0);
  fixture.nativeElement.querySelector<HTMLButtonElement>('[data-conflict-id="/game/valorant"] .hide-game')?.click();
  fixture.detectChanges();
  expect(provider.requests).toHaveLength(1);
});
```

Add a component-level test that asserts the dialog has `role="dialog"`, `aria-modal="true"`, exactly displays `Something went wrong with <game>.`, and emits the matching IDs for both buttons.

- [ ] **Step 2: Run the focused test files and verify they fail because the dialog component and app gate do not exist.**

Run: `npm test -- --watch=false src/app/conflict-resolution/conflict-resolution.spec.ts src/app/app.spec.ts`

Expected: FAIL with module-resolution or missing-selector errors.

- [ ] **Step 3: Implement the dialog and root gate.**

```ts
protected readonly conflicts = computed(() => {
  const favoriteIds = this.preferences.favoriteIds();
  return this.preferences.blacklistEntries().filter((entry) => favoriteIds.has(entry.id));
});

protected keepFavorite(id: string): void { this.preferences.removeBlacklist(id); }
protected hideGame(id: string): void { this.preferences.removeFavorite(id); }
```

Keep `App` as the header and router shell. Replace its current inlined Drops markup with a conditional router outlet:

```html
<header class="app-header">
  <a class="wordmark" href="./" aria-label="Personal Twitch Drops home">Personal <span>Twitch Drops</span></a>
  <nav aria-label="Application actions">
    <a class="preferences-link" routerLink="/preferences">Preferences</a>
    <button type="button">Changes · 2</button>
  </nav>
</header>
@if (conflicts().length) {
  <app-conflict-resolution [conflicts]="conflicts()"
    (keepFavoriteRequested)="keepFavorite($event)"
    (hideRequested)="hideGame($event)" />
} @else {
  <router-outlet />
}
```

The conflict component must render all entries as rows, use a real modal backdrop/dialog, primary styling for `.keep-favorite`, neutral-grey styling for `.hide-game`, and visible focus styles. Do not instantiate the outlet while conflicts exist; that guarantees neither page nor its provider request can run even if the modal is hidden with developer tools.

- [ ] **Step 4: Run focused shell and dialog tests and verify they pass.**

Run: `npm test -- --watch=false src/app/conflict-resolution/conflict-resolution.spec.ts src/app/app.spec.ts`

Expected: PASS.

- [ ] **Step 5: Run the complete automated checks.**

Run: `npm test -- --watch=false`

Expected: PASS.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: production build completes without an error.

- [ ] **Step 6: Manually verify browser behavior.**

Run: `npm start`

Verify: blacklisting immediately removes a non-favorite active row; tooltip and keyboard focus work; the Preferences link opens `/#/preferences`; disclosure table has correct dates, sorting, empty state, and removal; reloading retains entries; injected overlapping storage entries show all conflicts and no underlying content until every action is chosen; layout has no horizontal overflow at 320px.

- [ ] **Step 7: Commit the conflict gate and verification-ready feature.**

```bash
git add src/app/conflict-resolution src/app/app.ts src/app/app.html src/app/app.scss src/app/app.spec.ts
git commit -m "feat: resolve favorite blacklist conflicts"
```
