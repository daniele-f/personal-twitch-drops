# Blacklist and Preferences Design

## Intent

Let users hide unwanted active Twitch Drops games, keep that choice in the
browser, and review or reverse it from Preferences. A data inconsistency in
which a game is both favorited and blacklisted must be resolved explicitly
before any game content can be displayed.

## Scope

This feature adds persistent blacklist preferences, a blacklist action on
non-favorite Drop rows, a Preferences route and page, a simple collapsible
blacklist table, and an application-wide conflict-resolution gate. It does
not add blacklist expiry, automatic resolution, history, import/export, or
favorite metadata changes.

## Preference data

`PreferencesService` continues to own favorite IDs. It additionally owns a
reactive collection of blacklist entries with this shape:

```ts
{ id: string; gameName: string; blacklistedAt: string }
```

`blacklistedAt` is an ISO timestamp captured when the user blacklists the
game. Entries persist in a separate versioned `localStorage` key and are
validated when read. Invalid or unavailable stored data safely behaves as an
empty blacklist. The date is displayed and used for newest-first ordering; it
does not otherwise change behavior.

Adding an entry is idempotent. Removing an entry is idempotent and removes the
storage key when it is the final entry. A normal blacklist action is available
only for active games that are not favorites, but the stored state may still
contain conflicts through manual browser edits or previous application state.

## Main-screen behavior

The root application derives three groups from the live drops and preferences:

1. Favorites: active drops whose IDs are favorited and not blacklisted.
2. Active Drops: active drops that are neither favorited nor blacklisted.
3. Hidden Drops: active drops whose IDs are blacklisted; these have no main
   list row.

Every non-favorite row has a right-aligned, accessible circular-slash button.
Its hover tooltip is exactly `Blacklist`; its accessible name identifies the
game and action. Clicking it persists the entry using the current game name
and immediately removes the row from Active Drops. Favorite rows deliberately
have no blacklist action.

## Conflict-resolution gate

At application startup, the root application compares favorite IDs with all
saved blacklist entries. Because every blacklist entry has a saved game name,
each conflict can be named without loading live Drops. If one or more IDs are
in both collections, it enters a blocking conflict state before requesting or
rendering any Drops. While this state is active, no game content is rendered:
no loading skeletons, Favorites list, Active Drops list, count, error panel,
or Preferences page content. The modal's presence is driven by application
state; concealing it in browser developer tools cannot reveal gated content.

The modal says that something went wrong and presents a simple row for every
conflicting game. Each row includes the game name and two actions:

- `Keep it in Favorites` uses the primary color and removes that game's
  blacklist entry.
- `Hide it` uses a neutral grey style and removes that game's favorite ID.

Either action immediately removes only that row from the modal. The main and
Preferences content becomes available only after the final conflict is
resolved, at which point the first live-Drops request begins. This includes
conflicts for games that are not currently active.

## Preferences page

The header's Preferences action navigates to a dedicated Preferences route.
The page contains a collapsible section titled `Blacklisted Games`, with an
up/down chevron reflecting whether it is expanded. Its collapsed state hides
the list. Expanded content is intentionally plainer than the card lists: a
simple semantic table with columns for game name, `Blacklisted on`, and an
action.

Rows are newest first by `blacklistedAt`. Each provides a neutral
`Remove from blacklist` button that immediately removes the stored entry.
An empty blacklist has a concise empty state rather than an empty table.

## Accessibility and failures

All actions are real buttons with descriptive accessible names and visible
focus styles. The dialog has modal semantics, traps no user data behind a
visual-only overlay, and communicates its error reason in text. Chevron state
and the collapsible table are exposed semantically. Storage exceptions leave
preference changes usable in memory for the current session.

Provider loading and failure behavior remain unchanged except while the
conflict gate is active. The existing Retry flow continues to load live data;
it does not discard user preferences.

## Testing and verification

Automated tests cover:

- storage parsing, persistence, timestamp capture, ordering, removal, and
  unavailable storage for blacklist entries;
- active/favorite/hidden partitioning and immediate blacklist removal from the
  main list;
- blacklist button tooltip, accessible semantics, and its absence on favorite
  rows;
- Preferences routing, expand/collapse state, date display, empty state, and
  per-row unblacklisting;
- multi-row conflict gating, both choices, row-by-row removal, and the fact
  that game content remains absent until all conflicts are resolved.

Before review, run the full Angular test suite, lint, and a production build.
Manually verify local persistence after reload; modal behavior with multiple
conflicts; mouse and keyboard actions; desktop and 320px layouts; and a live
provider load.
