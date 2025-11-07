const CIV_NAMES = [
  "Aztecs",
  "Berbers",
  "Bengalis",
  "Bohemians",
  "Britons",
  "Bulgarians",
  "Burgundians",
  "Burmese",
  "Byzantines",
  "Celts",
  "Chinese",
  "Cumans",
  "Dravidians",
  "Ethiopians",
  "Franks",
  "Georgians",
  "Goths",
  "Gurjaras",
  "Hindustanis",
  "Huns",
  "Incas",
  "Italians",
  "Japanese",
  "Khmer",
  "Koreans",
  "Lithuanians",
  "Magyars",
  "Malay",
  "Malians",
  "Mayans",
  "Mongols",
  "Persians",
  "Poles",
  "Portuguese",
  "Romans",
  "Saracens",
  "Sicilians",
  "Slavs",
  "Spanish",
  "Tatars",
  "Teutons",
  "Turks",
  "Vietnamese",
  "Vikings"
];

const civs = CIV_NAMES.map((name, index) => {
  const strength = clamp(
    0.52 + 0.18 * Math.sin(index * 1.23) + 0.09 * Math.cos(index * 0.79),
    0.25,
    0.82
  );
  return {
    name,
    strength: Number(strength.toFixed(3))
  };
});

const tableBody = document.querySelector("#civTable tbody");
const simulateBtn = document.querySelector("#simulateBtn");
const matchTicker = document.querySelector("#matchTicker");
const playerTicker = document.querySelector("#playerTicker");
const avgStrengthEl = document.querySelector("#avgStrength");
const progressBar = document.querySelector("#progressBar");
const statusLog = document.querySelector("#statusLog");
const speedSelect = document.querySelector("#speed");

let currentState = {
  running: false,
  players: [],
  civStats: new Map(),
  matches: 0,
  totalMatches: 0
};

initialize();

simulateBtn.addEventListener("click", () => {
  if (currentState.running) {
    return;
  }
  const playerCount = Number(document.querySelector("#playerCount").value) || 1000;
  const matchCount = Number(document.querySelector("#matchCount").value) || 5000;
  const kFactor = Number(document.querySelector("#kFactor").value) || 24;

  runSimulation({ playerCount, matchCount, kFactor }).catch((error) => {
    console.error(error);
    pushStatus(`Simulation failed: ${error.message}`);
    setRunning(false);
  });
});

function initialize() {
  const avgStrength =
    civs.reduce((sum, civ) => sum + civ.strength, 0) / civs.length;
  avgStrengthEl.textContent = avgStrength.toFixed(3);
  const fragment = document.createDocumentFragment();
  civs
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .forEach((civ) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="civ-name">${civ.name}</td>
        <td>
          <div class="strength-bar" aria-label="Base strength ${civ.strength}">
            <span style="width: ${(civ.strength * 100).toFixed(1)}%"></span>
          </div>
          <small>${civ.strength.toFixed(3)}</small>
        </td>
        <td class="win-rate" data-civ="${civ.name}">--</td>
        <td class="match-count" data-civ="${civ.name}">0</td>
      `;
      fragment.appendChild(row);
    });
  tableBody.innerHTML = "";
  tableBody.appendChild(fragment);
  pushStatus("Ready. Configure parameters and hit run.");
}

async function runSimulation({ playerCount, matchCount, kFactor }) {
  setRunning(true);
  pushStatus(`Generating ${playerCount} players and scheduling ${matchCount.toLocaleString()} matches.`);

  currentState.players = createPlayers(playerCount);
  currentState.civStats = initializeCivStats();
  currentState.matches = 0;
  currentState.totalMatches = matchCount;

  playerTicker.textContent = playerCount.toLocaleString();
  matchTicker.textContent = "0";
  progressBar.style.width = "0%";
  updateTable();

  const speed = speedSelect.value;
  const delayMap = {
    fast: 6,
    medium: 16,
    slow: 32
  };
  const batchMap = {
    fast: 30,
    medium: 20,
    slow: 10
  };
  const delay = delayMap[speed] ?? 14;
  const batchSize = batchMap[speed] ?? 18;

  for (let i = 0; i < matchCount; i++) {
    simulateMatch(kFactor);
    currentState.matches++;

    if (i % batchSize === 0) {
      updateTable();
      updateProgress();
      await wait(delay);
    }
  }

  updateTable();
  updateProgress(true);
  pushStatus("Simulation complete. Balance restored through ELO!");
  setRunning(false);
}

function simulateMatch(kFactor) {
  const { players, civStats } = currentState;
  const playerAIndex = randomInt(players.length);
  const playerBIndex = selectOpponentIndex(playerAIndex, 100);

  const playerA = players[playerAIndex];
  const playerB = players[playerBIndex];
  const civA = civs[randomInt(civs.length)];
  const civB = civs[randomInt(civs.length)];

  const ratingExpectation = 1 / (1 + Math.pow(10, (playerB.rating - playerA.rating) / 400));
  const civExpectation = civA.strength / (civA.strength + civB.strength);
  const skillExpectation = playerA.skill / (playerA.skill + playerB.skill);

  let winChanceA =
    ratingExpectation * 0.55 +
    civExpectation * 0.3 +
    skillExpectation * 0.15 +
    randomNormal(0, 0.012);
  winChanceA = clamp(winChanceA, 0.02, 0.98);

  const aWins = Math.random() < winChanceA ? 1 : 0;
  const bWins = 1 - aWins;

  updateCivStats(civStats, civA.name, aWins === 1);
  updateCivStats(civStats, civB.name, bWins === 1);

  applyElo(playerA, playerB, aWins, kFactor);
  updateSkill(playerA);
  updateSkill(playerB);
}

function createPlayers(count) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const skill = clamp(0.5 + randomNormal(0, 0.12), 0.2, 0.88);
    const skillTrend = clamp(randomNormal(0, 0.01), -0.02, 0.02);
    players.push({
      id: i,
      rating: 1000 + randomNormal(0, 90),
      skill,
      skillTrend,
      volatility: clamp(Math.abs(randomNormal(0.004, 0.002)), 0.001, 0.012)
    });
  }
  return players;
}

function initializeCivStats() {
  const map = new Map();
  civs.forEach((civ) => {
    map.set(civ.name, {
      wins: 0,
      games: 0,
      winRate: 0
    });
  });
  return map;
}

function updateCivStats(map, civName, won) {
  const entry = map.get(civName);
  if (!entry) return;
  entry.games += 1;
  if (won) {
    entry.wins += 1;
  }
  entry.winRate = entry.games > 0 ? entry.wins / entry.games : 0;
}

function applyElo(playerA, playerB, aWins, kFactor) {
  const expectedA = 1 / (1 + Math.pow(10, (playerB.rating - playerA.rating) / 400));
  const expectedB = 1 - expectedA;
  const resultA = aWins;
  const resultB = 1 - aWins;

  playerA.rating += kFactor * (resultA - expectedA);
  playerB.rating += kFactor * (resultB - expectedB);
}

function updateSkill(player) {
  const drift = player.skillTrend + randomNormal(0, player.volatility);
  player.skill = clamp(player.skill + drift, 0.12, 0.95);
}

function updateTable() {
  const { civStats } = currentState;
  civs.forEach((civ) => {
    const winRateCell = tableBody.querySelector(`.win-rate[data-civ="${civ.name}"]`);
    const matchCell = tableBody.querySelector(`.match-count[data-civ="${civ.name}"]`);
    const stats = civStats.get(civ.name);
    if (!stats || !winRateCell || !matchCell) return;
    if (stats.games === 0) {
      winRateCell.textContent = "--";
      winRateCell.classList.remove("positive", "negative");
      matchCell.textContent = "0";
    } else {
      const rate = stats.winRate;
      winRateCell.textContent = `${(rate * 100).toFixed(1)}%`;
      winRateCell.classList.toggle("positive", rate > civ.strength);
      winRateCell.classList.toggle("negative", rate < civ.strength);
      matchCell.textContent = stats.games.toLocaleString();
    }
  });
}

function updateProgress(final = false) {
  const { matches, totalMatches } = currentState;
  const ratio = totalMatches === 0 ? 0 : matches / totalMatches;
  progressBar.style.width = `${Math.min(ratio * 100, 100).toFixed(1)}%`;
  matchTicker.textContent = matches.toLocaleString();
  if (final) {
    pushStatus(`Processed ${matches.toLocaleString()} matches.`);
  } else if (matches > 0 && matches % Math.max(200, Math.round(totalMatches / 10)) === 0) {
    const percent = (ratio * 100).toFixed(0);
    pushStatus(`${percent}% complete — civ win rates are converging.`);
  }
}

function pushStatus(message) {
  statusLog.textContent = message;
}

function setRunning(value) {
  currentState.running = value;
  simulateBtn.disabled = value;
  simulateBtn.textContent = value ? "Simulating..." : "Run Simulation";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function selectOpponentIndex(playerIndex, maxDifference) {
  const { players } = currentState;
  const anchor = players[playerIndex];
  if (!anchor) return playerIndex;

  // Build a pool of opponents whose rating is within the allowed window.
  const closeMatches = [];
  let fallbackIndex = -1;
  let fallbackDiff = Infinity;

  for (let i = 0; i < players.length; i++) {
    if (i === playerIndex) continue;
    const diff = Math.abs(players[i].rating - anchor.rating);
    if (diff <= maxDifference) {
      closeMatches.push(i);
    }
    if (diff < fallbackDiff) {
      fallbackDiff = diff;
      fallbackIndex = i;
    }
  }

  if (closeMatches.length > 0) {
    return closeMatches[randomInt(closeMatches.length)];
  }

  if (fallbackIndex !== -1) {
    return fallbackIndex;
  }

  if (players.length <= 1) {
    return playerIndex;
  }

  return playerIndex === 0 ? 1 : 0;
}

function randomNormal(mean = 0, stdDev = 1) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const standard = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return standard * stdDev + mean;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
