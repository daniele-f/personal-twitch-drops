# Code Map

Use this map only to locate an unfamiliar feature area. It describes stable ownership boundaries, not every file. Update it only when a feature area is added, removed, moved, or materially changes responsibility.

- `src/app/app.*`, `app.routes.ts`, `app.config.ts`: application shell, routing, dependency configuration, and global styling.
- `src/app/drops/`: normalized drop models, source contract, and `twitchdrops.app` parsing.
- `src/app/drops-page/`: live-drops screen orchestration, loading state, and favorite/blacklist partitioning.
- `src/app/drop-list/`: reusable campaign-list UI, reward details, filtering, and list interactions.
- `src/app/preferences/`: persisted favorites and blacklist data, storage abstraction, and import/export logic.
- `src/app/preferences-page/`: preferences screen and its user interactions.
- `src/app/changes/`: daily snapshots, drop comparison, and change state.
- `src/app/conflict-resolution/`: modal UI for resolving favorite/blacklist conflicts.
- `src/app/ui/`: shared UI directives and primitives.
- `src/test/fixtures/`: checked-in external-provider response fixtures.