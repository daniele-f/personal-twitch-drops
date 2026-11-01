# Account Preferences Design

## Intent

Keep the account popup brief while giving signed-in users a clear, safe place to manage authentication methods.

## Account popup

For a signed-in user, show either **Twitch linked** or **Link to Twitch**, retain **Sign out**, and add **Manage account** linking to `/preferences#account`. Do not show the user's email in the popup.

## Preferences account section

Place an `id="account"` Account section immediately after Theme color and before the favorites and ignore lists. Show the signed-in email when one exists.

Read Supabase identities to determine whether Twitch and email/password identities are connected:

- Twitch linked: show status and a confirmed unlink action.
- Twitch not linked: show the link action.
- Email identity: provide password change.
- No email identity: guide the user through adding an email, receiving its confirmation, and setting a password only after verification.

The account section is not shown to guests. Sign out remains popup-only.

## Safety

Do not offer Twitch unlink unless another identity remains. Surface operation errors next to their action. Use existing Supabase Auth APIs only; no backend or schema change.
