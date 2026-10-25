> **Historical plan note (2026-10-25):** References to the retired account-wide “Restore all ignored games” action describe the earlier implementation, not current product behavior.

# Operation-Based Account Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace full-snapshot account synchronization with quiet, recoverable, operation-based preference sync.

**Architecture:** Supabase RPCs apply one server-authored tracker mutation at a time and enforce that a game cannot be both favorite and ignored. A local versioned outbox preserves mutations until successful delivery, while `TrackerSyncService` owns initial-link reconciliation, remote refresh, retry, and aggregate sync status. State services distinguish direct user changes from sync/recovery replacements so only direct actions produce item toasts.

**Tech Stack:** Angular 22 signals, TypeScript, Vitest, Supabase PostgreSQL migrations/RPC/RLS, Supabase JavaScript client, browser localStorage.

**Spec:** `docs/superpowers/specs/2026-10-20-operation-based-account-sync-design.md`

## Global Constraints

- Add only forward-only files under `supabase/migrations/`; never edit the deployed `20261018000000_account_sync.sql` migration.
- Do not expose Supabase secrets or service-role credentials in the Angular bundle or repository.
- Synchronization must never use a whole-collection upsert for routine edits.
- Only explicit direct user actions show per-game preference toasts; sync and recovery are aggregated.
- Preserve tombstones so stale devices cannot restore deleted state.
- Campaign snapshots, changes state, and Twitch inventory data stay local-only.
- Use mocked Supabase clients in automated app tests; do not use live database data as a test fixture.

## Review Focus

- A network timeout after a server-accepted mutation must not duplicate or reverse state on retry; Task 4 tests idempotent replay.
- Switching account in one browser must require a new initial-link decision and never import prior-account data; Task 4 tests account-scoped metadata.
- Legacy remote favorite/ignore conflicts remain safely resolvable; Task 4 tests fallback conflict exposure.
- A large remote sync produces no item toasts, including after refresh; Tasks 3 and 5 test the origin boundary and rendered summary.
- Bulk restore tombstones remote ignored rows without touching favorites or rewards; Tasks 1 and 5 test its scope and flow.

---

### Task 1: Add server-authoritative tracker mutation operations

**Files:**
- Create: `supabase/migrations/20261020000000_operation_based_tracker_sync.sql`
- Create: `supabase/README.md`

**Interfaces:**
- Produces RPCs: `apply_tracker_game_preference(p_action text, p_game_id text, p_game_name text default null)`, `set_tracker_settings(p_theme_color text, p_show_subscriptions boolean, p_show_badges boolean)`, `set_tracker_reward(p_campaign_id text, p_reward_name text, p_collected boolean)`, `restore_all_ignored_games()`, and `import_tracker_preferences(p_snapshot jsonb)`.
- Each derives identity from `auth.uid()`, validates its payload, writes only affected rows, and returns server-authored state.

- [ ] **Step 1: Add migration verification queries**

Add SQL comments/check queries proving: favorite tombstones an active ignored row for the same game; ignore tombstones an active favorite; bulk restore leaves favorites and rewards unchanged; and callers cannot supply user IDs or timestamps.

- [ ] **Step 2: Run migration lint to establish the local verification route**

Run: `npx supabase db lint`

Expected: a missing CLI/link is documented for staging verification; otherwise the command initially fails until valid SQL exists.

- [ ] **Step 3: Implement the five RPCs in the new migration**

Use `security invoker`, `auth.uid()` guards, database timestamps, and existing RLS. The game operation must atomically enforce one active favorite-or-ignored state. Preserve tombstones; never accept client `updated_at` values.

- [ ] **Step 4: Verify the migration**

Run: `npx supabase db lint`

Expected: PASS with no SQL syntax or security-linter errors.

- [ ] **Step 5: Write `supabase/README.md`**

Document table ownership, active/tombstoned state, RPCs, RLS, migration workflow, and exact non-destructive schema-verification command. State that migrations—not a committed live dump—are canonical.

- [ ] **Step 6: Commit**

Run: `git add supabase/migrations/20261020000000_operation_based_tracker_sync.sql supabase/README.md; git commit -m "feat: add tracker sync mutation RPCs"`

### Task 2: Create the typed local mutation outbox

**Files:**
- Create: `src/app/account/tracker-mutation.ts`
- Create: `src/app/account/tracker-sync-storage.ts`
- Create: `src/app/account/tracker-mutation-queue.service.ts`
- Create: `src/app/account/tracker-mutation-queue.service.spec.ts`
- Modify: `src/app/preferences/preferences-storage.ts`

**Interfaces:**
- Produces `TrackerMutation`, a discriminated union for `settings`, `favorite`, `unfavorite`, `ignore`, `unignore`, `set-collected`, `restore-all-ignored`, and `import`; variants contain desired state, never client timestamps.
- Produces `TrackerMutationQueueService.enqueue(mutation)`, `pending()`, `removeThrough(sequence)`, `clear()`, and `loadForAccount(accountId)`.
- Persists valid versioned account-scoped queue records under `personal-twitch-drops.tracker-sync.v1`.

- [ ] **Step 1: Write failing queue tests**

Test service recreation, malformed JSON rejection, account filtering, ordered acknowledgements, and retry preservation of the same desired-state operation.

- [ ] **Step 2: Verify the tests fail**

Run: `npx ng test --watch=false --include src/app/account/tracker-mutation-queue.service.spec.ts`

Expected: FAIL because the types and service do not exist.

- [ ] **Step 3: Implement queue validation and persistence**

Keep parsing/serialization in `tracker-sync-storage.ts`. Validate identifiers and settings enum values. Assign immutable ordered sequence numbers and retain entries until acknowledged.

- [ ] **Step 4: Verify the tests pass**

Run: `npx ng test --watch=false --include src/app/account/tracker-mutation-queue.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/account/tracker-mutation.ts src/app/account/tracker-sync-storage.ts src/app/account/tracker-mutation-queue.service.ts src/app/account/tracker-mutation-queue.service.spec.ts src/app/preferences/preferences-storage.ts; git commit -m "feat: queue tracker sync mutations locally"`

### Task 3: Make local tracker state origin-aware and emit mutations

**Files:**
- Create: `src/app/account/tracker-mutation-dispatcher.service.ts`
- Create: `src/app/account/tracker-mutation-dispatcher.service.spec.ts`
- Modify: `src/app/preferences/preferences.service.ts`
- Modify: `src/app/preferences/preferences.service.spec.ts`
- Modify: `src/app/drops/collected-rewards.service.ts`
- Modify: `src/app/drops/collected-rewards.service.spec.ts`
- Modify: `src/app/preferences/import-export.service.ts`
- Modify: `src/app/preferences/import-export.service.spec.ts`

**Interfaces:**
- Produces `TrackerMutationDispatcherService.record(mutation)`, `mutations`, and `clearRecorded()`.
- `PreferencesService.replaceLists(favorites, blacklist, origin: 'sync' | 'recovery' | 'import')` persists replacements without item toasts or mutation dispatch.
- Direct preference/settings/reward methods optimistically persist and send exactly one desired-state mutation to the dispatcher.

- [ ] **Step 1: Write failing state-service tests**

Assert each direct add/remove/settings/reward action records one mutation and retains its direct toast. Assert a large `sync` replacement records zero mutations and shows zero item notifications. Assert importing follows the explicit `import` path.

- [ ] **Step 2: Verify the tests fail**

Run: `npx ng test --watch=false --include src/app/preferences/preferences.service.spec.ts --include src/app/drops/collected-rewards.service.spec.ts --include src/app/preferences/import-export.service.spec.ts --include src/app/account/tracker-mutation-dispatcher.service.spec.ts`

Expected: FAIL because origin and dispatcher interfaces do not exist.

- [ ] **Step 3: Implement dispatcher integration**

Keep the dispatcher independent of Supabase and `TrackerSyncService` to avoid circular dependencies. Sync/recovery applications persist local data without dispatching or per-item notifications.

- [ ] **Step 4: Verify the tests pass**

Run: `npx ng test --watch=false --include src/app/preferences/preferences.service.spec.ts --include src/app/drops/collected-rewards.service.spec.ts --include src/app/preferences/import-export.service.spec.ts --include src/app/account/tracker-mutation-dispatcher.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/account/tracker-mutation-dispatcher.service.ts src/app/account/tracker-mutation-dispatcher.service.spec.ts src/app/preferences/preferences.service.ts src/app/preferences/preferences.service.spec.ts src/app/drops/collected-rewards.service.ts src/app/drops/collected-rewards.service.spec.ts src/app/preferences/import-export.service.ts src/app/preferences/import-export.service.spec.ts; git commit -m "feat: distinguish direct and synced tracker changes"`

### Task 4: Replace snapshot synchronization with reconciliation and replay

**Files:**
- Modify: `src/app/account/tracker-sync.models.ts`
- Modify: `src/app/account/tracker-sync.service.ts`
- Modify: `src/app/account/tracker-sync.service.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- `TrackerSyncService` produces signals `status: 'idle' | 'syncing' | 'needs-reconciliation' | 'pending-retry' | 'error'`, `summary`, and `reconciliation`.
- It exposes `syncAfterAuthentication()`, `chooseInitialSource(source: 'browser' | 'account')`, `retryPending()`, and `restoreAllIgnored()`.
- `TrackerReconciliation` reports the account ID plus browser/account active-item counts.

- [ ] **Step 1: Write failing reconciliation tests**

Cover: linked browser adopts remote state then replays queue; empty account offers explicit browser import; empty browser adopts account; two non-empty unlinked states stop at reconciliation; rejected RPC retry; timeout-after-success replay; account switching; legacy conflicts; and one RPC per direct mutation.

- [ ] **Step 2: Verify the tests fail**

Run: `npx ng test --watch=false --include src/app/account/tracker-sync.service.spec.ts --include src/app/app.spec.ts`

Expected: FAIL because the snapshot merge API remains.

- [ ] **Step 3: Implement remote reads, RPC dispatch, and ordered replay**

Remove routine `writeRemote(snapshot)` and the App effect that infers full-list changes. Map every `TrackerMutation` to exactly one Task 1 RPC, apply fetched state with `sync` origin, and emit only `Synced N preferences.` when state actually changed. Retain the legacy conflict dialog path for historical inconsistent remote data.

- [ ] **Step 4: Verify the tests pass**

Run: `npx ng test --watch=false --include src/app/account/tracker-sync.service.spec.ts --include src/app/app.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/account/tracker-sync.models.ts src/app/account/tracker-sync.service.ts src/app/account/tracker-sync.service.spec.ts src/app/app.ts src/app/app.spec.ts; git commit -m "refactor: reconcile tracker changes through operations"`

### Task 5: Add reconciliation, quiet status, and bulk recovery UI

**Files:**
- Modify: `src/app/account/account-dialog.ts`
- Modify: `src/app/account/account-dialog.html`
- Modify: `src/app/account/account-dialog.scss`
- Modify: `src/app/account/account-dialog.spec.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.scss`

**Interfaces:**
- `AccountDialogComponent` consumes sync status, summary, and reconciliation signals; explicit buttons invoke `chooseInitialSource`, `retryPending`, and `restoreAllIgnored`.
- Sync summaries are aggregate-only; individual remote game names never become preference toasts.

- [ ] **Step 1: Write failing account-dialog tests**

Assert one aggregate `Synced 12 preferences.` message with no preference-toast rows, both reconciliation choices, retryable status, and confirmed `Restore all ignored games`. Assert recovery success produces only one aggregate confirmation and preserves sign-in/sign-out controls.

- [ ] **Step 2: Verify the test fails**

Run: `npx ng test --watch=false --include src/app/account/account-dialog.spec.ts`

Expected: FAIL because sync controls and recovery confirmation do not exist.

- [ ] **Step 3: Implement accessible sync controls**

Use real buttons, a live status region, visible focus states, exact recovery confirmation copy, and disabled request-in-flight controls. Never render per-item synchronizing messages.

- [ ] **Step 4: Verify account UI and app tests pass**

Run: `npx ng test --watch=false --include src/app/account/account-dialog.spec.ts --include src/app/app.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/account/account-dialog.ts src/app/account/account-dialog.html src/app/account/account-dialog.scss src/app/account/account-dialog.spec.ts src/app/app.html src/app/app.scss; git commit -m "feat: show quiet account sync controls"`

### Task 6: Verify the integrated redesign and deployment schema

**Files:**
- Modify: `README.md`
- Modify: `supabase/README.md`

**Interfaces:**
- Documents first-link reconciliation, direct-action sync, quiet summaries, bulk recovery, and deployment verification.

- [ ] **Step 1: Update user-facing account-sync documentation**

Explain explicit first-device reconciliation, account-wide ignored-game recovery, and unchanged credential guidance.

- [ ] **Step 2: Run complete app validation**

Run: `npm run lint && npm test && npm run build`

Expected: PASS with zero lint warnings, all tests passing, and a successful production build.

- [ ] **Step 3: Verify the staged Supabase schema**

Run the non-destructive command documented in `supabase/README.md` against the configured project.

Expected: the new migration is applied and no schema drift is reported. If credentials or CLI linkage are unavailable, report that limitation without claiming success.

- [ ] **Step 4: Commit**

Run: `git add README.md supabase/README.md; git commit -m "docs: explain account sync recovery"`

