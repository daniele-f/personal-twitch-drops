export const ACTIVE_DROPS_FIXTURE = `
  <main class="games-grid">
    <a class="game-card" href="/game/sea-of-thieves" data-game="sea of thieves" data-drops="8" data-end="2026-09-28T12:00:00.000Z">
      <img src="https://cdn.example.test/sea.png" alt="Sea of Thieves">
      <div class="card-publisher">Rare</div>
      <span class="lv-watch">1h–4h watch</span>
      <div class="card-rewards">
        <div class="reward-row">
          <img class="reward-thumb" src="https://cdn.example.test/coral-crown.png" alt="">
          <span class="reward-name">Coral Crown</span>
        </div>
      </div>
    </a>
    <a class="game-card" href="/game/no-image" data-game="no image game" data-drops="1" data-end="2026-10-01T00:00:00.000Z"></a>
    <a class="game-card" href="/game/no-name" data-drops="2" data-end="2026-10-02T00:00:00.000Z"></a>
    <a class="game-card" href="/game/no-rewards" data-game="no rewards game" data-end="2026-10-03T00:00:00.000Z"></a>
    <a class="game-card" href="/game/no-end" data-game="no end game" data-drops="3"></a>
    <a class="game-card" href="/game/zero-rewards" data-game="zero rewards game" data-drops="0" data-end="2026-10-04T00:00:00.000Z"></a>
  </main>
`;

export const DROP_DETAILS_FIXTURE = `
  <main>
    <div class="drop-card">
      <div class="drop-name">Sorcerer Rogier</div>
      <div class="drop-time">1 sub</div>
    </div>
    <div class="campaign-banner">
      <span class="cb-name">Sorcerer Rogier</span>
      <div class="cb-desc">This badge was earned by subscribing or gifting a sub.</div>
    </div>
  </main>
`;
