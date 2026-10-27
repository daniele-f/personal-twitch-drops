# Reward filter summary

## Intent

Make the active reward filters understandable without requiring users to inspect every campaign card.

## Goals

- Show the number of games and rewards hidden by the checked reward filters.
- Update the counts immediately when either filter changes.

## Non-goals

- Do not change which rewards the filters hide.
- Do not remove the existing per-section hidden-game indication.

## Approach

Add one summary to the shared Filters popover: `N games hidden · M rewards hidden`.
It is derived from the displayed drops and their loaded reward details, so it always matches the current filters. This is preferred over separate counters because the two values are most useful together and occupy less UI space.

## Verification

Add a component regression test for the zero-filter state and for the counts after subscription and badge filters are checked.
