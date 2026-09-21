# Button Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply consistent hover, pressed, focus, and disabled styling to every app control.

**Architecture:** A standalone `appButton` directive attaches base and variant CSS classes without owning behavior. Existing native controls and the Preferences router anchor opt into its variant; global SCSS provides the state treatment.

**Tech Stack:** Angular 22 standalone directive, SCSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-button-interactions-design.md`

## Global Constraints

- Preserve native button and anchor semantics, router navigation, event handlers, and accessible names.
- Support `default`, `primary`, `neutral`, and `icon` variants.
- Hover lightens controls; active darkens them and shifts them down one pixel; focus remains visibly purple.
- Disabled controls do not advertise pointer interaction or move.

## Review Focus

- An anchor must receive button styling without gaining a button ARIA role; Task 1 tests this.
- An unknown variant must safely fall back to default; Task 1 tests this.
- Existing icon actions must retain their compact layout at 320px; Task 2 manually verifies this.

---

### Task 1: Create the button directive and state styles

**Files:**
- Create: `src/app/ui/button.directive.ts`
- Create: `src/app/ui/button.directive.spec.ts`
- Modify: `src/styles.scss`

**Interfaces:**
- Produces selector `[appButton]` with input `appButton: 'default' | 'primary' | 'neutral' | 'icon'`.

- [ ] **Step 1: Write the failing directive test.**

```ts
it('adds base and selected variant classes to an anchor', () => {
  @Component({ template: '<a appButton="primary" href="/preferences">Preferences</a>', imports: [ButtonDirective] })
  class Host {}
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const link = fixture.nativeElement.querySelector('a');
  expect(link.classList).toContain('app-button');
  expect(link.classList).toContain('app-button--primary');
  expect(link.getAttribute('role')).toBeNull();
});
```

- [ ] **Step 2: Run `npm test`; expect the directive import to fail.**
- [ ] **Step 3: Implement the directive with `host: { '[class.app-button]': 'true', '[class.app-button--primary]': "appButton === 'primary'" }` and equivalent variant bindings.**
- [ ] **Step 4: Add `.app-button` global SCSS with hover, active, focus-visible, and disabled states; run `npm test` and expect PASS.**
- [ ] **Step 5: Commit with `git commit -m "feat: add reusable button interactions"`.**

### Task 2: Migrate existing controls

**Files:**
- Modify: `src/app/app.html`, `src/app/drop-list/drop-list.html`, `src/app/drops-page/drops-page.html`, `src/app/preferences-page/preferences-page.html`, `src/app/conflict-resolution/conflict-resolution.html`
- Modify: component specs that render the affected controls.

- [ ] **Step 1: Write failing tests that assert Preferences uses `appButton="default"`, Refresh and Keep Favorite use `primary`, remove/hide/disclosure use `neutral`, and stars/slash use `icon`.**
- [ ] **Step 2: Run `npm test`; expect missing directive attributes.**
- [ ] **Step 3: Add `ButtonDirective` to each standalone component import and apply the specified variants without changing control labels or handlers. Remove obsolete duplicated per-control state styling.**
- [ ] **Step 4: Run `npm test`, `npm run lint`, and `npm run build`; expect all commands to exit successfully.**
- [ ] **Step 5: Manually check hover, mouse press, keyboard focus, disabled behavior, desktop, and 320px layouts; commit with `git commit -m "feat: apply shared button states"`.**
