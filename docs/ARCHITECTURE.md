# Architecture

## Application boundary

The application is a static Angular frontend compatible with GitHub Pages. No permanent backend is planned by default. Angular standalone components provide the UI; Signals represent local application state and RxJS handles asynchronous streams where it clarifies composition or cancellation.

## Provider and normalization layer

`DropsProvider` defines the application-facing source contract. `TwitchDropsAppProvider` implements it for `twitchdrops.app`; a fallback provider capability lets the source change without leaking provider DTOs into components or services. A normalization layer maps provider-specific DTOs to normalized application models.

If `twitchdrops.app` is unavailable to browsers because of CORS, choose fallbacks in this order:

1. Another browser-accessible structured source.
2. GitHub Actions-generated static JSON.
3. A lightweight serverless proxy, only if genuinely necessary.

## Services

- `PreferencesService` persists favorites, blacklist, filters, and notification opt-in in localStorage.
- `SnapshotService` stores only current and previous normalized snapshots in IndexedDB.
- `ChangeDetectionService` compares those snapshots for new games, new campaigns, ended campaigns, and changed campaigns.
- `RefreshService` coordinates stale refreshes, manual refresh, cooldowns, debouncing, and concurrent requests.
- `NotificationService` manages explicit browser permission and favorite-only, de-duplicated notifications.
- `ImportExportService` serializes only favorites and blacklist into an opaque reversible string.

## UI conventions

Theme values use CSS custom properties, beginning with a dark Twitch-purple palette, so future theme switching changes variables rather than scattered component styles. Provider-specific parsing stays outside components. Keep components and services focused rather than creating large all-purpose classes.
