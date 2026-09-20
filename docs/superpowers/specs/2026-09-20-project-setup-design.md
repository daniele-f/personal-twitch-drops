# Project Setup Design

## Intent and scope

Create the first reviewable foundation for Personal Twitch Drops. This change establishes an Angular application, repository governance, product and architecture documentation, testing conventions, and pull-request CI. It deliberately does not implement Drops discovery, preferences, notifications, provider parsing, or the product UI.

The application must remain suitable for static GitHub Pages hosting. The initial Angular route should therefore be small and conventional, with deployment-specific routing configuration deferred until deployment is introduced.

## Design

The repository will contain a current Angular standalone application using TypeScript, SCSS, Angular routing, Signals where local state is useful, and RxJS only when asynchronous streams need it. Dependencies stay limited to the Angular toolchain and its test/lint support. The starter page is intentionally minimal.

Project rules live in `AGENTS.md`. Product requirements, the target service boundaries, and the testing strategy live in the three requested `docs/` files. Provider test fixtures have a dedicated source-controlled directory and a short explanation, without fabricated live-data fixtures.

GitHub Actions runs install, lint, headless tests, and a production build for pull requests to `main` and pushes to `main`. Repository ignores keep dependencies, build artifacts, private environment files, and editor clutter out of version control.

## Future boundaries

The documentation specifies normalized application models behind a `DropsProvider` abstraction. Provider DTOs stay isolated; preferences use localStorage, snapshots use IndexedDB with only previous/current data, and application state relies on Angular Signals/RxJS rather than an external state library. CSS custom properties centralize the initial dark Twitch-purple theme and retain a path to later theme switching.

## Verification

The completed branch must pass `npm test`, `npm run lint`, and `npm run build`; CI runs their headless/non-interactive equivalents. The diff will be checked for generated output, secrets, and unrelated changes before the branch is pushed and its pull request is opened.
