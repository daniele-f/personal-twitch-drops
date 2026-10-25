> **Historical design note (2026-10-25):** The former account-wide “Restore all ignored games” action was removed. Current behavior is documented in the root README and `supabase/README.md`.

# Operation-Based Account Sync Design

## Goal

Make tracker synchronization safe, quiet, and recoverable. Opening the application must not silently turn a large set of campaigns into ignored or favorite preferences, and synchronizing account data must never produce one notification per changed game.

## Scope

This replaces the current full-snapshot tracker synchronization for display settings, favorites, ignored games, and collected rewards. It retains email/password authentication, existing tracker tables, local browser preferences, and database tombstones. Campaign snapshots and Twitch account data remain local-only.

## Problem

The current client reads all local state, merges it with all rows from the account, writes the complete result back to Supabase, and replaces local lists after the write. The application therefore first renders live campaigns and then applies any previously stored remote ignored rows. `replaceLists` also creates one preference notification for every imported row.

Because every full upload updates database `updated_at` values, those timestamps describe sync traffic rather than a user action. A bad bulk remote list is then replicated back to every signed-in browser.

## Principles

- A direct user action is the unit of synchronization; a complete preference collection is not.
- Once an account is linked, the account state is authoritative across linked devices.
- Server timestamps represent real state changes. Routine reads and unchanged data must not alter them.
- Reconciliation updates are silent at row level. Only direct actions receive individual toasts.
- A destructive bulk action requires confirmation and changes both local and remote state.

## Data model and database operations

Add a forward-only migration under `supabase/migrations/`. Do not alter the already deployed account-sync migration.

Retain `user_settings`, `user_favorite_games`, `user_ignored_games`, and `user_collected_rewards`, including their row-level-security policies and tombstone fields. The new migration adds database operations for tracker mutations:

- favorite or restore a game;
- ignore or restore a game;
- update display settings;
- mark or clear one collected reward;
- restore all ignored games for the current user;
- import a first device's explicitly approved preferences.

Each operation obtains its user identity from `auth.uid()`, validates the supplied identifiers, writes only the affected row or rows, and returns the resulting server state. Favoriting and ignoring a game are mutually exclusive inside one database transaction: activating one tombstones the other. A server-side write updates `updated_at`; the browser never supplies an authority timestamp.

Normal client sync must not call a full-table upsert. It reads account state, sends pending operations one at a time, and then refreshes affected data. Tombstones remain in the database so a stale device cannot restore a removal.

## Local state and synchronization

Add a versioned local sync metadata record containing the linked account ID, initial-link status, and a small ordered outbox of pending tracker mutations.

Direct preference methods update the browser immediately, enqueue one mutation when an account is linked, and try to send it in the background. A failed request leaves that mutation in the outbox. Authentication restoration and a later successful request retry the outbox in order. The UI stays usable while work is pending.

On sign-in, the client reads the remote tracker state and follows this initial-link policy:

1. If the browser is already linked to that account, apply the account state and replay any queued local mutations.
2. If the account is empty and the browser has tracker data, offer a one-time import of that browser's data.
3. If the browser is empty, adopt the account state.
4. If both contain active tracker data and this browser has not previously linked to the account, show a reconciliation choice: use this browser's preferences or use the account's preferences. It must not silently union the lists.

Changing accounts starts a new initial-link decision. Signing out retains the browser's local tracker data but does not send it until a user links or imports it into an account.

## UI behavior

The Account dialog gains a sync status area and first-link reconciliation controls.

- A completed automatic reconciliation may show one neutral summary, for example `Synced 12 preferences.` It must not show a row-level toast for each favorite, ignored game, or reward.
- Direct interactions in the current browser keep the existing confirmation toast, such as `Game added to Ignore List.`
- A pending or failed outbox shows a non-blocking account status explaining that changes will retry. It offers a retry action and never prevents browsing campaigns.
- The Account dialog includes `Restore all ignored games`. Its confirmation explains that every ignored game in the account will be restored on all linked devices. Confirming it sends the server bulk-restore operation, updates the local state, and displays at most one completion summary.
- The existing conflict-resolution dialog is retained only as a defensive fallback for legacy inconsistent data. New database operations prevent new active favorite/ignore conflicts.

## Notification boundary

Preference mutations receive an origin: `user`, `sync`, or `recovery`.

- `user` produces the existing one-item toast.
- `sync` never produces item toasts; the account layer may emit one aggregate summary.
- `recovery` never produces item toasts; it emits one aggregate recovery confirmation after the operation succeeds.

Replacing state from the account must use the `sync` origin and therefore must not call the current notification-diff behavior.

## Documentation and verification

Add `supabase/README.md` as the repository guide to the database. It will document each tracker table, tombstone meaning, mutation operations, RLS ownership model, the migration workflow, and a schema-verification procedure. Migrations remain the version-controlled source of truth; a live schema export is diagnostic only and is not committed as canonical schema.

## Tests

Automated coverage will include:

- applying a large remote ignored list after login without individual notifications;
- direct favorite/ignore actions still producing exactly one toast;
- one-record mutation requests rather than full snapshot uploads, including display-setting changes;
- server-enforced favorite/ignore exclusivity and timestamps that change only for affected rows;
- failed mutation retention and ordered outbox retry;
- all four initial-link paths, including an explicit choice when both sides contain data;
- bulk ignored-game restore updating local and remote state without notification spam;
- legacy conflicting remote rows remaining safely resolvable;
- migration and RLS verification against the configured Supabase project.

## Out of scope

- Syncing campaign snapshots, change badges, or Twitch inventory data.
- Adding a new general-purpose event-sourcing system.
- Exposing database credentials, service-role keys, or user data in the frontend or repository.
