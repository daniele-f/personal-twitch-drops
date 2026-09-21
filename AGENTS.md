# Project Working Agreement

## Focus

* Read and inspect only the files and documentation relevant to the current task.
* Keep plans and explanations concise.
* Do not make unrelated refactors, cleanup, or architectural changes. Report unrelated issues instead.

## Collaboration defaults

* Present one combined feature proposal covering behavior, approach, UI impact, error handling, and tests. Get one approval before implementation.
* Use native execution for every feature or fix.
* Never create or use Git worktrees for this project; work in the current checkout.

## Documentation

* Do not create design specifications or implementation-plan files for normal feature work unless the user explicitly requests them. Keep planning in the conversation. Create repository documentation only when it is required for the product, requested by the user, or needed to explain a lasting architectural decision.

## Git and merging

* Put each normal feature or fix on its own `feature/...`, `fix/...`, or `refactor/...` branch from the latest `main`.
* Keep unrelated changes out of the branch and prefer squash merges into `main`.
* Never merge feature or fix code into `main` without the user's explicit approval.
* Documentation-only or workflow-rule changes may be committed directly to `main` when the user asks.
* Before merging a feature or fix, confirm CI passes, the PR targets `main`, and there are no merge conflicts. After merging, update local `main` and run a production build.
* After a feature or fix is merged and pushed, rename the current conversation to a concise summary prefixed with its type, such as `feat: ...`, `fix: ...`, or `refactor: ...`.

## Testing and handoff

* For code changes, run appropriate automated tests, lint, and a production build. For documentation-only changes, run only relevant checks.
* Automate deterministic logic; use fixtures or mocks for external-provider tests instead of repeatedly calling real services.
* Manually check UI features in the browser, including real external data when relevant.
* At handoff, state what changed, which checks ran, what the user should test, and any limitations.

## Architecture

* Keep external provider parsing and DTOs out of Angular components; normalize provider data before app logic consumes it.
* Keep providers replaceable, avoid giant components/services and unnecessary state libraries, and centralize theme colors with CSS custom properties.
* Keep the app compatible with static GitHub Pages hosting. Do not add a backend, dependencies, or frontend secrets without a clear need.
