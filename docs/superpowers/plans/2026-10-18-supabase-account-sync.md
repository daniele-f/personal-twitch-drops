# Supabase Account Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional email-and-password accounts that safely synchronize Personal Twitch Drops tracker data across devices while preserving anonymous local use.

**Architecture:** Supabase Auth owns user identities and supplies the browser session. A version-controlled PostgreSQL migration creates user-owned preference tables protected by Row Level Security. The Angular application keeps local storage as the guest and offline source, then uses an isolated account-sync service to merge or persist only the approved tracker state after authentication.

**Tech Stack:** Angular 22, TypeScript, Vitest, Supabase Auth, Supabase PostgreSQL/RLS, `@supabase/supabase-js`, Cloudflare Pages/Workers deployment.

**Spec:** `docs/superpowers/specs/2026-10-18-supabase-sync-design.md`

## Global Constraints

- Keep anonymous use local-only; do not create anonymous Supabase users.
- Enable email-and-password signup with email confirmation before version-one account access.
- Treat `auth.users.id` as the only application user identifier; do not use email or provider IDs as foreign keys.
- Store only favorites, ignored games, collected rewards, and theme/display preferences in version one.
- Keep snapshots, change-view state, Twitch tokens, and official Twitch Drops inventory out of Supabase.
- Enable Row Level Security on every public application table and restrict every policy with `user_id = auth.uid()`.
- The Angular bundle may contain only the Supabase URL and publishable/anon key; never commit or expose service-role keys, OAuth secrets, or database passwords.

## Review Focus

- Existing-account sign-in with local guest data merges the sets without deleting either account data or the guest data before a successful write.
- A stale device cannot restore a favorite, ignored game, or collected reward that was removed on a different device.
- A user cannot read or mutate another user’s rows through the generated Supabase API.
- An unavailable network leaves the existing local tracker fully usable and shows a recoverable sync state.
- Email confirmation and password recovery redirect only to the production site or configured local development URL.

---

## File Structure

- `supabase/migrations/20261018000000_account_sync.sql`: creates the application-owned tables, indexes, timestamp trigger, RLS, and policies.
- `src/environments/supabase.ts`: exposes validated public Supabase configuration only.
- `src/app/account/`: isolated authentication, account-state, and tracker-sync services plus their unit tests.
- `src/app/account/account-dialog.*`: email/password signup, sign-in, sign-out, and sync-status UI.
- `src/app/preferences/preferences.service.ts`, `src/app/drops/collected-rewards.service.ts`, and `src/app/drop-list/drop-list.ts`: provide focused import/export or snapshot interfaces for the existing local state; they remain the local-first source of truth.
- `src/app/app.config.ts`, `src/app/app.ts`, `src/app/app.html`, and `src/app/app.spec.ts`: register the account services and place the account action in existing application chrome.

### Task 1: Configure Supabase Auth and create the protected schema

**Files:**
- Create: `supabase/migrations/20261018000000_account_sync.sql`
- Test: Supabase SQL Editor queries run as two separate authenticated test users

**Interfaces:**
- Produces tables `user_settings`, `user_favorite_games`, `user_ignored_games`, and `user_collected_rewards` for Tasks 3–5.
- Produces a `set_updated_at()` trigger function used by all four tables.

- [ ] **Step 1: Configure Authentication → URL Configuration in the Supabase dashboard**

Set Site URL to `https://drops.unidea.dev/` and add `https://drops.unidea.dev/**` plus the local Angular development URL as redirect URLs. Do not add wildcard redirect URLs for unrelated origins.

- [ ] **Step 2: Configure Authentication → Providers → Email**

Keep Email enabled, require Confirm email, enable user signup, and keep anonymous sign-ins disabled. Configure a production SMTP provider before public launch; the built-in mail service is only suitable for limited development use.

- [ ] **Step 3: Write the migration for account-owned tables**

Create the four tables from the spec with `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`.

Use these primary keys: `user_settings(user_id)`, `user_favorite_games(user_id, game_id)`, `user_ignored_games(user_id, game_id)`, and `user_collected_rewards(user_id, campaign_id, reward_name)`. Add nullable `removed_at` fields for favorites/ignored games and nullable `cleared_at` for rewards. Add `check (theme_color in ('twitch-purple', 'electric-blue', 'neon-rose', 'emerald-glow', 'golden-amber'))` to settings.

- [ ] **Step 4: Add the timestamp trigger, indexes, RLS, and per-user policies**

Enable RLS on all four tables. Add select, insert, update, and delete policies whose `using` and `with check` clauses compare `user_id` with `auth.uid()`. Add partial indexes for active records (`removed_at is null` and `cleared_at is null`).

- [ ] **Step 5: Apply the migration in the Supabase SQL Editor and verify it**

Run the migration as the project owner. Confirm all four tables have RLS enabled, test that one authenticated user can read/write only their own rows, and verify a second user cannot select or insert using the first user’s `user_id`.

- [ ] **Step 6: Commit the migration**

```bash
git add supabase/migrations/20261018000000_account_sync.sql
git commit -m "feat: add account sync schema"
```

### Task 2: Add public Supabase configuration and an Auth boundary

**Files:**
- Modify: `package.json`
- Create: `src/environments/supabase.ts`
- Create: `src/app/account/auth.service.ts`
- Create: `src/app/account/auth.service.spec.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes Supabase URL and publishable/anon key from `supabase.ts`.
- Produces `AuthService` methods `signUp(email: string, password: string): Promise<AuthResult>`, `signIn(email: string, password: string): Promise<AuthResult>`, `signOut(): Promise<void>`, and readonly signals `user` and `status`.

- [ ] **Step 1: Add a failing `AuthService` test for initial guest state and session changes**

Use a mocked Supabase client to assert the initial state is `guest`, a session update exposes its user ID, and sign-out returns to `guest`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx ng test --watch=false --include src/app/account/auth.service.spec.ts`

Expected: FAIL because the account module does not exist.

- [ ] **Step 3: Install and configure `@supabase/supabase-js`**

Add `@supabase/supabase-js`. Create `src/environments/supabase.ts` with only `url` and `publishableKey` values supplied at build/deploy time. Fail clearly if either is absent; never add a service role key.

- [ ] **Step 4: Implement `AuthService`**

Create a single Supabase browser client, subscribe to `onAuthStateChange`, and expose typed status values `guest | authenticating | awaiting-confirmation | authenticated | error`. Use `signUp` with `emailRedirectTo` set to the configured site origin, use `signInWithPassword`, and surface non-sensitive errors.

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `npx ng test --watch=false --include src/app/account/auth.service.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the auth boundary**

```bash
git add package.json package-lock.json src/environments/supabase.ts src/app/account/auth.service.ts src/app/account/auth.service.spec.ts src/app/app.config.ts
git commit -m "feat: add Supabase email authentication"
```

### Task 3: Define local tracker snapshots and remote sync operations

**Files:**
- Create: `src/app/account/tracker-sync.models.ts`
- Create: `src/app/account/tracker-sync.service.ts`
- Create: `src/app/account/tracker-sync.service.spec.ts`
- Modify: `src/app/preferences/preferences.service.ts`
- Modify: `src/app/drops/collected-rewards.service.ts`
- Modify: `src/app/drop-list/drop-list.ts`

**Interfaces:**
- Consumes `AuthService.user`, existing preference services, and Supabase table clients from Task 2.
- Produces `TrackerSyncService.syncAfterAuthentication(): Promise<SyncResult>` and `TrackerSyncService.syncLocalChange(): Promise<void>`.
- Produces typed `LocalTrackerSnapshot` containing settings, favorites, ignored games, and collected rewards.

- [ ] **Step 1: Add failing tests for the approved guest-to-account merge rules**

Assert that favorites, ignored games, and collected rewards are unions; the setting with the newest `updatedAt` wins; snapshots are excluded; and a write failure leaves the local snapshot unchanged.

- [ ] **Step 2: Run the focused merge tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/account/tracker-sync.service.spec.ts`

Expected: FAIL because the snapshot types and sync service do not exist.

- [ ] **Step 3: Add narrow snapshot/import interfaces to existing local services**

Expose typed methods that read and replace only the current local settings, favorites, ignored games, and collected rewards. Preserve their current local-storage persistence and notification behavior; do not make UI components call Supabase directly.

- [ ] **Step 4: Implement `TrackerSyncService`**

On authentication, read local data and active remote rows, merge using the approved rules, upsert the merged state, then replace local state only after a successful remote write. For subsequent edits, persist the local update first and perform the remote update in the background. Mark removals with the schema’s tombstone fields instead of deleting rows.

- [ ] **Step 5: Add a test for a stale deletion record**

Given a newer remote `removed_at` or `cleared_at`, assert the service does not restore the older local active record.

- [ ] **Step 6: Run the focused sync tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/account/tracker-sync.service.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the tracker sync domain**

```bash
git add src/app/account/tracker-sync.models.ts src/app/account/tracker-sync.service.ts src/app/account/tracker-sync.service.spec.ts src/app/preferences/preferences.service.ts src/app/drops/collected-rewards.service.ts src/app/drop-list/drop-list.ts
git commit -m "feat: sync tracker preferences to Supabase"
```

### Task 4: Add account UI and connect account lifecycle to sync

**Files:**
- Create: `src/app/account/account-dialog.ts`
- Create: `src/app/account/account-dialog.html`
- Create: `src/app/account/account-dialog.scss`
- Create: `src/app/account/account-dialog.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Consumes `AuthService` from Task 2 and `TrackerSyncService` from Task 3.
- Produces an `AccountDialogComponent` with `opened`, `signedInUser`, `status`, `signUp`, `signIn`, and `signOut` interactions.

- [ ] **Step 1: Add a failing component test for guest and authenticated states**

Assert guests see an account action that opens email and password forms, a successful registration shows an email-confirmation message, and authenticated users see account identity plus sign out.

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npx ng test --watch=false --include src/app/account/account-dialog.spec.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the accessible account dialog**

Use the existing button styling conventions. Include separate sign-up and sign-in modes, password fields with browser-appropriate autocomplete attributes, concise confirmation/error copy, and no Twitch option yet.

- [ ] **Step 4: Add the header action and trigger sync on authentication**

Place an Account button in the existing header. When authentication becomes active, call `syncAfterAuthentication`; show a non-blocking recoverable state if syncing fails while preserving local functionality.

- [ ] **Step 5: Add a failing app-level test for failed sync fallback**

Assert the account is signed in, local favorites remain visible, and the UI presents a retryable sync error when the remote write fails.

- [ ] **Step 6: Run the focused UI tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/account/account-dialog.spec.ts --include src/app/app.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the account UI**

```bash
git add src/app/account/account-dialog.ts src/app/account/account-dialog.html src/app/account/account-dialog.scss src/app/account/account-dialog.spec.ts src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat: add account sign-in and sync controls"
```

### Task 5: Verify deployment configuration and complete integration checks

**Files:**
- Modify: Cloudflare deployment environment configuration only; do not commit secrets
- Modify: `README.md`

**Interfaces:**
- Consumes the deployed Supabase Auth configuration and application implementation from Tasks 1–4.
- Produces documented public configuration names and a tested production redirect path.

- [ ] **Step 1: Set Cloudflare build-time public configuration**

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as Cloudflare build variables. Do not set a service role key in the frontend build. Rebuild and redeploy the site.

- [ ] **Step 2: Add deployment guidance to the README**

Document that only the project URL and publishable/anon key are frontend-safe, and that privileged keys and provider secrets must stay in protected configuration.

- [ ] **Step 3: Run lint and the full test suite**

Run: `npm run lint && npm test`

Expected: exit code 0 with all tests passing.

- [ ] **Step 4: Run a production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 5: Manually verify the production account flow**

Verify guest tracking works, sign up sends an email confirmation to the configured redirect, confirmed sign-in preserves guest preferences, a second device receives the synced state, sign-out returns to local-only use, and one account cannot access another account’s data.

- [ ] **Step 6: Commit deployment documentation**

```bash
git add README.md
git commit -m "docs: document Supabase deployment settings"
```

## Self-Review

- Spec coverage: Task 1 covers the protected schema and email setup; Task 2 covers public configuration and authentication; Task 3 covers guest merge, removal tracking, and offline fallback; Task 4 covers account UX; Task 5 covers deployment and verification. No spec requirements are unassigned.
- Type consistency: `AuthService` is the sole owner of auth session state; `TrackerSyncService` is the only feature service that maps local state to remote tables; existing preference services remain local-state owners.
- Review focus: each listed risk is exercised in Tasks 1, 3, 4, or 5.
- Proportion: the plan defines boundaries, interfaces, tests, and deployment decisions without pre-writing implementation bodies.
