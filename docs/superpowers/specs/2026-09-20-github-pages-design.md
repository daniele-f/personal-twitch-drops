# GitHub Pages Deployment Design

## Intent

Publish the current static Angular foundation at `https://daniele-f.github.io/personal-twitch-drops/` without adding product features or a server. Deploy automatically whenever `main` changes.

## Deployment approach

Use GitHub’s official Pages workflow actions. The workflow builds the production Angular application with the repository base path `/personal-twitch-drops/`, uploads `dist/personal-twitch-drops/browser` as the Pages artifact, and deploys that artifact using GitHub’s deployment action. Repository Pages is configured to use GitHub Actions as its source.

This keeps generated files out of Git and avoids a `gh-pages` branch. The resulting deployment is static and has no backend runtime.

## Routing and failure behavior

The deployed starter has no feature routes. Its configured base path ensures assets resolve at the project-site URL. When application routes are added, use a GitHub Pages-compatible strategy (such as hash routing or a static fallback) as part of that feature rather than prematurely adding redirect behavior now.

The workflow has minimal read permissions plus the required Pages and OIDC write permissions. A concurrency group prevents older deploy runs from superseding the newest deployment.

## Repository workflow

Add an `AGENTS.md` rule to delete merged feature/fix/refactor branches locally and remotely once they are no longer needed. Do not delete `main` or active branches.

## Verification

Verify the project production build with the Pages base path, lint, and tests. After the pull request is opened, confirm its CI passes. After merging, confirm the Pages deployment succeeds and the published URL loads the Angular starter page.
