# Basic Shell Design

## Intent

Replace the temporary Angular starter with the first visual Personal Twitch Drops shell. It should establish the focused, favorites-first list hierarchy without implementing real Twitch data, persistence, filtering, refresh behavior, notifications, or provider logic.

## Layout

The page uses the existing dark Twitch-purple CSS variables and is responsive from narrow mobile widths to desktop. Its header shows the Personal Twitch Drops wordmark plus visible Preferences, Changes, and Refresh actions. These controls are presentational in this branch and must not claim functional behavior.

The main content starts with Active Drops and an updated timestamp. A Favorites section appears first and a Newly added section follows it. Each section has a small count and shows compact game/campaign rows with a visual thumbnail placeholder, game name, campaign description, and an appropriate favorite or new indicator. Static typed placeholder data supplies the rows.

## Components and data

Keep the root application component limited to application chrome. Create a focused presentational list component and a typed local shell-data module. The list component receives section data through inputs; it does not know about Twitch providers, localStorage, IndexedDB, or future application services. This gives the future data layer a small, replaceable boundary.

## Accessibility and responsive behavior

Use semantic header, main, section, list, article, and button elements. Actions have visible labels. The layout remains readable at 320px without horizontal scrolling; secondary actions may wrap rather than disappear. Visual status labels use words as well as color.

## Verification

Component tests verify the Favorites section appears before Newly added and that representative placeholder rows and labels render. Run the full Angular test suite, lint, and production build. Manually inspect the desktop and narrow mobile shell after serving the app.
