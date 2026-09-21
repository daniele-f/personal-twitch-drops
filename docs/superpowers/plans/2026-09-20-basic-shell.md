# Basic Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary starter page with a responsive favorites-first Personal Twitch Drops visual shell.

**Architecture:** The root app owns the header and page structure. A focused presentational component receives typed local placeholder section data, keeping future provider, persistence, and state work outside the visual shell.

**Tech Stack:** Angular standalone components, TypeScript, SCSS, Angular template control flow, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-basic-shell-design.md`

## Global Constraints

- Use only typed static placeholder data; do not add Twitch API calls, providers, localStorage, IndexedDB, filters, refresh behavior, notifications, or button actions.
- Show Favorites before Newly added.
- Do not badge Favorites entries as Favorite; show “New” only for newly added favorites and entries in Newly added.
- Header controls are visible, labeled, and presentational only.
- Use existing dark Twitch-purple CSS custom properties and support 320px widths without horizontal scrolling.
- Keep the page compatible with static GitHub Pages hosting.

## Review Focus

- An empty future Favorites section should have a clear, non-broken state when real data replaces placeholders.
- Long game and campaign titles must wrap without pushing status labels outside narrow viewports.
- Status must remain understandable without color alone.
- Header actions must retain visible labels and usable wrapping on narrow widths.
- Placeholder data must not be accidentally coupled to Twitch provider DTO shapes.

---

### Task 1: Define typed shell data and render favorites-first list sections

**Files:**
- Create: `src/app/shell-data.ts`, `src/app/drop-list/drop-list.ts`, `src/app/drop-list/drop-list.html`, `src/app/drop-list/drop-list.scss`, `src/app/drop-list/drop-list.spec.ts`
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts`
- Test: `src/app/drop-list/drop-list.spec.ts`, `src/app/app.spec.ts`

**Interfaces:**
- Produces: `DropListSection` with `title`, `countLabel`, and `items`; `DropListItem` with `game`, `campaign`, `indicator`, and `indicatorKind`.
- Consumes: typed `SHELL_SECTIONS` placeholder data from `shell-data.ts`.

- [ ] **Step 1: Write failing component tests**

Add tests that render a `DropListComponent` with explicit Favorites and Newly added input sections. Assert Favorites appears before Newly added and that a favorite item and new indicator are visible.

```typescript
expect(sectionTitles).toEqual(['Favorites', 'Newly added']);
expect(fixture.nativeElement.textContent).toContain('The Elder Scrolls Online');
expect(fixture.nativeElement.textContent).toContain('New');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts`

Expected: FAIL because `DropListComponent` does not exist.

- [ ] **Step 3: Implement the typed data boundary and standalone list component**

Create readonly typed placeholder sections, then implement the standalone component with an input of `readonly DropListSection[]`. Render semantic `section`, `ul`, `li`, and `article` elements. Include an empty state when a section has no items.

```typescript
export interface DropListItem {
  readonly game: string;
  readonly campaign: string;
  readonly indicator: string;
  readonly indicatorKind: 'favorite' | 'new';
}
```

- [ ] **Step 4: Replace the starter content with the app shell**

Render a semantic header containing Preferences, Changes, and Refresh buttons; render Active Drops and `DropListComponent` with `SHELL_SECTIONS`. Do not attach click handlers.

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
npm test -- --watch=false --run src/app/drop-list/drop-list.spec.ts
npm test -- --watch=false
```

Expected: focused and full suites pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app/app.ts src/app/app.html src/app/app.spec.ts src/app/shell-data.ts src/app/drop-list
git commit -m "feat: add favorites-first drop list shell"
```

### Task 2: Style the responsive focused shell and verify production output

**Files:**
- Modify: `src/styles.scss`, `src/app/app.scss`, `src/app/drop-list/drop-list.scss`
- Test: full Angular suite, lint, and production build.

**Interfaces:**
- Consumes: semantic shell and list markup from Task 1.
- Produces: responsive presentation that preserves text and labeled indicators on narrow screens.

- [ ] **Step 1: Add responsive shell styles**

Style the header, action row, page heading, sections, rows, thumbnail placeholders, and favorite/new indicators with existing CSS variables. Use grid/flex wrapping and `min-width: 0` so title text wraps. At narrow widths, let header controls wrap and stack row detail without horizontal overflow.

```scss
.drop-row {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr) auto;
}
```

- [ ] **Step 2: Run automated verification**

Run:

```powershell
npm test -- --watch=false
npm run lint
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Inspect static build scope**

Run:

```powershell
git diff --check
git status --short
git diff main...HEAD --name-only
```

Expected: only the basic-shell source, tests, styles, and committed design/plan files are present; no generated output is tracked.

- [ ] **Step 4: Commit**

```powershell
git add src/styles.scss src/app/app.scss src/app/drop-list/drop-list.scss
git commit -m "style: refine responsive Twitch Drops shell"
```

## Self-review

- Spec coverage: Task 1 implements typed placeholders, header actions, section order, semantic markup, and empty state. Task 2 implements responsive dark visual hierarchy and verifies the final static build.
- Placeholder scan: no incomplete steps remain.
- Type consistency: `DropListSection` and `DropListItem` names match between data, component input, and tests.
- Review focus: Task 1 covers empty sections and semantic labels; Task 2 covers responsive title/action layout and static hosting build behavior.
