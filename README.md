# AoE II Civilization Win Rate Simulator

Simulate tens of thousands of ranked Age of Empires II matches to see how Elo matchmaking keeps each civilization's win rate hovering around 50%. The project models skill drift, civ strength spread, and different matchmaking rules to show why raw win rates rarely reflect true balance.

## Live Demo & Deep Dive

- **Try it in your browser:** https://forgeablesum.github.io/aoe2-match-simulator/
- **Read the background explanation on Reddit:** https://www.reddit.com/r/aoe2/comments/1or0rtu/civ_win_rates_do_not_accurately_reflect_relative/

## Features

- **Interactive controls** – Adjust player pool size, match volume, Elo K-factor, and visualization speed before running a simulation.
- **Strength spread slider** – Amplify or flatten civilization balance differences to explore how much imbalance Elo can hide.
- **Matchmaking modes** – Compare standard Elo matchmaking against a purely random opponent selector.
- **Live status updates** – Watch match counters, progress bar, and average civ strength update while the simulation runs.
- **Insight summaries** – Surface the top over-performing and under-performing civilizations once enough games have been simulated.

## How the simulation works

- **Player generation** – Thousands of players receive initial Elo ratings, underlying skill values, and drift tendencies.
- **Civilization strength** – Historical win rates are converted to a normalized strength score. Adjusting the spread scales every civ around the 50% baseline.
- **Matchmaking** – Elo mode looks for opponents within ±100 rating, falling back to the closest available player. Random mode ignores ratings entirely.
- **Win chance calculation** – In Elo mode the outcome blends rating expectations, civ matchup strength, skill, and a small noise term. Random mode uses only civ strength.
- **Post-match updates** – Elo ratings update via the classic formula, while civ stats track wins, losses, and deviations from expected performance.

The UI renders the evolving standings table, progress, and a narrative insight panel highlighting significant outliers once enough data accumulates.

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
