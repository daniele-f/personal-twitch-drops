# UI Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the agreed reusable UI primitives and catalog them without changing dashboard behavior.

**Architecture:** Shared standalone Angular components and directives live under `src/app/ui/` and receive display state through inputs or projected content. Existing feature components retain all domain state and actions, consuming primitives through their templates. Shared control styling moves from feature styles into the global stylesheet only when used by multiple feature areas.

**Tech Stack:** Angular 22 standalone components, TypeScript, SCSS, Vitest, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-28-ui-component-extraction-design.md`

## Global Constraints

- Preserve existing behavior, visual hierarchy, native control semantics, and static GitHub Pages compatibility.
- Shared UI must not access feature services or external-provider models.
- Icon-only buttons require an accessible name; expandable controls use `aria-expanded`.
- Update `docs/COMPONENTS.md` whenever a reusable UI primitive is added.
- Do not add dependencies, backend code, or browser-driven tests.

## Review Focus

- A disabled button should retain its native disabled behavior and never receive an active hover style (Task 1).
- A chevron must expose no interactive semantics and accurately reflect the expanded input (Task 2).
- A toggle label must activate its native checkbox while keyboard focus remains visible (Task 3).
- Projected game/drop card content must remain available without card components needing provider or preference services (Task 4).
- Existing preference removal confirmations and drop reward collection must remain unaffected after template migration (Task 5).

---

### Task 1: Standard button primitives

**Files:**
- Modify: `src/app/ui/button.directive.ts`
- Modify: `src/app/ui/button.directive.spec.ts`
- Modify: `src/styles.scss`
- Modify: feature templates that duplicate button styles

**Interfaces:**
- Produces: `ButtonVariant = 'default' | 'primary' | 'neutral' | 'icon' | 'destructive'` used as `[appButton]` on native buttons and links.

- [ ] **Step 1: Write failing directive tests for destructive classes and disabled button styling.**
- [ ] **Step 2: Run `npm test -- src/app/ui/button.directive.spec.ts` and confirm the new assertions fail because the destructive variant is absent.**
- [ ] **Step 3: Add the destructive host class and shared SCSS variant rules; replace equivalent duplicated feature button styles with `[appButton]`.**
- [ ] **Step 4: Run `npm test -- src/app/ui/button.directive.spec.ts` and confirm it passes.**
- [ ] **Step 5: Commit the button primitive extraction.**

### Task 2: Collapse chevron and disclosure primitives

**Files:**
- Create: `src/app/ui/collapse-chevron.ts`
- Create: `src/app/ui/collapse-chevron.html`
- Create: `src/app/ui/collapse-chevron.scss`
- Create: `src/app/ui/collapse-chevron.spec.ts`
- Create: `src/app/ui/disclosure.ts`
- Create: `src/app/ui/disclosure.html`
- Create: `src/app/ui/disclosure.scss`
- Create: `src/app/ui/disclosure.spec.ts`
- Modify: `src/app/preferences-page/preferences-page.ts`
- Modify: `src/app/preferences-page/preferences-page.html`
- Modify: `src/app/preferences-page/preferences-page.scss`

**Interfaces:**
- Produces: `CollapseChevronComponent` with required `expanded: boolean` input.
- Produces: `DisclosureComponent` with required `expanded: boolean`, optional `icon` and `count` inputs, and `toggled: void` output.
- Consumes: `CollapseChevronComponent` within the disclosure template.

- [ ] **Step 1: Write failing component tests for a chevron’s expanded class and a disclosure’s accessible expanded state/toggle output.**
- [ ] **Step 2: Run their focused tests and confirm they fail because the components do not exist.**
- [ ] **Step 3: Implement the standalone chevron and disclosure components using a native button and projected label content.**
- [ ] **Step 4: Run focused tests and confirm they pass.**
- [ ] **Step 5: Replace both Preferences disclosure controls and preserve their expanded signals and counts.**
- [ ] **Step 6: Run `npm test -- src/app/preferences-page/preferences-page.spec.ts` and confirm existing behavior passes.**
- [ ] **Step 7: Commit the disclosure extraction.**

### Task 3: Toggle and status badge primitives

**Files:**
- Create: `src/app/ui/toggle.ts`
- Create: `src/app/ui/toggle.html`
- Create: `src/app/ui/toggle.scss`
- Create: `src/app/ui/toggle.spec.ts`
- Create: `src/app/ui/status-badge.ts`
- Create: `src/app/ui/status-badge.html`
- Create: `src/app/ui/status-badge.scss`
- Create: `src/app/ui/status-badge.spec.ts`
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`
- Modify: `src/app/drop-list/drop-list.ts`, `src/app/drop-list/drop-list.html`, `src/app/drop-list/drop-list.scss`
- Modify: `src/app/preferences-page/preferences-page.ts`, `src/app/preferences-page/preferences-page.html`, `src/app/preferences-page/preferences-page.scss`

**Interfaces:**
- Produces: `ToggleComponent` with required `checked`, `label`, `controlId` inputs and `checkedChange: boolean` output.
- Produces: `StatusBadgeComponent` with required `status: 'active' | 'inactive' | 'unavailable' | 'pending'` input and projected/derived text.

- [ ] **Step 1: Write failing toggle tests for label association, emitted checkbox state, and focusable native input; write badge tests for each status class.**
- [ ] **Step 2: Run focused tests and confirm failures are due to missing components.**
- [ ] **Step 3: Implement both standalone display primitives, preserving the existing toggle visual and status colors.**
- [ ] **Step 4: Run focused tests and confirm they pass.**
- [ ] **Step 5: Replace changes and display-filter toggles plus the duplicated Preferences status spans.**
- [ ] **Step 6: Run app, drop-list, and preferences focused tests and confirm they pass.**
- [ ] **Step 7: Commit the toggle and status extraction.**

### Task 4: Game and drop card primitives

**Files:**
- Create: `src/app/ui/game-card.ts`, `src/app/ui/game-card.html`, `src/app/ui/game-card.scss`, `src/app/ui/game-card.spec.ts`
- Create: `src/app/ui/drop-card.ts`, `src/app/ui/drop-card.html`, `src/app/ui/drop-card.scss`, `src/app/ui/drop-card.spec.ts`
- Modify: `src/app/drop-list/drop-list.ts`
- Modify: `src/app/drop-list/drop-list.html`
- Modify: `src/app/drop-list/drop-list.scss`

**Interfaces:**
- Produces: `GameCardComponent` with required `title`, optional `imageUrl`, `expanded`, and projected metadata/actions/details slots.
- Produces: `DropCardComponent` with required `title`, `timeLabel`, `rewardSummary`, optional `imageUrl`, `expanded`, and projected metadata/actions/details slots.
- Consumes: Both components only from `DropListComponent`; all details retrieval, reward collection, favorite, and blacklist events remain owned by the list.

- [ ] **Step 1: Write failing card tests proving supplied labels/images render and projected actions/details remain in the DOM.**
- [ ] **Step 2: Run focused tests and confirm they fail because the components do not exist.**
- [ ] **Step 3: Implement semantic card shells and their isolated SCSS without injecting feature services.**
- [ ] **Step 4: Run focused card tests and confirm they pass.**
- [ ] **Step 5: Migrate favorite and active campaign rows to the card components, retaining existing data attributes, actions, expanded sections, and skeleton rows.**
- [ ] **Step 6: Run `npm test -- src/app/drop-list/drop-list.spec.ts` and confirm current interactions pass.**
- [ ] **Step 7: Commit the card extraction.**

### Task 5: Shared styles and component catalog

**Files:**
- Modify: `src/styles.scss`
- Modify: `src/app/app.scss`
- Modify: `src/app/preferences-page/preferences-page.scss`
- Create: `docs/COMPONENTS.md`

**Interfaces:**
- Produces: a component catalog that lists each shared primitive, purpose, API/variants, source locations, and current consumers.

- [ ] **Step 1: Write failing catalog assertions or a lightweight source-presence test for the required component names and source paths.**
- [ ] **Step 2: Run the focused check and confirm it fails because the catalog is missing.**
- [ ] **Step 3: Consolidate only repeated page-shell/form-control styling and author the catalog with the required entries.**
- [ ] **Step 4: Run the focused catalog check and confirm it passes.**
- [ ] **Step 5: Run `npm run lint`, `npm test`, and `npm run build`; fix any regression.**
- [ ] **Step 6: Commit documentation, style consolidation, and final verification changes.**
