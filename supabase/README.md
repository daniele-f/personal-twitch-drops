# Supabase tracker schema

The SQL migrations in `supabase/migrations/` are the version-controlled source of truth for the tracker database. A live schema export is useful for diagnostics, but must not be committed as the canonical schema.

## Ownership and security

Each tracker row belongs to `auth.users` through `user_id`. Row Level Security is enabled on every table and policies limit reads and writes to `auth.uid()`. Browser code may use only the Supabase project URL and publishable key; service-role keys never belong in the frontend.

## Twitch sign-in

The app can use Twitch as a Supabase Auth OAuth provider for account creation,
sign-in, and linking an existing account. Enable Twitch in Supabase Auth and
provide the Twitch application client ID and client secret in the Supabase
dashboard; never place the secret in this repository or the browser app.

Add each deployed application origin to Supabase Auth's allowed redirect URLs.
Manual identity linking must also be enabled in Supabase Auth for a signed-in
email/password user to link a Twitch identity.

## Tracker tables

- `user_settings` stores the synced display toggles for one user. Theme color remains browser-local; the legacy `theme_color` column is retained for compatibility but is ignored by current clients.
- `user_favorite_games` and `user_ignored_games` contain game state. A null `removed_at` means the row is active; a timestamp is a tombstone retained to prevent stale-device restores.
- `user_collected_rewards` stores campaign reward state. A null `cleared_at` means collected; a timestamp is its tombstone.

`updated_at` is assigned by database triggers. Clients do not send an authority timestamp.

## Mutation operations

Migration `20261020000000_operation_based_tracker_sync.sql` exposes authenticated, `security invoker` RPCs for a single game preference, display settings, one reward, and importing explicitly approved initial browser data. Migration `20261025000000_drop_restore_all_ignored_games.sql` retires the former bulk restore RPC. Migration `20261025010000_device_local_theme.sql` retains the legacy display-settings RPC while preventing it from synchronizing theme color. The game-preference RPC atomically tombstones the opposing state so a game cannot remain both active favorite and ignored.

Routine browser synchronization must invoke one of these operations, never upsert a full collection. The initial import RPC accepts `p_replace_existing` only after the user explicitly chooses this browser during first-link reconciliation; it tombstones prior active account rows before applying the approved browser preferences.

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
