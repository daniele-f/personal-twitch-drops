# Favorites Design

## Intent

Let a user mark an active Twitch Drops game as a favorite so it is easier to find. Favorites persist in the browser and appear in a dedicated list above the remaining active Drops. A game is never shown in both lists.

## Scope

This feature adds favorite state, browser-local persistence, list partitioning, and the star-button interaction. It does not add blacklist controls, subscription filters, snapshot storage, automatic refresh/cooldowns, change detection, notifications, import/export, or another data provider.

## Preference boundary

`PreferencesService` owns the set of favorited normalized drop IDs and persists it in `localStorage`. It exposes the current IDs as application state plus explicit operations to add and remove one ID. The service validates stored data and falls back to an empty set if storage is unavailable or malformed.

The root application derives the screen lists from the current live drops and favorite IDs. A currently active favorite is placed in Favorites; every other active item is placed in Active Drops. Saved IDs for games that are not currently active remain stored, so a game is restored to Favorites if it returns later.

## Screen and interaction

While live Drops load, the existing four decorative skeleton rows remain unchanged. On success, the screen behaves as follows:

1. Show a Favorites list above Active Drops only when at least one current item is favorited. Hide the Favorites heading and list entirely when it is empty.
2. Render each active item in exactly one semantic list.
3. Put an accessible, right-aligned star button on every card. Its accessible name describes whether the next normal action adds or begins removing a favorite.
4. Clicking a normal star adds the item to favorites immediately; the card moves to Favorites without a reload.
5. Clicking a star on a favorite arms removal: while the control is hovered or focused, it turns red and shows the exact instruction `Press the star again to unfavorite`.
6. Clicking the armed red star removes the favorite immediately and moves the card to Active Drops. Pointer leaving the control or keyboard focus leaving it cancels the armed state, returns the star to its normal favorite appearance, and hides the instruction.

The existing provider failure and Retry state remain unchanged. Favorited IDs are not lost by a loading failure or a Retry request.

## Accessibility and responsive behavior

The star is a real button, supports keyboard focus and activation, and has visible focus treatment. The red confirmation is communicated in text, not color alone. List headings and card content remain readable at 320px; the right-side action does not force horizontal overflow.

## Testing and verification

Unit tests cover parsing valid and malformed stored preferences, persistence after add/remove, and safe behavior when storage is unavailable. Component and app tests cover hidden empty Favorites, mutually exclusive list partitioning, immediate favorite and unfavorite moves, armed-removal cancellation on pointer/focus exit, the exact confirmation text, keyboard-accessible button semantics, and preserved loading/error behavior.

Before review, run the full Angular test suite, lint, and production build. Manually check persistence after a browser reload, mouse and keyboard removal flows, a successful real-data load, and both desktop and 320px layouts.
