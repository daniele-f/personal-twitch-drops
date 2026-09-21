# Button Interactions Design

## Intent

Give every app button and button-styled route link a consistent hover, pressed,
focus, and disabled treatment without changing its semantics or behavior.

## Design

Create a standalone Angular attribute directive, `appButton`, that adds a base
class and a variant class to a native `button` or anchor. It accepts `default`,
`primary`, `neutral`, and `icon` variants. SCSS owns the visual states: hover
lightens the control, active darkens it and translates it down one pixel,
focus-visible keeps a clear purple outline, and disabled controls neither move
nor advertise pointer interaction.

The header Preferences anchor uses the default variant while retaining its
normal router link semantics. Refresh and Keep it in Favorites use primary.
Hide it, Remove from blacklist, disclosure, and ordinary controls use neutral
or default as visually appropriate. Star and blacklist glyph controls use the
icon variant. No click handling, ARIA role, or navigation behavior moves into
the directive.

## Testing

Unit tests verify the base and selected variant classes on native buttons and
anchors. Existing interaction tests continue to verify real clicks and routing.
Visual verification checks hover, mouse press, keyboard focus, disabled state,
and 320px layout.
