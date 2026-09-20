# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the static Angular foundation to GitHub Pages from `main`.

**Architecture:** GitHub Actions builds the Angular project with its repository base path, uploads the static browser artifact, and deploys it through the official Pages actions. No deployment branch or server runtime is added.

**Tech Stack:** Angular CLI, npm, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-20-github-pages-design.md`

## Global Constraints

- Deploy `dist/personal-twitch-drops/browser` only; do not commit generated output.
- Build with `/personal-twitch-drops/` as the base path.
- Deploy on pushes to `main`; keep pull-request CI separate from deployment.
- Use GitHub Actions as the Pages source and do not create a `gh-pages` branch.
- Delete merged feature/fix/refactor branches when no longer needed; never delete `main` or an active branch.

## Review Focus

- Repository-site asset URLs must include the project base path rather than incorrectly assuming a custom domain root.
- Only the production browser artifact—not source files or an SSR/server output—may be published.
- Pages workflow permissions must permit deployment without granting unnecessary repository write access.
- Older deployment runs must not replace a newer successful deployment.
- The branch-cleanup rule must not authorize deletion of `main` or work still under review.

---

### Task 1: Add GitHub Pages workflow and branch-cleanup governance

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `AGENTS.md`
- Test: workflow presence, workflow YAML inspection, and `git diff --check`.

**Interfaces:**
- Consumes: Angular `npm run build` command and output at `dist/personal-twitch-drops/browser`.
- Produces: a `main`-triggered Pages deployment workflow and permanent branch-cleanup guidance.

- [ ] **Step 1: Verify the deployment workflow is absent**

Run: `Test-Path .github/workflows/deploy-pages.yml`

Expected: `False` before workflow creation.

- [ ] **Step 2: Add the Pages deployment workflow**

Create a workflow that has `push` trigger restricted to `main`; uses `actions/checkout@v4`, `actions/setup-node@v4` with Node 24 and npm cache, `npm ci`, and `npm run build -- --base-href /personal-twitch-drops/`; then configures Pages, uploads `dist/personal-twitch-drops/browser`, and deploys it. Include `contents: read`, `pages: write`, and `id-token: write` permissions plus a non-cancelling `github-pages` concurrency group.

```yaml
concurrency:
  group: github-pages
  cancel-in-progress: false
```

- [ ] **Step 3: Add explicit branch-cleanup rule**

Add this behavior to `AGENTS.md`: delete merged, no-longer-needed feature/fix/refactor branches locally and remotely; retain `main` and active branches.

- [ ] **Step 4: Verify the workflow and its scope**

Run:

```powershell
Test-Path .github/workflows/deploy-pages.yml
git diff --check
git diff -- .github/workflows/deploy-pages.yml AGENTS.md
```

Expected: the workflow exists, has no whitespace errors, builds with the repository base path, and deploys only the browser output.

- [ ] **Step 5: Commit**

```powershell
git add .github/workflows/deploy-pages.yml AGENTS.md
git commit -m "ci: deploy Angular app to GitHub Pages"
```

### Task 2: Verify production output at the Pages base path

**Files:**
- Modify: no source files expected.
- Test: Angular test, lint, base-path production build, and output inspection.

**Interfaces:**
- Consumes: the base-path build command and Pages artifact path defined in Task 1.
- Produces: verification evidence that the deployable artifact has correct asset URLs.

- [ ] **Step 1: Run the complete project verification**

Run:

```powershell
npm test -- --watch=false
npm run lint
npm run build -- --base-href /personal-twitch-drops/
```

Expected: each command exits with code 0.

- [ ] **Step 2: Inspect the generated entry point**

Run:

```powershell
rg -n 'base href="/personal-twitch-drops/"' dist/personal-twitch-drops/browser/index.html
Test-Path dist/personal-twitch-drops/browser/index.html
```

Expected: the artifact entry point exists and declares the repository base path.

- [ ] **Step 3: Review scope before commit/push**

Run:

```powershell
git status --short
git diff main...HEAD --check
git diff main...HEAD --name-only
```

Expected: only the deployment workflow, governance update, and committed planning/design files are in the branch; no generated output is tracked.

## Self-review

- Spec coverage: Task 1 covers official Actions deployment, permissions, concurrency, Pages source, artifact selection, and cleanup policy. Task 2 covers base-path output and project verification.
- Placeholder scan: no incomplete steps remain.
- Type consistency: the artifact path and base path are consistent between workflow and verification.
- Review focus: Task 1 inspects permissions, artifact scope, concurrency, trigger, and cleanup wording; Task 2 verifies the generated base URL and absence of tracked build output.
