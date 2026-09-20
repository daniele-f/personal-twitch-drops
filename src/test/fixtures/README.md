# Provider Test Fixtures

Store small, representative provider response fixtures here, such as `drops-basic.json`, `drops-sub-only.json`, `drops-multiple-campaigns.json`, and `drops-changed.json`.

Provider/parser tests must read fixtures instead of repeatedly calling `twitchdrops.app`. Keep fixtures focused on the behavior under test; do not add fabricated large Twitch datasets unless a test genuinely requires one.
