# Testing Strategy

Manual testing must not be used as a substitute for reasonable automated testing.

## Unit tests

Unit-test deterministic business logic: favorites and blacklist rules, subscription filtering, snapshot rollover, change detection, refresh cooldowns, import/export, and duplicate-notification prevention.

## Provider/parser tests

Provider tests map a `twitchdrops.app` response to normalized application models. Use checked-in fixtures rather than repeatedly calling the live source.

## Integration tests

Add integration tests when service interactions need coverage, especially refresh-to-snapshot-to-change-detection flows and preference/notification interactions.

## Manual browser testing

The user performs manual browser testing. At handoff, provide a focused checklist for visual layout, responsive behavior, navigation, notification permissions, persistence across reloads, real Twitch data, and user experience when those areas are affected. Deterministic logic belongs in automated tests.

## Commands

Run `npm test` for tests, `npm run lint` for linting, and `npm run build` for the production build. Angular's current Vitest-based runner is non-interactive in CI with `npm test -- --watch=false`.
