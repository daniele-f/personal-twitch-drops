# Development Rules

Read the relevant files in `docs/` before implementing a feature.

## Git workflow

- Never implement normal features or fixes directly on `main`.
- Branch each independently testable feature or fix from the latest `main` using `feature/...`, `fix/...`, or `refactor/...`.
- Keep unrelated changes out of feature branches. Prefer squash merges into `main`.
- Never merge into `main` without explicit user approval.

## Definition of Done

Work is ready for user review only when implementation and appropriate automated tests are complete; tests, lint, and production build pass; the diff is reviewed; no unrelated changes, secrets, or generated files are included; the branch is pushed; and a PR to `main` exists. Tell the user what changed, which automated checks ran, and a short manual test checklist.

## Automated-first testing

Do not ask users to manually test deterministic logic that can reasonably be automated. Cover business logic such as favorites/blacklist behavior, subscription filtering, snapshot rollover, change detection, refresh cooldowns, import/export, and duplicate-notification prevention with automated tests.

Manual testing is for visual behavior, browser interaction, real external data, permissions, responsive layout, UX, and integrations requiring browser or human judgment.

## Merge approval

After a user says the feature is tested and approved (for example, “looks good”, “tested, works”, or “merge it”), confirm CI passes, the PR still targets `main`, and there are no conflicts; merge it; update local `main`; run a production build on merged `main`; and report the result.

## Architecture principles

- Isolate Twitch Drops provider logic from application logic and keep provider parsing out of components.
- Centralize theme colors with CSS variables; avoid giant components/services.
- Prefer Angular services and Signals/RxJS to unnecessary state libraries.
- Add no backend without a clear technical need.
- Keep the project compatible with static GitHub Pages hosting and never hardcode frontend secrets.
