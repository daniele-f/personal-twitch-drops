# Account Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show and safely manage linked Twitch and email/password sign-in methods from Preferences.

**Architecture:** Extend `AuthService` with a refreshed identity signal and focused identity mutation methods. Add an account section to the existing Preferences page and reduce the authenticated popup to status, management navigation, and sign-out.

**Tech Stack:** Angular standalone components and signals; `@supabase/supabase-js`; Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-account-preferences-design.md`

## Global Constraints

- Use existing Supabase Auth identity APIs; do not add a backend, schema, or dependencies.
- Sign out remains in the account popup only.
- Do not expose unlink when it is the final login identity.
- Place the account section after Theme color and before the two preference lists.

## Review Focus

- Identity lookup failure leaves link/password controls disabled with an actionable error — Task 1 test.
- A Twitch-only user cannot set a password before adding and verifying an email — Task 2 test.
- A linked Twitch account with only one identity cannot be unlinked — Task 2 test.
- The popup management link targets the account anchor, not the generic Preferences top — Task 3 test.
- A guest does not see account management controls in Preferences — Task 2 test.

---

### Task 1: Auth identity state

**Files:**
- Modify: `src/app/account/auth.service.ts`
- Test: `src/app/account/auth.service.spec.ts`

**Interfaces:**
- Produces an `identities` signal with provider identifiers and methods to refresh, link/unlink Twitch, add email, and set a password.
- Consumes Supabase `getUserIdentities`, `unlinkIdentity`, and `updateUser` APIs.

- [ ] Write failing service tests for fetching identities after session restore, identifying Twitch/email providers, and returning user-facing API errors.
- [ ] Run the focused service spec and verify the new expectations fail.
- [ ] Implement typed identity state and the minimal AuthService methods; refresh identities after successful auth-state changes and identity mutations.
- [ ] Run the focused service spec and verify it passes.
- [ ] Commit the service change.

### Task 2: Preferences account section

**Files:**
- Modify: `src/app/preferences-page/preferences-page.ts`
- Modify: `src/app/preferences-page/preferences-page.html`
- Modify: `src/app/preferences-page/preferences-page.scss`
- Test: `src/app/preferences-page/preferences-page.spec.ts`

**Interfaces:**
- Consumes `AuthService.user`, identity state, and its identity/password methods from Task 1.
- Produces an `#account` section rendered only to signed-in users.

- [ ] Write failing component tests for account-section order, email display, Twitch linked/unlinked states, guest omission, confirmation before unlink, and email-verification-gated password setup.
- [ ] Run the focused Preferences spec and verify those expectations fail.
- [ ] Implement the Account section after Theme color, local action state, confirmed unlink, the two-step email/password setup, and contextual error/status copy.
- [ ] Run the focused Preferences spec and verify it passes.
- [ ] Commit the Preferences change.

### Task 3: Account popup status and navigation

**Files:**
- Modify: `src/app/account/account-dialog.html`
- Modify: `src/app/account/account-dialog.ts`
- Test: `src/app/account/account-dialog.spec.ts`

**Interfaces:**
- Consumes identity state from Task 1.
- Produces popup Twitch status and an `/preferences#account` management link while retaining sign-out.

- [ ] Write failing dialog tests for linked/unlinked Twitch wording, the management link destination, and retained sign-out.
- [ ] Run the focused dialog spec and verify it fails.
- [ ] Implement the minimal authenticated-popup template and component imports needed for the status and route link.
- [ ] Run the focused dialog spec and verify it passes.
- [ ] Commit the popup change.

### Task 4: Integrated verification

**Files:**
- Verify: account and Preferences test suites

- [ ] Run `npm test -- --watch=false`, `npm run lint`, and `npm run build`.
- [ ] Verify the full account flow manually: popup status, preferences anchor, Twitch link/unlink confirmation, and email verification before password creation.
- [ ] Commit any verification-only corrections.
