# Personal Twitch Drops

Personal Twitch Drops is a small, browser-based dashboard for keeping up with the Twitch Drops campaigns that matter to you. It gathers the active campaigns listed on [twitchdrops.app](https://twitchdrops.app/), puts your favorite games first, and keeps the choices and progress you make in this browser.

It is an Angular single-page application designed to work as a static site, including on GitHub Pages. It is not affiliated with Twitch or twitchdrops.app.

## What it does

- Shows active Twitch Drops campaigns, ordered by their end time, with game art, reward counts, and time remaining.
- Lets you search active games and filter subscription-only Drops and badge rewards.
- Lets you favorite games for a separate, prominent list, or add games to an Ignore List to hide them from the normal view.
- Opens a campaign to show its available rewards, requirements, eligible-stream links, and a Steam, official-site, or Wikidata game link when one is available.
- Lets you mark individual rewards—or an entire campaign—as collected. Campaign completion is celebrated in the interface.
- Remembers favorites, ignored games, filters, collected rewards, and recent change state in browser storage.
- Highlights new and updated campaigns and provides a Changes panel for campaigns that appeared, changed, or ended since the previous day’s snapshot.
- Lets you export Favorites and the Ignore List as a shareable code, then import that code on another browser. Importing replaces both existing lists.

## How to use it

1. Browse the active campaigns or use the search box to find a game.
2. Use the star to add a game to Favorites, or the ignore icon to hide it from the ordinary list.
3. Open a campaign to review rewards and mark ones you have collected.
4. Open **Preferences** to manage saved games or transfer Favorites and the Ignore List with a share code.
5. Check **Changes** after a refresh to see what is new, updated, or no longer active.

## Data and privacy

Campaign data is fetched directly from `twitchdrops.app`; its availability and accuracy depend on that third-party source. The app includes a link to your Twitch Drops inventory, but it does not sign in to Twitch or claim rewards on your behalf.

Your Favorites, Ignore List, filters, reward checkmarks, and change snapshots stay in this browser’s local storage. Clearing site data or using another browser/device starts a separate local set of preferences, unless you export and import the two shareable lists.

## Development

Requirements: a supported Node.js LTS release and npm.

```bash
npm ci
npm start
```

Open the local URL printed by Angular. Useful checks are:

```bash
npm test
npm run lint
npm run build
```

## Project notes

The external source is isolated behind a provider abstraction so it can be changed without rewriting the UI. The project deliberately has no backend and stores no account or preference data remotely.

For contributor guidance and technical details, see [AGENTS.md](AGENTS.md), [the architecture overview](docs/ARCHITECTURE.md), [the code map](docs/CODEMAP.md), and [testing notes](docs/TESTING.md).
