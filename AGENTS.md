# Development Rules

Read only the documentation relevant to the current task. Do not reread unrelated files in `docs/` or scan the entire repository unless necessary.

Prefer targeted inspection of the files directly related to the requested feature or fix.

## Context efficiency

* Keep repository exploration focused on the current task.
* Do not repeatedly reread unchanged files unless needed.
* Do not inspect the entire repository when a smaller set of files is sufficient.
* Prefer targeted searches and file reads over broad scans.
* Reuse information already established during the current task instead of rediscovering it.
* Keep plans and explanations concise unless additional detail is necessary.
* Do not perform unrelated refactors, cleanup, or architectural investigations while implementing a focused task.

## Collaboration defaults

* Present one combined feature proposal covering the behavior, implementation approach, UI impact, error handling, and test plan; get one approval before implementation.
* Use native execution for every feature or fix.
* Never create or use Git worktrees for this project; work in the current checkout.

## Git workflow

* Never implement normal features or fixes directly on `main`.
* Branch each independently testable feature or fix from the latest `main` using `feature/...`, `fix/...`, or `refactor/...`.
* Keep unrelated changes out of feature branches.
* Prefer squash merges into `main`.
* Never merge into `main` without explicit user approval.
* Delete merged, no-longer-needed `feature/`, `fix/`, and `refactor/` branches locally and remotely.
* Never delete `main` or an active branch.

Before starting a new task:

1. Fetch the latest repository state.
2. Update local `main`.
3. Create the task branch from the latest `main`.
4. Inspect only the project files and documentation relevant to that task.

## Definition of Done

Work is ready for user review only when:

* implementation is complete
* appropriate automated tests are complete
* tests pass
* lint passes
* production build passes
* the diff has been reviewed
* no unrelated changes are included
* no secrets are included
* no generated files are accidentally included
* the branch is pushed
* a pull request targeting `main` exists

At handoff, tell the user:

* what changed
* which automated checks actually ran
* what automated coverage was added
* what they should manually test
* any known limitations

Keep the manual test checklist short and specific.

## Automated-first testing

Do not ask the user to manually test deterministic logic that can reasonably be automated.

Cover business logic such as:

* favorites and blacklist behavior
* favorites/blacklist mutual exclusion
* subscription filtering
* snapshot rollover
* change detection
* refresh cooldowns and concurrency protection
* import/export
* duplicate-notification prevention
* failed-refresh behavior

Manual testing is for:

* visual behavior
* browser interaction
* real external data
* permissions
* responsive layout
* UX
* integrations requiring browser or human judgment

Do not repeatedly call real external services in automated tests when fixtures or mocks can provide deterministic coverage.

## Merge approval

After the user says the feature is tested and approved, for example:

* `looks good`
* `tested, works`
* `merge it`

then:

1. confirm CI passes
2. confirm the PR still targets `main`
3. confirm there are no merge conflicts
4. merge the PR
5. update local `main`
6. run a production build on merged `main`
7. report the result

Do not require a specific approval phrase.

Do not make unreviewed fixes directly on `main` if post-merge verification fails. Create a dedicated fix branch.

## Architecture principles

* Isolate Twitch Drops provider logic from application logic.
* Keep provider-specific parsing and DTOs out of Angular components.
* Normalize external Drops data before application logic consumes it.
* Centralize theme colors with CSS custom properties.
* Keep future theme switching easy to add.
* Avoid giant components and services.
* Prefer Angular services, Signals, and RxJS over unnecessary state-management libraries.
* Add no backend without a clear technical need.
* Keep the project compatible with static GitHub Pages hosting.
* Never hardcode frontend secrets.
* Keep external providers replaceable.
* Prefer deterministic fixtures for provider/parser tests.

## Scope discipline

When implementing a feature or fix:

* implement only what is required for the current task
* avoid unrelated refactors
* avoid speculative abstractions unless the current feature needs them
* do not add dependencies without a clear benefit
* do not change public behavior outside the requested scope unless required to fix a bug
* mention discovered unrelated issues instead of fixing them silently

If a broader architectural change becomes necessary, explain why before expanding the task.
