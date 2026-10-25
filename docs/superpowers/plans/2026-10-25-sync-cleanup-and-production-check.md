# Sync Cleanup and Production Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove retired restore/import-export remnants, keep coverage for the no-transfer Preferences page, and verify the deployed account-sync experience.

**Architecture:** Retire the obsolete mutation type and client RPC branch. Add a forward-only Supabase migration that drops the unused database function, preserving historical migration integrity. Document account sync as the only cross-device transfer method and cover the rendered Preferences page so transfer controls cannot reappear unnoticed.

**Tech Stack:** Angular 22, Vitest, Supabase SQL migrations, Cloudflare Pages.

**Spec:** User request in this conversation, 2026-10-25.

## Global Constraints

- Guests keep their data only in browser local storage.
- Account sync is the only cross-device tracker-data path; there is no import/export feature.
- Do not alter historical applied Supabase migrations; make server changes with a new forward migration.

## Review Focus

- A queued mutation must still map every supported action to a valid RPC after removing the retired variant.
- A new Supabase environment must not retain the obsolete RPC after all migrations run.
- The Preferences page must not expose a transfer control through markup, text, file input, or button.
- README instructions must distinguish local-only guest data from account-based cross-device sync.
- Production verification must test both the guest path and signed-in path without exposing credentials.

### Task 1: Retire restore-all ignored-game implementation

**Files:**
- Modify: `src/app/account/tracker-mutation.ts`
- Modify: `src/app/account/tracker-sync.service.ts`
- Create: `supabase/migrations/20261025000000_drop_restore_all_ignored_games.sql`

- [ ] Write a failing compile-backed test/type assertion that uses every supported mutation action and excludes the retired action.
- [ ] Remove `restore-all-ignored` from `TrackerMutation` and its unreachable client RPC branch.
- [ ] Add a forward-only migration containing `drop function if exists public.restore_all_ignored_games();`.
- [ ] Run the affected sync tests and the full test suite.

### Task 2: Document account-only transfer and restore Preferences coverage

**Files:**
- Modify: `README.md`
- Create: `src/app/preferences-page/preferences-page.spec.ts`

- [ ] Write a failing component test that renders Preferences and asserts it contains no import/export/share-code/file-transfer controls.
- [ ] Add the minimal component test setup with a non-emitting Drops provider.
- [ ] Update README feature, usage, and privacy copy to state that guests use local storage and signed-in account sync is the only cross-device path.
- [ ] Run the focused page test and full suite.

### Task 3: Validate production

**Files:**
- No repository changes required unless a production finding needs a fix.

- [ ] Confirm Cloudflare Pages is serving a deployment from the latest `main` commit.
- [ ] Check guest local-storage behavior, signed-in account load, reconciliation choices, and one favorite or ignored-game update surviving a refresh.
- [ ] Report results without recording login credentials or private account data.
