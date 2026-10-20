# Supabase tracker schema

The SQL migrations in `supabase/migrations/` are the version-controlled source of truth for the tracker database. A live schema export is useful for diagnostics, but must not be committed as the canonical schema.

## Ownership and security

Each tracker row belongs to `auth.users` through `user_id`. Row Level Security is enabled on every table and policies limit reads and writes to `auth.uid()`. Browser code may use only the Supabase project URL and publishable key; service-role keys never belong in the frontend.

## Tracker tables

- `user_settings` stores the theme and display toggles for one user.
- `user_favorite_games` and `user_ignored_games` contain game state. A null `removed_at` means the row is active; a timestamp is a tombstone retained to prevent stale-device restores.
- `user_collected_rewards` stores campaign reward state. A null `cleared_at` means collected; a timestamp is its tombstone.

`updated_at` is assigned by database triggers. Clients do not send an authority timestamp.

## Mutation operations

Migration `20261020000000_operation_based_tracker_sync.sql` exposes authenticated, `security invoker` RPCs for a single game preference, display settings, one reward, restoring all ignored games, and importing explicitly approved initial browser data. The game-preference RPC atomically tombstones the opposing state so a game cannot remain both active favorite and ignored.

Routine browser synchronization must invoke one of these operations, never upsert a full collection. The initial import RPC accepts `p_replace_existing` only after the user explicitly chooses this browser during first-link reconciliation; it tombstones prior active account rows before applying the approved browser preferences. Recovery restores ignored games by tombstoning their remote rows, so the same bad list cannot reappear on another linked device.

## Applying and verifying migrations

Use the Supabase CLI only from a configured, authenticated project connection. Before applying a migration, inspect its status:

```powershell
npx supabase migration list
```

Apply it only through the normal staged deployment process, then run the non-destructive status check again. When a local Supabase development stack is configured, also run:

```powershell
npx supabase db lint
```

Do not claim live schema verification passed when the CLI is not linked or credentials are unavailable.
