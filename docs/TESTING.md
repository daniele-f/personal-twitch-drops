# Testing Strategy

Manual testing must not be used as a substitute for reasonable automated testing.

## Unit tests

Unit-test deterministic business logic: favorites and blacklist rules, subscription filtering, snapshot rollover, change detection, refresh cooldowns, import/export, and duplicate-notification prevention.

## Provider/parser tests

Provider tests map a `twitchdrops.app` response to normalized application models. Use checked-in fixtures rather than repeatedly calling the live source.

## Integration tests

Add integration tests when service interactions need coverage, especially refresh-to-snapshot-to-change-detection flows and preference/notification interactions.

## Manual browser testing

Manually assess visual layout, responsive behavior, navigation, notification permissions, persistence across reloads, real Twitch data, and user experience. These require a browser or human judgment; deterministic logic does not.

## Commands

Run `npm test` for tests, `npm run lint` for linting, and `npm run build` for the production build. Angular's current Vitest-based runner is non-interactive in CI with `npm test -- --watch=false`.
