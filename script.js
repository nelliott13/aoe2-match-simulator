const CIV_DATA = [
  { name: "Chinese", winRate: 0.597 },
  { name: "Celts", winRate: 0.576 },
  { name: "Mayans", winRate: 0.573 },
  { name: "Malians", winRate: 0.559 },
  { name: "Malay", winRate: 0.558 },
  { name: "Shu", winRate: 0.556 },
  { name: "Khitans", winRate: 0.551 },
  { name: "Ethiopians", winRate: 0.548 },
  { name: "Bengalis", winRate: 0.539 },
  { name: "Romans", winRate: 0.538 },
  { name: "Khmer", winRate: 0.529 },
  { name: "Mongols", winRate: 0.529 },
  { name: "Portuguese", winRate: 0.528 },
  { name: "Vikings", winRate: 0.523 },
  { name: "Koreans", winRate: 0.518 },
  { name: "Slavs", winRate: 0.516 },
  { name: "Goths", winRate: 0.514 },
  { name: "Gurjaras", winRate: 0.513 },
  { name: "Huns", winRate: 0.513 },
  { name: "Wei", winRate: 0.509 },
  { name: "Poles", winRate: 0.508 },
  { name: "Franks", winRate: 0.501 },
  { name: "Bulgarians", winRate: 0.5 },
  { name: "Wu", winRate: 0.499 },
  { name: "Tatars", winRate: 0.496 },
  { name: "Jurchens", winRate: 0.493 },
  { name: "Japanese", winRate: 0.49 },
  { name: "Byzantines", winRate: 0.49 },
  { name: "Burmese", winRate: 0.49 },
  { name: "Bohemians", winRate: 0.488 },
  { name: "Persians", winRate: 0.487 },
  { name: "Vietnamese", winRate: 0.483 },
  { name: "Britons", winRate: 0.477 },
  { name: "Dravidians", winRate: 0.477 },
  { name: "Magyars", winRate: 0.472 },
  { name: "Burgundians", winRate: 0.47 },
  { name: "Italians", winRate: 0.47 },
  { name: "Sicilians", winRate: 0.465 },
  { name: "Lithuanians", winRate: 0.465 },
  { name: "Teutons", winRate: 0.464 },
  { name: "Armenians", winRate: 0.463 },
  { name: "Spanish", winRate: 0.462 },
  { name: "Berbers", winRate: 0.456 },
  { name: "Aztecs", winRate: 0.451 },
  { name: "Saracens", winRate: 0.446 },
  { name: "Cumans", winRate: 0.443 },
  { name: "Georgians", winRate: 0.438 },
  { name: "Incas", winRate: 0.428 },
  { name: "Hindustanis", winRate: 0.426 }
];

const CIV_NAMES = CIV_DATA.map((civ) => civ.name);

const BASE_WIN_RATE = 0.5;
const BASE_STRENGTH = 0.5;
const PEAK_WIN_RATE = 0.597;
const PEAK_STRENGTH = 0.78;
const STRENGTH_SLOPE = (PEAK_STRENGTH - BASE_STRENGTH) / (PEAK_WIN_RATE - BASE_WIN_RATE);
const STRENGTH_INTERCEPT = BASE_STRENGTH - STRENGTH_SLOPE * BASE_WIN_RATE;

const baseCivs = CIV_DATA.map(({ name, winRate }) => {
  const baseStrength = convertWinRateToStrength(winRate);
  return {
    name,
    baseStrength,
    strength: baseStrength
  };
});

function convertWinRateToStrength(winRate) {
  const normalizedRate = clamp(winRate, 0, 1);
  const strength = STRENGTH_SLOPE * normalizedRate + STRENGTH_INTERCEPT;
  return clamp(strength, 0, 1);
}

const civs = baseCivs;

let expectedRandomWinRates = new Map();
const DEFAULT_STRENGTH_SPREAD = 1.4;
let strengthSpread = DEFAULT_STRENGTH_SPREAD;

const tableBody = document.querySelector("#civTable tbody");
const simulateBtn = document.querySelector("#simulateBtn");
const matchTicker = document.querySelector("#matchTicker");
const playerTicker = document.querySelector("#playerTicker");
const avgStrengthEl = document.querySelector("#avgStrength");
const progressBar = document.querySelector("#progressBar");
const statusLog = document.querySelector("#statusLog");
const speedSelect = document.querySelector("#speed");
const matchmakingSelect = document.querySelector("#matchmakingMode");
const insightsContent = document.querySelector("#insightsContent");
const strengthSpreadInput = document.querySelector("#strengthSpread");
const strengthSpreadValue = document.querySelector("#strengthSpreadValue");
const conclusionsPanel = document.querySelector("#conclusionsPanel");

let currentState = {
  running: false,
  players: [],
  civStats: new Map(),
  matches: 0,
  totalMatches: 0,
  matchmakingMode: "elo"
};

initialize();

simulateBtn.addEventListener("click", () => {
  if (currentState.running) {
    return;
  }
  const playerCount = Number(document.querySelector("#playerCount").value) || 3000;
  const matchCount = Number(document.querySelector("#matchCount").value) || 25000;
  const kFactor = Number(document.querySelector("#kFactor").value) || 24;
  const matchmakingMode = (matchmakingSelect?.value ?? "elo").toLowerCase();

  runSimulation({ playerCount, matchCount, kFactor, matchmakingMode }).catch((error) => {
    console.error(error);
    pushStatus(`Simulation failed: ${error.message}`);
    setRunning(false);
  });
});

function initialize() {
  currentState.civStats = initializeCivStats();

  const initialSpread = strengthSpreadInput
    ? Number(strengthSpreadInput.value) || DEFAULT_STRENGTH_SPREAD
    : DEFAULT_STRENGTH_SPREAD;
  updateStrengthSpreadValue(initialSpread);
  updateCivStrengths(initialSpread);
  updateTable();

  if (strengthSpreadInput) {
    strengthSpreadInput.addEventListener("input", (event) => {
      const scale = Number(event.target.value) || DEFAULT_STRENGTH_SPREAD;
      updateStrengthSpreadValue(scale);
      if (currentState.running) {
        return;
      }
      updateCivStrengths(scale);
      currentState.players = [];
      currentState.civStats = initializeCivStats();
      currentState.matches = 0;
      currentState.totalMatches = 0;
      if (matchTicker) {
        matchTicker.textContent = "0";
      }
      if (playerTicker) {
        playerTicker.textContent = "0";
      }
      if (progressBar) {
        progressBar.style.width = "0%";
      }
      if (conclusionsPanel) {
        conclusionsPanel.classList.remove("visible");
      }
      setInsightsMessage("Strength distribution updated. Run a simulation to generate fresh results.");
      pushStatus("Civ strength spread adjusted — awaiting simulation.");
      updateTable();
    });
  }

  setInsightsMessage("Run a simulation to uncover which civilizations buck the balance curve.");
  pushStatus("Ready. Configure parameters and hit run.");
}

function updateCivStrengths(scale) {
  const effectiveScale = Number.isFinite(scale) ? scale : DEFAULT_STRENGTH_SPREAD;
  strengthSpread = effectiveScale;
  civs.forEach((civ) => {
    const adjusted = 0.5 + (civ.baseStrength - 0.5) * strengthSpread;
    civ.strength = Number(adjusted.toFixed(3));
  });
  expectedRandomWinRates = computeExpectedRandomWinRates(civs);
  renderCivTable();
  updateAverageStrength();
}

function renderCivTable() {
  if (!tableBody) return;
  const fragment = document.createDocumentFragment();
  civs
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .forEach((civ) => {
      const expectedRate = expectedRandomWinRates.get(civ.name) ?? civ.strength;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="civ-name">${civ.name}</td>
        <td>
          <div class="strength-bar" aria-label="Base strength ${civ.strength}">
            <span style="width: ${(civ.strength * 100).toFixed(1)}%"></span>
          </div>
          <small>${civ.strength.toFixed(3)}</small>
        </td>
        <td class="expected-rate" data-civ="${civ.name}">${(expectedRate * 100).toFixed(1)}%</td>
        <td class="win-rate" data-civ="${civ.name}">--</td>
        <td class="difference" data-civ="${civ.name}">--</td>
        <td class="match-count" data-civ="${civ.name}">0</td>
      `;
      fragment.appendChild(row);
    });
  tableBody.innerHTML = "";
  tableBody.appendChild(fragment);
}

function updateStrengthSpreadValue(scale) {
  if (!strengthSpreadValue) return;
  strengthSpreadValue.textContent = `${scale.toFixed(2)}x`;
}

function updateAverageStrength() {
  if (!avgStrengthEl) return;
  const avgStrength = civs.reduce((sum, civ) => sum + civ.strength, 0) / civs.length;
  avgStrengthEl.textContent = avgStrength.toFixed(3);
}

async function runSimulation({ playerCount, matchCount, kFactor, matchmakingMode }) {
  setRunning(true);
  if (conclusionsPanel) {
    conclusionsPanel.classList.remove("visible");
  }
  pushStatus(`Generating ${playerCount} players and scheduling ${matchCount.toLocaleString()} matches.`);
  setInsightsMessage("Crunching numbers &mdash; insights will refresh when the simulation completes.");

  currentState.players = createPlayers(playerCount);
  currentState.civStats = initializeCivStats();
  currentState.matches = 0;
  currentState.totalMatches = matchCount;
  currentState.matchmakingMode = matchmakingMode === "random" ? "random" : "elo";

  playerTicker.textContent = playerCount.toLocaleString();
  matchTicker.textContent = "0";
  progressBar.style.width = "0%";
  updateTable();

  const speed = speedSelect.value;
  const delayMap = {
    fast: 0,
    medium: 16,
    slow: 32
  };
  const batchMap = {
    fast: 80,
    medium: 20,
    slow: 10
  };
  const delay = delayMap[speed] ?? 14;
  const batchSize = batchMap[speed] ?? 18;

  for (let i = 0; i < matchCount; i++) {
    simulateMatch(kFactor, currentState.matchmakingMode);
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
  renderInsights();
  if (conclusionsPanel) {
    conclusionsPanel.classList.toggle("visible", currentState.matchmakingMode === "elo");
  }
  setRunning(false);
}

function simulateMatch(kFactor, matchmakingMode) {
  const { players, civStats } = currentState;
  const playerAIndex = randomInt(players.length);
  const playerBIndex = getOpponentIndex(playerAIndex, matchmakingMode, 100);

  const playerA = players[playerAIndex];
  const playerB = players[playerBIndex];
  const civA = civs[randomInt(civs.length)];
  const civB = civs[randomInt(civs.length)];

  const civExpectation = civA.strength / (civA.strength + civB.strength);

  let winChanceA;
  if (matchmakingMode === "random") {
    winChanceA = clamp(civExpectation, 0.02, 0.98);
  } else {
    const ratingExpectation = 1 / (1 + Math.pow(10, (playerB.rating - playerA.rating) / 400));
    const skillExpectation = playerA.skill / (playerA.skill + playerB.skill);
    winChanceA =
      ratingExpectation * 0.55 +
      civExpectation * 0.3 +
      skillExpectation * 0.15 +
      randomNormal(0, 0.012);
    winChanceA = clamp(winChanceA, 0.02, 0.98);
  }

  const aWins = Math.random() < winChanceA ? 1 : 0;
  const bWins = 1 - aWins;

  updateCivStats(civStats, civA.name, aWins === 1);
  updateCivStats(civStats, civB.name, bWins === 1);

  if (matchmakingMode !== "random") {
    applyElo(playerA, playerB, aWins, kFactor);
    updateSkill(playerA);
    updateSkill(playerB);
  }
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
    const expectedCell = tableBody.querySelector(`.expected-rate[data-civ="${civ.name}"]`);
    const winRateCell = tableBody.querySelector(`.win-rate[data-civ="${civ.name}"]`);
    const diffCell = tableBody.querySelector(`.difference[data-civ="${civ.name}"]`);
    const matchCell = tableBody.querySelector(`.match-count[data-civ="${civ.name}"]`);
    const stats = civStats.get(civ.name);
    const expectedRate = expectedRandomWinRates.get(civ.name) ?? civ.strength;

    if (expectedCell) {
      expectedCell.textContent = `${(expectedRate * 100).toFixed(1)}%`;
    }

    if (!stats || !winRateCell || !matchCell || !diffCell) return;
    if (stats.games === 0) {
      winRateCell.textContent = "--";
      winRateCell.classList.remove("positive", "negative");
      diffCell.textContent = "--";
      diffCell.classList.remove("positive", "negative");
      matchCell.textContent = "0";
    } else {
      const rate = stats.winRate;
      winRateCell.textContent = `${(rate * 100).toFixed(1)}%`;
      winRateCell.classList.toggle("positive", rate > 0.5);
      winRateCell.classList.toggle("negative", rate < 0.5);
      const diff = rate - expectedRate;
      const diffPct = (diff * 100).toFixed(1);
      const formattedDiff = diff > 0 ? `+${diffPct}%` : `${diffPct}%`;
      diffCell.textContent = formattedDiff;
      diffCell.classList.toggle("positive", diff > 0);
      diffCell.classList.toggle("negative", diff < 0);
      if (diff === 0) {
        diffCell.classList.remove("positive", "negative");
      }
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

function setInsightsMessage(message) {
  if (!insightsContent) return;
  insightsContent.innerHTML = `<p>${message}</p>`;
}

function renderInsights() {
  if (!insightsContent) return;
  const { civStats, totalMatches } = currentState;
  const results = civs
    .map((civ) => {
      const stats = civStats.get(civ.name);
      const games = stats?.games ?? 0;
      const winRate = games > 0 ? stats.wins / games : null;
      const expectedRandom = expectedRandomWinRates.get(civ.name) ?? civ.strength;
      return {
        name: civ.name,
        strength: civ.strength,
        games,
        winRate,
        expectedRandom,
        diff: winRate !== null ? winRate - civ.strength : null
      };
    })
    .filter((entry) => entry.winRate !== null && entry.games >= Math.max(30, Math.round(totalMatches * 0.003)));

  if (results.length === 0) {
    setInsightsMessage("Not enough data yet. Try running a longer simulation to surface meaningful outliers.");
    return;
  }

  const overperformers = results
    .filter((entry) => entry.diff > 0.02)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);
  const underperformers = results
    .filter((entry) => entry.diff < -0.02)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

  const buildItem = (entry, type) => {
    const ratePct = (entry.winRate * 100).toFixed(1);
    const strengthPct = (entry.strength * 100).toFixed(1);
    const expectedPct = (entry.expectedRandom * 100).toFixed(1);
    const diffPct = (entry.diff * 100).toFixed(1);
    const diffLabel = `${diffPct > 0 ? "+" : ""}${diffPct}`;
    const className = type === "over" ? "insight-highlight" : "insight-warning";
    const gamesPlayed = entry.games.toLocaleString();
    return `<li><span class="${className}">${entry.name}</span> posted a ${ratePct}% win rate across ${gamesPlayed} games versus a ${strengthPct}% strength baseline (${diffLabel} pts) and would expect ${expectedPct}% in equal-skill random matchups.</li>`;
  };

  const sections = [];
  sections.push(`<p>Reviewed ${totalMatches.toLocaleString()} simulated matches to gauge balance drift.</p>`);

  if (overperformers.length > 0) {
    sections.push(
      `<div><strong>Overperforming civs</strong><ul class="insight-list">${overperformers
        .map((entry) => buildItem(entry, "over"))
        .join("")}</ul></div>`
    );
  }

  if (underperformers.length > 0) {
    sections.push(
      `<div><strong>Underperforming civs</strong><ul class="insight-list">${underperformers
        .map((entry) => buildItem(entry, "under"))
        .join("")}</ul></div>`
    );
  }

  if (sections.length === 1) {
    sections.push(
      `<p>The remaining civilizations tracked closely with their theoretical strength &mdash; evidence the Elo system kept the field in check.</p>`
    );
  }

  insightsContent.innerHTML = sections.join("");
}

function setRunning(value) {
  currentState.running = value;
  simulateBtn.disabled = value;
  simulateBtn.textContent = value ? "Simulating..." : "Run Simulation";
  if (strengthSpreadInput) {
    strengthSpreadInput.disabled = value;
  }
}

function computeExpectedRandomWinRates(civList) {
  const map = new Map();
  const total = civList.length;
  civList.forEach((civ) => {
    let sum = 0;
    civList.forEach((opponent) => {
      if (opponent === civ) {
        sum += 0.5;
      } else {
        sum += civ.strength / (civ.strength + opponent.strength);
      }
    });
    map.set(civ.name, sum / total);
  });
  return map;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function getOpponentIndex(playerIndex, matchmakingMode, maxDifference) {
  if (matchmakingMode === "random") {
    const { players } = currentState;
    if (players.length <= 1) {
      return playerIndex;
    }
    let opponentIndex = playerIndex;
    while (opponentIndex === playerIndex) {
      opponentIndex = randomInt(players.length);
    }
    return opponentIndex;
  }

  return selectOpponentIndex(playerIndex, maxDifference);
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
