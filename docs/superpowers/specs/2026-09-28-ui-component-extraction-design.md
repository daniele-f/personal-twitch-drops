# UI Component Extraction Design

## Purpose

Create a small, discoverable shared UI layer so future features can use the
same controls and card patterns without copying HTML, TypeScript, or SCSS.
The dashboard must retain its current behavior and visual hierarchy.

## Boundaries

Shared primitives live in `src/app/ui/`. Feature areas keep domain state,
data loading, and feature-specific markup. A primitive accepts display state
and emits user intent; it never accesses drop or preference services.

The shared set is:

- `appButton`: semantic button/link styling with default, primary, neutral,
  icon, and destructive variants.
- `appIconButton`: the icon-only accessibility contract, implemented as a
  button variant rather than a separate semantic element.
- `appCollapseChevron`: presentation-only expanded/collapsed indicator.
- `appDisclosure`: an accessible expandable-section trigger that composes an
  optional icon, label, count, and the collapse chevron.
- `appToggle`: labelled checkbox-based on/off control with a consistent
  keyboard focus indicator.
- `appStatusBadge`: display-only active, inactive, and unavailable status.
- `appGameCard`: reusable game summary card with projected actions and state.
- `appDropCard`: reusable campaign/drop summary card with projected actions,
  metadata, and expandable details.
- Shared page-shell and form-control styles for common layout and controls.

Feature-specific details remain local: reward grids, changes popover, debug
menu, conflict dialog, and notification toasts.

## Data Flow and Accessibility

Parent feature components own all business state. Cards receive model display
data and project feature-owned action controls or details. Disclosure and
toggle primitives expose standard Angular inputs and outputs. Native buttons,
links, and checkbox controls retain their semantics. Icon-only buttons require
an accessible name. Expanded state is communicated through `aria-expanded`.

## Documentation

`docs/COMPONENTS.md` is the authoritative component catalog. Each entry names
its source files, inputs/variants, intended use, and examples of consuming
areas. New reusable UI must be added to this catalog when introduced.

## Verification

Unit tests will cover class/attribute rendering and input/output behavior for
new primitives. The completed refactor runs lint, the full test suite, and a
production build. Manual UI checks remain with the user: cards, toggles,
disclosures, button states, and responsive behavior should look unchanged.
