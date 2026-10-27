# Reward Filter Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display live hidden-game and hidden-reward totals inside the reward Filters popover.

**Architecture:** `DropListComponent` already owns the loaded drops, reward details, and filtering predicates. It will calculate the totals and pass them to the reusable filter-menu component, which only renders the supplied summary.

**Tech Stack:** Angular signals, standalone components, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-reward-filter-summary-design.md`

## Global Constraints

- Do not change which rewards the checked filters hide.
- Keep the existing per-section hidden-game indication.

## Review Focus

- With no filters checked, the filter box reports zero hidden games and rewards.
- A subscription-only campaign contributes one hidden game and its reward count when only the subscriber filter is checked.
- A mixed campaign counts only rewards hidden by active filters.
- A campaign with overlapping subscriber and badge classification is counted once as a hidden game.
- The summary updates after checkbox interaction without a data refresh.

---

### Task 1: Pass filter totals from the drop list to the filter menu

**Files:**
- Modify: `src/app/drop-list/drop-list.ts`
- Modify: `src/app/drop-list/drop-list.html`
- Modify: `src/app/ui/reward-filter-menu.ts`
- Modify: `src/app/ui/reward-filter-menu.html`
- Test: `src/app/drop-list/drop-list.spec.ts`

**Interfaces:**
- Produces: `RewardFilterMenuComponent` inputs `hiddenGameCount: number` and `hiddenRewardCount: number`.
- Consumes: the existing `visibleRewards(drop)` and `isDropVisible(drop)` filter behavior.

- [x] **Step 1: Write the failing component test**

Add a test named `shows hidden game and reward counts in Filters` that loads one subscription-only and one mixed campaign, checks the subscriber checkbox, and asserts the menu contains `1 game hidden` and `2 rewards hidden`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npx ng test --watch=false --include src/app/drop-list/drop-list.spec.ts`

Expected: FAIL because the Filters popover has no count summary.

- [x] **Step 3: Implement live filter totals**

Calculate the number of supplied drops that have no visible rewards and the total difference between all and visible rewards. Pass those values to both filter-menu instances. Render a single summary line with the singular/plural forms `game(s) hidden · reward(s) hidden`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npx ng test --watch=false --include src/app/drop-list/drop-list.spec.ts`

Expected: PASS.

- [x] **Step 5: Run full verification**

Run: `npm test -- --watch=false`, `npm run lint`, and `npm run build`.

Expected: tests and lint pass; build succeeds subject to the existing bundle-budget warning.

- [x] **Step 6: Commit**

```bash
git add src/app/drop-list/drop-list.ts src/app/drop-list/drop-list.html src/app/drop-list/drop-list.spec.ts src/app/ui/reward-filter-menu.ts src/app/ui/reward-filter-menu.html docs/superpowers/specs/2026-10-27-reward-filter-summary-design.md docs/superpowers/plans/2026-10-27-reward-filter-summary.md
git commit -m "feat: show reward filter totals"
```
