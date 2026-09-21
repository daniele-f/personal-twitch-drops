# Live Drops Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load active Twitch Drops from `twitchdrops.app`, show animated skeleton cards while loading, and show a retryable error on failure.

**Architecture:** `TwitchDropsAppProvider` fetches source HTML and normalizes its game-card attributes into application models. `App` owns loading, success, and failure Signals, while the existing focused list component renders either normalized rows or decorative skeleton rows. Saved HTML fixtures are for automated tests only and never a runtime fallback.

**Tech Stack:** Angular standalone components, Signals, `HttpClient`, RxJS, SCSS, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-09-21-live-drops-loading-design.md`

## Global Constraints

- Fetch `https://twitchdrops.app/` directly; add neither a backend nor a dependency.
- Keep source selectors and raw HTML outside Angular components.
- Never register fixture data as a production fallback.
- Render exactly four skeleton rows while a load or Retry request is active.
- Disable the shimmer under `prefers-reduced-motion: reduce`.
- Keep GitHub Pages compatibility and 320px readability.
- Do not add preferences, persistence, refresh cooldowns, changes, notifications, or alternate providers.

## Review Focus

- Network failures show a Retry state, never fixture or stale placeholder campaigns.
- Cards missing a usable game name, end date, or positive numeric reward count are skipped.
- Valid cards without an image retain a readable visual-cover fallback.
- Retry re-enters loading and replaces the error after success.
- Reduced-motion users see skeleton structure with no moving gradient.

---

## File Structure

- Create `src/app/drops/active-drop.ts`: source-independent normalized model.
- Create `src/app/drops/drops-provider.ts`: injectable provider contract.
- Create `src/app/drops/twitch-drops-app.provider.ts`: HTTP request and source parsing.
- Create `src/app/drops/twitch-drops-app.provider.spec.ts`: fixture-driven parser and HTTP tests.
- Create `src/test/fixtures/twitchdrops-active.html`: valid and invalid source-like cards.
- Modify `src/app/app.config.ts`: HTTP and provider registration.
- Modify `src/app/drop-list/*`: normalized rows and skeleton state.
- Modify `src/app/app.*`: request state, Retry, and integration tests.

### Task 1: Add the normalized Twitch Drops provider

**Files:**
- Create: `src/app/drops/active-drop.ts`, `src/app/drops/drops-provider.ts`, `src/app/drops/twitch-drops-app.provider.ts`, `src/app/drops/twitch-drops-app.provider.spec.ts`, `src/test/fixtures/twitchdrops-active.html`
- Modify: `src/app/app.config.ts`
- Test: `src/app/drops/twitch-drops-app.provider.spec.ts`

**Interfaces:**
- Produces `ActiveDrop { id, gameName, rewardCount, endsAt, imageUrl? }`.
- Produces `DropsProvider.loadActiveDrops(): Observable<readonly ActiveDrop[]>`.
- Parses `.game-card[data-game][data-drops][data-end]` anchors and optional descendant `img` elements.

- [ ] **Step 1: Write the failing fixture-backed provider tests**

Create a fixture with two valid cards, one valid card without an image, and invalid cards missing `data-game`, `data-drops`, or `data-end`. Test that only valid cards are returned, `href` becomes `id`, the positive integer reward count and ISO date are normalized, a missing image remains undefined, and an HTTP error reaches the subscriber.

```typescript
expect(result).toEqual([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 8, endsAt: '2026-09-28T12:00:00.000Z', imageUrl: 'https://cdn.example.test/sea.png' }]);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/drops/twitch-drops-app.provider.spec.ts`

Expected: FAIL because no provider exists.

- [ ] **Step 3: Define the normalized contract and minimal provider**

```typescript
export interface ActiveDrop {
  readonly id: string;
  readonly gameName: string;
  readonly rewardCount: number;
  readonly endsAt: string;
  readonly imageUrl?: string;
}

export abstract class DropsProvider {
  abstract loadActiveDrops(): Observable<readonly ActiveDrop[]>;
}
```

Implement `TwitchDropsAppProvider` with `HttpClient.get('https://twitchdrops.app/', { responseType: 'text' })`, `DOMParser`, and the listed selector. Reject invalid cards, preserve a valid image `src`, and return an empty array only when parsing a valid document with no valid cards. Register `provideHttpClient()` and `{ provide: DropsProvider, useClass: TwitchDropsAppProvider }` in `app.config.ts`.

```typescript
return this.http.get(TWITCH_DROPS_URL, { responseType: 'text' }).pipe(map((html) => this.parseActiveDrops(html)));
```

- [ ] **Step 4: Run the test and commit the provider boundary**

Run: `npm test -- --watch=false --run src/app/drops/twitch-drops-app.provider.spec.ts`

Expected: PASS using `HttpTestingController` and the saved fixture, with no real request.

```powershell
git add src/app/drops src/test/fixtures/twitchdrops-active.html src/app/app.config.ts
git commit -m "feat: add Twitch Drops provider"
```

### Task 2: Render real rows and loading skeletons

**Files:**
- Modify: `src/app/drop-list/drop-list.ts`, `src/app/drop-list/drop-list.html`, `src/app/drop-list/drop-list.scss`, `src/app/drop-list/drop-list.spec.ts`
- Test: `src/app/drop-list/drop-list.spec.ts`

**Interfaces:**
- Consumes `drops: readonly ActiveDrop[]` and `loading: boolean`.
- Produces a semantic Drops list or exactly four decorative skeleton rows.

- [ ] **Step 1: Write failing list-state tests**

Replace section tests with a real `ActiveDrop` input test for game name, reward summary, end information, and image URL. Add a loading test for four `.drop-row--skeleton` elements and no readable fixture game name. Add a no-image test expecting `.cover-placeholder` rather than an `img`.

```typescript
fixture.componentRef.setInput('loading', true);
fixture.componentRef.setInput('drops', []);
fixture.detectChanges();
expect(fixture.nativeElement.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts`

Expected: FAIL because the component still requires section-shaped placeholders.

- [ ] **Step 3: Refactor the list and add shimmer styles**

Replace `sections` with required `drops` and `loading` inputs. Render a single semantic `<ul>` of real rows when not loading; render four `aria-hidden` skeleton articles plus one polite loading message when loading. Use the existing cover fallback for absent images and format the summary as `N reward(s) · Ends <date>`.

```typescript
readonly drops = input.required<readonly ActiveDrop[]>();
readonly loading = input.required<boolean>();
```

Add `.skeleton-block` with a 200%-wide purple/neutral gradient and a keyframe shifting its background position. Apply it only to skeleton thumbnail and text blocks; set `animation: none` inside `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run the test and commit list states**

Run: `npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts`

Expected: PASS for real data, absent images, and four skeletons.

```powershell
git add src/app/drop-list
git commit -m "feat: show live Drop list states"
```

### Task 3: Wire initial load, failure, and Retry

**Files:**
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`, `src/app/app.spec.ts`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes injected `DropsProvider` and `DropListComponent` inputs.
- Produces `loadDrops()`, `loading`, `drops`, `updatedAt`, and `loadFailed` Signals.

- [ ] **Step 1: Write failing app-flow tests**

Override `DropsProvider` with a `Subject`-backed test double. Assert first render requests Drops and shows skeletons; a success emits a game and update copy; an error shows the exact message `We couldn't load active Drops right now.` plus Retry; clicking Retry causes a second call and restores skeletons before success.

```typescript
compiled.querySelector<HTMLButtonElement>('.retry')?.click();
expect(provider.loadActiveDrops).toHaveBeenCalledTimes(2);
expect(compiled.querySelectorAll('.drop-row--skeleton')).toHaveLength(4);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --watch=false --run src/app/app.spec.ts`

Expected: FAIL because `App` still imports `SHELL_SECTIONS`.

- [ ] **Step 3: Implement Signals, UI bindings, and error style**

Inject `DropsProvider` and call `loadDrops()` at startup. Before every request set loading true, clear failure and rows; on success set rows and `new Date()` update time; on error set failure and stop loading. Bind the header Refresh button and a labeled Retry button to `loadDrops()`. Bind `<app-drop-list [drops]="drops()" [loading]="loading()" />`, success count text, and a wrapping `.load-error` panel using existing theme variables.

```typescript
protected loadDrops(): void {
  this.loading.set(true); this.loadFailed.set(false); this.drops.set([]);
  this.dropsProvider.loadActiveDrops().subscribe({
    next: (drops) => { this.drops.set(drops); this.updatedAt.set(new Date()); this.loading.set(false); },
    error: () => { this.loadFailed.set(true); this.loading.set(false); },
  });
}
```

- [ ] **Step 4: Run the app test and commit live loading**

Run: `npm test -- --watch=false --run src/app/app.spec.ts`

Expected: PASS for loading, success, error, and Retry without a real request.

```powershell
git add src/app/app.ts src/app/app.html src/app/app.scss src/app/app.spec.ts
git commit -m "feat: load active Twitch Drops"
```

### Task 4: Verify the completed feature

**Files:**
- Modify: none unless verification reveals a scoped defect
- Test: full checks and browser smoke test

- [ ] **Step 1: Run all required automated checks**

```powershell
npm test -- --watch=false
npm run lint
npm run build
git diff --check
git diff origin/main...HEAD --name-only
git status --short
```

Expected: all checks pass; only feature files, fixtures, spec, and plan are tracked; the pre-existing `AGENTS.md` edit stays unstaged.

- [ ] **Step 2: Manually smoke-test live behavior**

Run `npm start` and inspect the local URL. Verify skeletons before a real response, real rows after it, readable no-image rows, a disconnected-network error with Retry, Retry recovery after reconnection, desktop layout, and 320px layout.

- [ ] **Step 3: Commit only a scoped verification fix if needed**

```powershell
git add src/app src/test
git commit -m "fix: handle live Drops loading edge case"
```

Do not commit if verification finds no scoped defect.
