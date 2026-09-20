# Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a reviewable Angular, governance, documentation, test, hygiene, and CI foundation for Personal Twitch Drops.

**Architecture:** A minimal standalone Angular application is the only executable product artifact. Repository documentation defines future provider and state boundaries without implementing them; CI validates the project’s normal lint, test, and production-build commands.

**Tech Stack:** Angular, TypeScript, SCSS, Angular Router, Angular Signals/RxJS, Jasmine/Karma, ESLint, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-20-project-setup-design.md`

## Global Constraints

- Do not implement Twitch Drops product features or a real product UI.
- Keep dependencies minimal and compatible with static GitHub Pages hosting.
- Keep provider DTOs separate from normalized application models in future work.
- Preserve only current and previous snapshots in the future IndexedDB design.
- Do not commit secrets, dependency folders, generated build output, or unrelated files.
- The branch targets `main`; never merge it without explicit user approval.

## Review Focus

- A fresh checkout must support `npm ci`; CI uses the lockfile rather than a mutable install.
- Headless tests must terminate in CI instead of waiting for a browser session.
- The production build must emit a static browser artifact with no server runtime requirement.
- Browser routing must retain a clear GitHub Pages-compatible extension path without introducing deployment behavior now.
- Ignored environment files must not accidentally hide the documented public configuration template if one is added later.

---

### Task 1: Scaffold the Angular application and baseline verification

**Files:**
- Create: `angular.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `src/main.ts`, `src/index.html`, `src/styles.scss`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`, `src/app/app.routes.ts`, `src/app/app.config.ts`, `src/app/app.spec.ts`
- Modify: `package.json`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: Angular CLI application schematic.
- Produces: `npm test`, `npm run lint`, and `npm run build` scripts plus a standalone routed application shell.

- [ ] **Step 1: Create the Angular project with its generated starter test**

Run:

```powershell
npx --yes @angular/cli@latest new personal-twitch-drops --directory . --routing --style=scss --standalone --skip-git --package-manager=npm --ssr=false
```

- [ ] **Step 2: Run the generated test and verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`

Expected: the generated application test passes in headless Chrome.

- [ ] **Step 3: Replace the default starter content with the intentionally minimal project starter**

Implement a standalone root component whose template identifies the project as an incremental foundation and whose test asserts that heading. Keep routing configured with an empty route list; do not add feature routes or state libraries.

```typescript
expect(fixture.nativeElement.textContent).toContain('Personal Twitch Drops');
```

- [ ] **Step 4: Run each project check**

Run:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless
npm run lint
npm run build
```

Expected: every command exits with code 0.

- [ ] **Step 5: Commit**

```powershell
git add angular.json package.json package-lock.json tsconfig*.json src
git commit -m "chore: initialize Angular application"
```

### Task 2: Add governance, product documentation, fixtures guidance, and hygiene

**Files:**
- Create: `AGENTS.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `src/test/fixtures/README.md`, `.gitignore`, `README.md`
- Modify: `README.md`
- Test: documentation inspection and `git check-ignore` checks.

**Interfaces:**
- Consumes: the verified npm commands from Task 1.
- Produces: permanent contributor rules and a documented future architecture/testing contract.

- [ ] **Step 1: Write a failing hygiene check**

Run:

```powershell
git check-ignore node_modules dist .env
```

Expected: failure before `.gitignore` exists because the paths are not ignored.

- [ ] **Step 2: Add concise contributor rules and documentation**

Document the required branch/merge/definition-of-done rules in `AGENTS.md`; the full requested product behavior in `PRODUCT_SPEC.md`; service boundaries, storage choices, CSS variables, static-hosting constraints, and provider fallback order in `ARCHITECTURE.md`; and automated versus manual testing responsibilities in `TESTING.md`. Add fixture guidance that forbids repeated live provider calls in tests. Add README setup commands and links to these documents.

- [ ] **Step 3: Add repository ignores**

Add rules for `node_modules/`, Angular build/cache output, IDE metadata, secret environment files while allowing a possible `.env.example`, logs, and temporary files.

```gitignore
node_modules/
dist/
.angular/
.env
.env.*
!.env.example
```

- [ ] **Step 4: Verify the hygiene check now passes**

Run:

```powershell
git check-ignore node_modules dist .env
git diff --check
```

Expected: all three ignored paths are reported and the diff has no whitespace errors.

- [ ] **Step 5: Commit**

```powershell
git add AGENTS.md README.md .gitignore docs/PRODUCT_SPEC.md docs/ARCHITECTURE.md docs/TESTING.md src/test/fixtures/README.md
git commit -m "docs: add project governance and specifications"
```

### Task 3: Configure pull-request CI and perform release verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` if a CI-safe test script is required
- Test: workflow YAML inspection and local commands.

**Interfaces:**
- Consumes: `npm ci`, lint, headless test, and build commands from Task 1.
- Produces: a GitHub Actions workflow for pull requests targeting `main` and pushes to `main`.

- [ ] **Step 1: Write a failing workflow presence check**

Run: `Test-Path .github/workflows/ci.yml`

Expected: `False` before workflow creation.

- [ ] **Step 2: Create CI workflow**

Configure `pull_request` targeting `main` and `push` to `main`; use checkout, supported Node LTS setup with npm cache, `npm ci`, `npm run lint`, headless non-watch tests, and `npm run build`.

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

- [ ] **Step 3: Verify workflow and complete local checks**

Run:

```powershell
Test-Path .github/workflows/ci.yml
npm test -- --watch=false --browsers=ChromeHeadless
npm run lint
npm run build
git diff --check
```

Expected: workflow exists and all checks exit with code 0.

- [ ] **Step 4: Review the complete staged diff for scope and secrets**

Run:

```powershell
git status --short
git diff --cached --check
git diff --cached --name-only
```

Expected: only project setup artifacts are present; no `dist`, `.angular`, `node_modules`, environment secrets, or unrelated content is staged.

- [ ] **Step 5: Commit**

```powershell
git add .github/workflows/ci.yml package.json package-lock.json
git commit -m "ci: validate Angular project"
```

## Self-review

- Spec coverage: Task 1 provides the minimal Angular foundation; Task 2 covers governance, product/architecture/testing documentation, fixture guidance, README, and hygiene; Task 3 covers CI and the full required checks.
- Placeholder scan: no incomplete task steps or unspecified files remain.
- Type consistency: only Angular CLI-generated interfaces are used; Task 1 produces the npm command interface consumed by later tasks.
- Review focus: Task 1 validates headless tests and static build; Task 2 validates ignores; Task 3 validates CI command parity and its triggers.
