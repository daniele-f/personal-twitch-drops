# Personal Twitch Drops

An incremental Angular project for tracking active Twitch Drops campaigns that matter to you.

## Status

The repository currently provides the Angular, testing, governance, documentation, and CI foundation. Twitch Drops functionality, the real application UI, and GitHub Pages deployment will follow in later feature branches.

## Development

Requirements: a supported Node.js LTS release and npm.

```bash
npm ci
npm start
```

Open the local URL printed by Angular. Use these checks before review:

```bash
npm test
npm run lint
npm run build
```

Every normal feature or fix belongs on its own branch from `main`; do not merge into `main` without explicit approval. See [AGENTS.md](AGENTS.md), [Product specification](docs/PRODUCT_SPEC.md), [Architecture](docs/ARCHITECTURE.md), and [Testing](docs/TESTING.md).
