# Account-First Tracker Loading Design

## Intent

Guests can use the tracker immediately with browser-local data. An account is the only supported way to preserve and move tracker data between browsers or devices; the application will no longer offer import or export codes.

## Startup and source selection

At startup, load the local tracker profile synchronously, restore the Supabase session, and request active Drops in parallel. A guest uses the local profile. An authenticated user reads the account profile before the initial cards render. If the profiles are identical, use either result without prompting. If one profile is empty, adopt the non-empty profile and initialize the empty destination. If both profiles differ, show a choice after the page is visible:

- **Use this browser's data** fully replaces the account tracker profile.
- **Use my account's data** fully replaces the browser-local tracker profile.

Do not silently merge distinct profiles. A known pending account outbox is replayed before comparison; a retry failure leaves the browser usable with a non-blocking retry status.

The tracker profile includes favorites, ignored games, collected rewards, theme, subscription display preference, and badge display preference. Snapshots, viewed-change state, celebration history, and other UI state remain browser-only.

## Persistence

Every tracker action updates in-memory state and localStorage first. When an authenticated, reconciled account is available, it is appended to a durable local outbox and sent to Supabase in order. An entry is removed only after the server accepts it. Bulk list-clearing actions enqueue per-item mutations. Full account replacement is reserved for the explicit browser-source reconciliation choice.

Signing out retains the browser tracker profile for guest use. It does not send changes until an account is authenticated and reconciled again.

## Loading and errors

The first Drops-page render uses three card-shaped skeletons while campaign data and the initial profile source are resolving. Manual refresh retains the existing cards and continues to use the refresh-button spinner. Auth or tracker-sync failures fall back to browser-local state and show an actionable, non-blocking retry status. Campaign-load failures use the existing failure state.

## Scope removals

Remove the import/export controls, `ImportExportService`, and their tests. There is no supported transfer path other than signing in.

## Verification

Test guest startup, authenticated matching/empty/different profiles, both explicit replacement choices, pending-operation replay, local-first mutation persistence, bulk clear mutations, sign-out retention, skeleton initial loading, manual-refresh continuity, and removed import/export UI.
