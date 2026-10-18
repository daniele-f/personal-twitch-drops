# Supabase Account Sync Design

## Goal

Let people use Personal Twitch Drops without an account, then create or sign in to an account to sync their tracker data across devices. The production site is hosted on Cloudflare at `https://drops.unidea.dev/`; Supabase provides authentication and PostgreSQL storage.

This design syncs the application's own tracker state only. It does not read, claim, or represent a user's official Twitch Drops inventory.

## Identity

Supabase Auth is the source of account identity. Version one offers email-and-password signup and sign-in, with email confirmation enabled. The application does not create a separate user table; all application data is owned by the UUID in `auth.users`.

The data model must not depend on an email address or a provider-specific user ID. Future sign-in methods, starting with Twitch and potentially additional gaming providers, are linked identities on the same Supabase user rather than new tracker profiles.

## Guest-to-account sync

Guests continue to keep their tracker state in browser local storage. They do not create anonymous Supabase users or write guest data to the database.

After a successful signup or sign-in, the application reads the local guest state and the account state, merges them, writes the result to the account, and retains the browser copy until the write succeeds.

Merge rules:

- Favorites, ignored games, and collected rewards are combined.
- Theme and display preferences use the most recently changed value.
- Campaign snapshots and change-view state remain local-only in version one.

After initial sync, account changes are persisted to Supabase. Removal timestamps prevent stale devices from restoring records deleted on another device.

## Data model

All tables include `user_id uuid not null references auth.users(id) on delete cascade` and timestamps. They are application-owned tables in the public schema.

- `user_settings`: one row per user; `theme_color`, `show_subscriptions`, `show_badges`, `updated_at`.
- `user_favorite_games`: one row per user and game ID; `game_id`, `game_name`, `added_at`, `removed_at`, `updated_at`.
- `user_ignored_games`: one row per user and game ID; `game_id`, `game_name`, `ignored_at`, `removed_at`, `updated_at`.
- `user_collected_rewards`: one row per user, campaign ID, and reward name; `campaign_id`, `reward_name`, `collected_at`, `cleared_at`, `updated_at`.

Active records have a null removal/clear timestamp. The app resolves a game being both favorited and ignored before saving so the active state is never ambiguous.

## Access control and secrets

Row Level Security is enabled on every application table. Authenticated users can select, insert, update, and delete only their own rows, enforced by `user_id = auth.uid()`.

The Angular application may use the Supabase project URL and publishable/anon key. Privileged Supabase keys, OAuth client secrets, and service-role keys stay in Cloudflare secrets or Supabase's protected provider configuration and are never committed or included in the browser bundle.

## Non-goals

- No Twitch OAuth provider configuration in version one.
- No storage of Twitch access or refresh tokens.
- No database synchronization of campaign snapshots or change notifications.
- No attempt to read official Twitch Drops entitlements.

## Verification

The migration will be verified in Supabase with Row Level Security enabled and tested with separate users. Application work will add automated tests for guest-to-account merging, per-user access boundaries, and local fallback when sync fails.
