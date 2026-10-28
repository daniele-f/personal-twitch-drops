# Twitch authentication design

## Intent

Let people create and access tracker accounts with either email/password or
Twitch. An account that began with email/password can later add Twitch as
another sign-in method.

## Goals

- Keep the existing email/password sign-up, sign-in, confirmation, and
  password-recovery flow.
- Add a Twitch OAuth button to sign-in and account-creation views.
- Let an authenticated email/password user link their Twitch identity from
  the account dialog, without creating a second tracker account.
- Continue to use the Supabase user UUID as the sole tracker-data identity.

## Non-goals

- Importing Twitch profile, stream, or inventory data.
- Requiring Twitch for email/password accounts.
- Changing the tracker database schema or its user_id ownership model.

## Approach

Use Supabase Auth's Twitch OAuth provider. The app starts OAuth with a return
URL at the current application origin; Supabase owns the provider secret and
returns a normal browser session. The same provider flow is used to link an
identity while a user is already authenticated. The account dialog presents a
link action only when an account is signed in.

The Supabase project must be configured outside the source repository with a
Twitch client ID, client secret, and permitted redirect URL. Provider setup is
required before the feature can succeed in a deployed environment.

## Tests

- Auth-service tests verify provider sign-in and identity-link requests use
  `twitch` and the current app origin.
- Dialog tests verify both guest entry modes expose the Twitch option and an
  authenticated user can initiate linking.
