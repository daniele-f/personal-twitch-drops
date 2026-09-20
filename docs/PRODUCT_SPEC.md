# Product Specification

## Product direction

Personal Twitch Drops is an Angular frontend that will be deployed to GitHub Pages. It helps a user discover active Twitch Drops campaigns and track the games and campaigns that matter to them. Development is incremental; this repository foundation does not yet implement the product features described below.

## Data and filtering

- `twitchdrops.app` is the preferred primary Drops source, behind a provider abstraction.
- Show all active Drops by default, with Favorites and Blacklist controls.
- Support subscription-only filtering; subscription Drops are hidden by default.
- Retain user preferences in localStorage.

## Change detection

The app identifies New Game, New Campaign, Ended Campaign, and Changed Campaign and exposes a Changes badge.

- **New Game:** the game had no active Drops in the previous snapshot and has active Drops now. A game that had Drops months ago, became inactive, then becomes active again is a New Game.
- **New Campaign:** the game was already active in the previous snapshot and an additional active campaign appears.
- **Ended:** a campaign from the previous snapshot is no longer active. Use **Ended**, never “Removed”.

Notify only for favorites, only after explicit browser-notification opt-in, and prevent duplicate notifications.

## Refresh, storage, and transfer

Store only current and previous normalized snapshots in IndexedDB; there is no long-term history. Refresh stale data automatically after approximately 30 minutes and allow manual refresh. Refresh must include cooldown, debounce, and concurrency protection.

Import/export covers favorites and blacklist only, using an opaque reversible export string.

## Presentation

Start with a dark Twitch-purple theme, centralized with CSS custom properties so theme switching can be added later. The first product layout is a list. No real product UI is part of this foundation branch.
