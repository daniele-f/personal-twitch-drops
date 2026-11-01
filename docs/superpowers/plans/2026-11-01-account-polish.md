# Account Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Polish account controls and remove misleading Twitch unlinking.

**Architecture:** Reuse AuthService password updates with current-password validation; update the popup and Preferences templates plus focused tests.

**Tech Stack:** Angular, Supabase JS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-account-polish-design.md`

## Global Constraints

- Do not add backend code or disable Supabase automatic linking.
- Remove all user-facing Twitch unlink controls.
- Sign-out is popup-only.

---

### Task 1: Account controls

**Files:** `account-dialog.*`, `preferences-page.*` and their specs.

- [ ] Write failing tests for route-aware Manage button, action order, removed unlink control, purple Twitch actions, and the password dialog validation.
- [ ] Implement the route-aware popup, account action styling, removal of unlink state, and password modal.
- [ ] Run focused specs, then `npm test -- --watch=false`, `npm run lint`, and `npm run build`.
- [ ] Commit, merge to main, and push.
