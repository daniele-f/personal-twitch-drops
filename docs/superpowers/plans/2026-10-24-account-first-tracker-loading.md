# Account-First Tracker Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Drops with the correct local-or-account tracker profile, offer explicit full replacement for conflicts, and make account sync local-first and durable.

**Architecture:** The browser tracker profile remains the immediate cache, while Supabase is the authenticated durable profile. `TrackerSyncService` will compare normalized active profile content after replaying known pending operations, then adopt, initialize, or request a source choice. The Drops page will combine profile readiness with its first campaign request before rendering cards.

**Tech Stack:** Angular signals and standalone components, Vitest, Supabase JavaScript client/RPCs, browser localStorage.

**Spec:** `docs/superpowers/specs/2026-10-24-account-first-tracker-loading-design.md`

## Global Constraints

- Guests remain fully usable with browser-local tracker data; login is the sole cross-device transfer mechanism.
- A profile conflict never silently merges tracker data.
- Browser-source reconciliation fully replaces the account profile; account-source reconciliation fully replaces browser-local tracker data.
- Local state updates before network work; failed authenticated writes persist in the account-specific outbox.
- Keep snapshots, change state, celebration state, and transient UI state browser-only.
- Do not add credentials or service-role keys to the frontend.

## Review Focus

- Auth-session failure must let a guest see local cards instead of leaving initial skeletons indefinitely; test in Task 3.
- Settings-only differences must prompt reconciliation; test in Task 2.
- Known pending local mutations must replay before comparison; test in Task 2.
- Clearing a list while authenticated must enqueue a removal for every affected row; test in Task 1.
- A manual refresh must retain visible cards rather than showing skeletons; test in Task 3.

---

### Task 1: Complete local-first tracker mutations

**Files:**
- Modify: `src/app/preferences/preferences.service.ts`
- Test: `src/app/preferences/preferences.service.spec.ts`

**Interfaces:**
- Consumes: `TrackerMutationDispatcherService.record(mutation: TrackerMutation): void`.
- Produces: `clearFavorites()` and `clearBlacklist()` record per-item removals before replacing local collections.

- [ ] **Step 1: Write failing tests for bulk mutation records**

Assert `clearFavorites()` records one `unfavorite` per favorite and `clearBlacklist()` records one `unignore` per ignored entry, while both immediately clear local storage.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm test -- --run src/app/preferences/preferences.service.spec.ts`

Expected: FAIL because bulk clears do not record mutations.

- [ ] **Step 3: Record pre-clear IDs as removal mutations**

Preserve immediate local persistence and current toast behavior.

- [ ] **Step 4: Run the focused test to verify success**

Run: `npm test -- --run src/app/preferences/preferences.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/preferences/preferences.service.ts src/app/preferences/preferences.service.spec.ts
git commit -m "fix: queue tracker bulk removals"
```

### Task 2: Reconcile complete tracker profiles explicitly

**Files:**
- Modify: `src/app/account/tracker-sync.service.ts`
- Modify: `src/app/account/tracker-sync.models.ts`
- Modify: `supabase/migrations/20261020000000_operation_based_tracker_sync.sql` only if the existing import RPC cannot safely replace a profile
- Test: `src/app/account/tracker-sync.service.spec.ts`

**Interfaces:**
- Produces: `syncAfterAuthentication(): Promise<SyncResult>` that settles startup for adoption, initialization, conflict, or local fallback.
- Produces: `chooseInitialSource(source: 'browser' | 'account'): Promise<SyncResult>` that fully replaces the unchosen profile.

- [ ] **Step 1: Write failing reconciliation tests**

Cover matching state; settings-only differences; empty-to-nonempty initialization in both directions; differing profiles requiring a choice; browser choice replacing account state; account choice replacing local state; and queued mutations replaying before comparison.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm test -- --run src/app/account/tracker-sync.service.spec.ts`

Expected: FAIL because current logic counts active preferences rather than comparing complete profiles.

- [ ] **Step 3: Add semantic profile comparison and replacement**

Compare active favorites, ignored games, collected rewards, and settings without timestamps. Replay account-specific queued operations first. Use replacement-enabled initial import for the browser choice, and replace browser local state for the account choice.

- [ ] **Step 4: Add a forward-only migration only if the replacement contract requires it**

Keep RLS and server-authoritative timestamps intact.

- [ ] **Step 5: Run the focused test to verify success**

Run: `npm test -- --run src/app/account/tracker-sync.service.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/account/tracker-sync.service.ts src/app/account/tracker-sync.models.ts src/app/account/tracker-sync.service.spec.ts supabase/migrations
git commit -m "feat: reconcile complete tracker profiles"
```

### Task 3: Gate initial card rendering with skeletons

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/drops-page/drops-page.ts`
- Modify: `src/app/drops-page/drops-page.html`
- Modify: `src/app/drops-page/drops-page.scss`
- Test: `src/app/drops-page/drops-page.spec.ts`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: settled account/profile status from Task 2.
- Produces: three card-shaped skeleton placeholders used only for the initial request.

- [ ] **Step 1: Write failing initial/manual loading tests**

Assert a first campaign request with unresolved profile readiness renders exactly three skeletons and hides real cards; guest/error fallback releases cards; a manual refresh keeps existing cards visible.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- --run src/app/drops-page/drops-page.spec.ts src/app/app.spec.ts`

Expected: FAIL because loading only drives the refresh control.

- [ ] **Step 3: Add startup readiness coordination**

Resolve readiness for guest, adopted/initialized account, conflict prompt, and error fallback. Keep campaign retrieval concurrent.

- [ ] **Step 4: Render accessible skeleton cards**

Use a three-card layout matching the regular cards and a single loading status; never render skeletons over an already-loaded manual refresh.

- [ ] **Step 5: Run focused tests to verify success**

Run: `npm test -- --run src/app/drops-page/drops-page.spec.ts src/app/app.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/app.ts src/app/drops-page src/app/app.spec.ts
git commit -m "feat: show skeleton cards during initial loading"
```

### Task 4: Present the profile-source decision clearly

**Files:**
- Modify: `src/app/account/account-dialog.html`
- Modify: `src/app/account/account-dialog.ts`
- Modify: `src/app/account/account-dialog.scss`
- Test: `src/app/account/account-dialog.spec.ts`

**Interfaces:**
- Consumes: `TrackerSyncService.reconciliation()` and `chooseInitialSource(source)`.
- Produces: a two-action conflict message explaining full replacement rather than merging.

- [ ] **Step 1: Write failing dialog tests**

Assert “Use this browser’s data” and “Use my account’s data” appear with replacement language and invoke the corresponding source selection.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- --run src/app/account/account-dialog.spec.ts`

Expected: FAIL if current count-oriented copy does not satisfy the replacement contract.

- [ ] **Step 3: Update dialog copy and submission state**

Disable repeated source submissions while replacement is in progress and retain existing retry/status behavior.

- [ ] **Step 4: Run focused tests to verify success**

Run: `npm test -- --run src/app/account/account-dialog.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/account/account-dialog.html src/app/account/account-dialog.ts src/app/account/account-dialog.scss src/app/account/account-dialog.spec.ts
git commit -m "feat: clarify tracker source replacement"
```

### Task 5: Remove import and export as a transfer path

**Files:**
- Delete: `src/app/preferences/import-export.service.ts`
- Delete: `src/app/preferences/import-export.service.spec.ts`
- Modify: `src/app/preferences-page/preferences-page.ts`
- Modify: `src/app/preferences-page/preferences-page.html`
- Modify: `src/app/preferences-page/preferences-page.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing preferences-page tests**

Assert import/export controls and share-code inputs are absent and account-only transfer guidance is present.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- --run src/app/preferences-page/preferences-page.spec.ts`

Expected: FAIL because transfer controls still render.

- [ ] **Step 3: Remove import/export dependencies and update copy**

Delete the service/tests and explain that guest data remains in the current browser while an account is needed for cross-device preservation.

- [ ] **Step 4: Run focused tests to verify success**

Run: `npm test -- --run src/app/preferences-page/preferences-page.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/preferences src/app/preferences-page README.md
git commit -m "feat: make accounts the only transfer path"
```

### Task 6: Verify the integrated behavior

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 2: Run complete tests**

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.
