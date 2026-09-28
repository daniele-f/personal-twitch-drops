# Shared UI Components

Reusable Angular UI lives in `src/app/ui/`. Feature components own data and
actions; these primitives only render state and emit user interaction.

| Primitive | Source | Use it for | API / variants | Current consumers |
| --- | --- | --- | --- | --- |
| `appButton` | `src/app/ui/button.directive.ts` | Semantic buttons and button-like links | `default`, `primary`, `neutral`, `icon`, `destructive` | App header; available to all feature templates |
| `appCollapseChevron` | `src/app/ui/collapse-chevron.{ts,html,scss}` | Decorative expanded/collapsed indicator inside an existing control | `expanded` | Drop-list reward detail controls; disclosure |
| `appDisclosure` | `src/app/ui/disclosure.{ts,html,scss}` | Expandable sections with an icon, label, count, and animated chevron | `expanded`, `icon`, `count`, `toggled` | Preferences Favorites and Ignore List |
| `appToggle` | `src/app/ui/toggle.{ts,html,scss}` | Accessible labelled on/off switches | `controlId`, `label`, `checked`, `checkedChange` | Changes popover; drop filters |
| `appStatusBadge` | `src/app/ui/status-badge.{ts,html,scss}` | Short availability/state labels | `active`, `inactive`, `unavailable`, `pending` | Preferences tables |
| `appGameCard` | `src/app/ui/game-card.{ts,html,scss}` | Projected game-level card content on a semantic `<article>` | `title`, `imageUrl`, `expanded` | Favorite campaign rows in `DropListComponent` |
| `appDropCard` | `src/app/ui/drop-card.{ts,html,scss}` | Projected campaign/drop card content on a semantic `<article>` | `title`, `timeLabel`, `rewardSummary`, `imageUrl`, `expanded` | Active campaign rows in `DropListComponent` |

Use a feature-local element instead when it belongs to just one feature
(for example reward cards, toasts, and the conflict dialog). When a new
shared primitive is added, include its source path, public API, intended use,
and current consumers in this table.
