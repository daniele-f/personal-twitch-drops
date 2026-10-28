# Twitch Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create and access accounts through Twitch OAuth alongside email/password, and link Twitch to an existing signed-in account.

**Architecture:** Extend `AuthService` with dedicated Twitch sign-in and identity-link methods backed by Supabase Auth OAuth. Keep the existing session model and UUID-based tracker sync unchanged. Add contextual Twitch buttons to the guest and authenticated states of `AccountDialogComponent`.

**Tech Stack:** Angular 22 signals, Vitest, `@supabase/supabase-js` 2.118, Supabase Auth OAuth.

**Spec:** `docs/superpowers/specs/2026-10-28-twitch-auth-design.md`

## Global Constraints

- Preserve the existing email/password sign-up, sign-in, confirmation, and password-recovery flows.
- Use `twitch` as the Supabase OAuth provider and the current application origin as the redirect URL.
- Keep `auth.users.id` / `user_id` as the only tracker-data identity.
- Do not introduce a Twitch client secret or a database-schema change in the frontend repository.

## Review Focus

- OAuth initiation succeeds without a session immediately being returned; test that the dialog remains safely open after the redirect request begins.
- An authenticated user links an identity rather than signing in as a different user; test `linkIdentity` rather than `signInWithOAuth`.
- Twitch button requests always include the current application origin as `redirectTo`; test both service methods.
- Failed provider or link calls present an actionable error instead of silently changing UI state; test service failures.
- Existing email/password UI behavior and password manager attributes remain intact; retain the existing dialog test.

---

### Task 1: Add Twitch OAuth operations to `AuthService`

**Files:**
- Modify: `src/app/account/auth.service.ts:17-107`
- Test: `src/app/account/auth.service.spec.ts`

**Interfaces:**
- Produces: `signInWithTwitch(): Promise<AuthResult>` and `linkTwitchIdentity(): Promise<AuthResult>` on `AuthService`.
- Consumes: Supabase Auth `signInWithOAuth({ provider: 'twitch', options: { redirectTo } })` and `linkIdentity({ provider: 'twitch', options: { redirectTo } })`.

- [ ] **Step 1: Write failing AuthService tests**

Add tests that mock each Supabase Auth operation and assert the provider is `twitch`, `redirectTo` equals `globalThis.location.origin`, and each successful call returns a redirect-started outcome. Add error assertions for provider and identity-link errors.

- [ ] **Step 2: Run the AuthService tests to verify failure**

Run: `npm test -- --watch=false --include src/app/account/auth.service.spec.ts`

Expected: FAIL because the Twitch methods do not exist.

- [ ] **Step 3: Implement `signInWithTwitch()` and `linkTwitchIdentity()` in `src/app/account/auth.service.ts`**

Begin the request, call the corresponding Supabase method with `{ provider: 'twitch', options: { redirectTo: globalThis.location.origin } }`, and translate errors into the existing `AuthResult` and error-signal conventions. Do not call `applySession`; OAuth redirects away before completion.

- [ ] **Step 4: Run the AuthService tests to verify they pass**

Run: `npm test -- --watch=false --include src/app/account/auth.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the service change**

```bash
git add src/app/account/auth.service.ts src/app/account/auth.service.spec.ts
git commit -m "feat: add Twitch OAuth auth operations"
```

### Task 2: Expose Twitch sign-in and linking in the account dialog

**Files:**
- Modify: `src/app/account/account-dialog.ts:15-67`
- Modify: `src/app/account/account-dialog.html:19-60`
- Modify: `src/app/account/account-dialog.scss`
- Test: `src/app/account/account-dialog.spec.ts`

**Interfaces:**
- Consumes: `AuthService.signInWithTwitch(): Promise<AuthResult>` and `AuthService.linkTwitchIdentity(): Promise<AuthResult>` from Task 1.
- Produces: Guest “Continue with Twitch” action and authenticated “Link Twitch account” action.

- [ ] **Step 1: Write failing dialog tests**

Add one guest-state test that finds “Continue with Twitch”, clicks it, and expects `signInWithTwitch` to be called. Add one authenticated-state test that finds “Link Twitch account”, clicks it, and expects `linkTwitchIdentity` to be called. Keep the existing email/password test coverage unchanged.

- [ ] **Step 2: Run the dialog tests to verify failure**

Run: `npm test -- --watch=false --include src/app/account/account-dialog.spec.ts`

Expected: FAIL because neither Twitch action is rendered or callable.

- [ ] **Step 3: Implement dialog actions and accessible buttons**

Add protected async handlers that delegate to the service. Render “Continue with Twitch” below the guest email/password form for both sign-in and create-account modes, and render “Link Twitch account” in the authenticated account view. Use the existing button directive and disabled state while authentication is in progress. Add only the minimal layout styling needed to make the secondary OAuth action visually clear.

- [ ] **Step 4: Run the dialog tests to verify they pass**

Run: `npm test -- --watch=false --include src/app/account/account-dialog.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the dialog change**

```bash
git add src/app/account/account-dialog.ts src/app/account/account-dialog.html src/app/account/account-dialog.scss src/app/account/account-dialog.spec.ts
git commit -m "feat: offer Twitch sign-in and linking"
```

### Task 3: Verify the full application build and document deployment setup

**Files:**
- Modify: `supabase/README.md`

**Interfaces:**
- Consumes: The completed OAuth client implementation from Tasks 1-2.
- Produces: Deployment instructions specifying Supabase’s Twitch provider configuration and redirect URL allow-list requirement.

- [ ] **Step 1: Write the OAuth deployment note**

In `supabase/README.md`, state that Twitch must be enabled in Supabase Auth with a Twitch application client ID and secret, and that the deployed app URL must be allowed as a redirect URL. Do not record secret values.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test -- --watch=false`

Expected: PASS.

- [ ] **Step 3: Build and lint the application**

Run: `npm run build` and `npm run lint`

Expected: Both commands exit 0.

- [ ] **Step 4: Commit the documentation and final verification state**

```bash
git add supabase/README.md docs/superpowers/specs/2026-10-28-twitch-auth-design.md docs/superpowers/plans/2026-10-28-twitch-auth.md
git commit -m "docs: describe Twitch OAuth setup"
```

## Self-review

- Spec coverage: Tasks 1-2 implement Twitch account creation/sign-in and identity linking; Task 3 documents the external configuration. Email/password and UUID ownership are expressly preserved.
- Type consistency: The service methods defined in Task 1 are the methods consumed by Task 2.
- Review Focus: Each listed risk is assigned to Task 1 or Task 2 test coverage, except retained password-manager behavior which is already covered by the existing dialog test suite.
- Proportion: Three independently testable tasks cover one auth service, one dialog, and deployment documentation without prescribing implementation bodies.
