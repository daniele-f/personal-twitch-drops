# Live Drops Loading Design

## Intent

Replace the typed placeholder Drops data in the visual shell with active campaigns from `twitchdrops.app`. The application should clearly show progress while live data is loading, show the received campaigns on success, and make a failed request recoverable. Saved fixtures are used only by automated tests; production users must never be shown fixture campaigns as a fallback.

## Scope

This feature introduces the first live-data boundary and its loading UI. It does not add favorites, blacklist controls, user-preference persistence, snapshot storage, automatic refresh/cooldowns, change detection, browser notifications, or an alternate provider.

## Data boundary

`DropsProvider` exposes the application-facing operation for obtaining the current active Drops. `TwitchDropsAppProvider` owns the HTTP request to `twitchdrops.app`, source-specific parsing, and normalization. Components and other application services receive only normalized models.

The normalized model represents the values this screen needs: a stable campaign identifier, game name, campaign/reward summary, end information when supplied by the source, and an optional image URL. It must not expose source HTML selectors, source-specific field names, or raw document structures.

The provider is selected through Angular dependency injection. This keeps a future fallback source replaceable without changing the screen. If a browser cannot access the source, the provider reports a failure; it does not substitute test fixtures or invented campaign data.

## Screen states

The root page loads active Drops through the provider and has three exclusive states:

1. **Loading:** The Active Drops area displays four card-shaped skeleton rows matching the final list’s thumbnail and text layout. A CSS gradient shine moves across the placeholders, inspired by the referenced loading-card pattern. `prefers-reduced-motion: reduce` disables the movement.
2. **Success:** Skeletons are replaced by the normalized active campaign rows. The heading gives the campaign count and the successful update time. The list remains semantic and responsive at 320px.
3. **Failure:** The page says that active Drops could not be loaded and offers a labeled Retry button. Existing page chrome remains visible. No fixture data appears in this state.

The existing static Favorites and Newly added sections are removed from this feature’s real-data path. Favorites and “new” grouping depend on later preference and snapshot features; pretending that live items belong to either group would be misleading.

## Source failure and accessibility

Network errors, unavailable source responses, unexpected source documents, and malformed required campaign data all produce the recoverable failure state. Source parsing skips incomplete optional fields but must not fabricate values. Retry initiates a fresh provider request.

Loading status is announced accessibly, the error has clear text in addition to visual styling, and the Retry control is a real button. The skeleton is decorative rather than a fake data list.

## Testing and verification

Automated tests use saved source-like fixtures, never a real network request. They cover provider normalization, malformed or unexpected source content, loading state, successful list rendering, failure state, and Retry behavior. The test suite also verifies that fixture data cannot become the production fallback.

Before review, run the full Angular test suite, lint, and production build. Manual testing checks a real browser request, the loading-to-success transition, the failure-and-retry state, desktop rendering, and a 320px-wide layout.
