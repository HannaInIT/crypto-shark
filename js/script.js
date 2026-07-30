let coinNames = {};
let allCoins = [];
let favorites = loadFavorites();

const debouncedFilterCoinsBySearchQuery = debounce(
  filterCoinsBySearchQuery,
  300,
);

const searchInput = document.getElementById("coinSearch");
const searchForm = document.getElementById("searchForm");

// get the coin icon
function getBaseAsset(symbol) {
  return symbol.replace("USDT", "");
}

async function loadCoinManifest() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/manifest.json",
    );
    const manifest = await response.json();

    // build a lookup
    coinNames = manifest.reduce((map, coin) => {
      map[coin.symbol.toUpperCase()] = coin.name;
      return map;
    }, {});
  } catch (err) {
    console.error("Failed to load coin manifest:", err);
  }
}

// render row
function renderRow(coin, index) {
  const {
    symbol,
    priceChangePercent,
    lastPrice,
    quoteVolume,
    highPrice,
    lowPrice,
  } = coin;

  const isFavorite = favorites.has(symbol);
  const base = getBaseAsset(symbol);
  const name = coinNames[base] || base;
  const iconUrl = `https://essamamdani.github.io/open-crypto-icons/icons/colored/${base.toLowerCase()}.svg`;

  const change = parseFloat(priceChangePercent);
  const isPositive = change >= 0;

  return `
  <tr data-symbol="${symbol}">
  <td>
  <button class="favorite-btn${isFavorite ? " active" : ""}" data-symbol="${symbol}" aria-label="${isFavorite ? "Remove" : "Add"} ${symbol} ${isFavorite ? "from" : "to"} favorites" aria-pressed="${isFavorite}">
    <svg class="favorite-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
	    <path d="M0 0h24v24H0z" fill="none" />
	    <path fill="currentColor" d="${isFavorite ? starFilledPath : starOutlinePath}" />
    </svg>
  </button>
  </td>

  <td class="coin-name">
    <div class="coin-name-inner">
      <img src="${iconUrl}" alt="" width="27" height="27" onerror="this.style.display='none'"/>
      <span class="name">${name}</span>
      <span class="symbol">${base}</span>
    </div>
  </td>
  <td class="price">$${parseFloat(lastPrice).toLocaleString()}</td>
  <td class="change ${isPositive ? "positive" : "negative"}">
    <span class="change-inner">
      <span class="change-icon"> ${isPositive ? "▲" : "▼"}</span>
      <span class="change-value">${Math.abs(change)}%</span>
    </span>
  </td>
  <td>$${parseFloat(highPrice).toLocaleString()}</td>
  <td>$${parseFloat(lowPrice).toLocaleString()}</td>
  <td>$${parseFloat(quoteVolume).toLocaleString()}</td>
  </tr>
  `;
}

// render table
function renderTable(coins) {
  const body = document.getElementById("coin-table-body");
  if (coins.length === 0) {
    body.innerHTML = `
  <tr class="no-results-row">
    <td colspan="7">No coins found.</td>
  </tr>
    `;
    return;
  }

  body.innerHTML = coins.map(renderRow).join("");
}

// load coins
async function loadCoins() {
  const loader = document.getElementById("loader");
  const table = document.getElementById("coin-table");
  const errorMessage = document.getElementById("error-message");

  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!response.ok) throw new Error(`Request failed:  ${response.status}`);

    const data = await response.json();

    allCoins = data.filter((coin) => coin.symbol.endsWith("USDT"));
    renderTable(allCoins);
    table.hidden = false;
  } catch (err) {
    errorMessage.hidden = false;
    console.log(err);
  } finally {
    loader.hidden = true;
  }
}

// search coins
function filterCoinsBySearchQuery(query) {
  const trimmed = query.trim().toUpperCase();

  if (!trimmed) {
    renderTable(allCoins);
    return;
  }

  const filtered = allCoins.filter((coin) => {
    const base = getBaseAsset(coin.symbol);
    const name = (coinNames[base] || "").toUpperCase();
    return coin.symbol.includes(trimmed) || name.includes(trimmed);
  });

  renderTable(filtered);
}

searchInput.addEventListener("input", (e) => {
  debouncedFilterCoinsBySearchQuery(e.target.value);
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  filterCoinsBySearchQuery(searchInput.value);
});

// clear input button
const clearBtn = document.querySelector(".clear-btn");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterCoinsBySearchQuery("");
    searchInput.focus();
  });
}

// add to favorites
const favoritesCoinsKey = "favoritesCoins";
const starOutlinePath =
  "m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zm3.15-.723l-3.63 2.192q-.16.079-.297.064q-.136-.016-.265-.094q-.13-.08-.196-.226t-.012-.319l.966-4.11l-3.195-2.77q-.135-.11-.178-.263t.019-.293t.165-.23q.104-.087.28-.118l4.216-.368l1.644-3.892q.068-.165.196-.238T12 5.364t.288.073t.195.238l1.644 3.892l4.215.368q.177.03.281.119q.104.088.166.229q.061.14.018.293t-.178.263l-3.195 2.77l.966 4.11q.056.171-.011.318t-.197.226q-.128.08-.265.095q-.136.015-.296-.064zm0-3.852";
const starFilledPath =
  "m12 16.102l-3.63 2.192q-.16.079-.297.064q-.136-.016-.265-.094q-.13-.08-.196-.226t-.012-.319l.966-4.11l-3.195-2.77q-.135-.11-.178-.263t.019-.293t.165-.23q.104-.087.28-.118l4.216-.368l1.644-3.892q.068-.165.196-.238T12 5.364t.288.073t.195.238l1.644 3.892l4.215.368q.177.03.281.119q.104.088.166.229q.061.14.018.293t-.178.263l-3.195 2.77l.966 4.11q.056.171-.011.318t-.197.226q-.128.08-.265.095q-.136.015-.296-.064z";

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(favoritesCoinsKey));
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(favoritesCoinsKey, JSON.stringify([...favorites]));
}


function toggleFavorite(symbol) {
  if (favorites.has(symbol)) {
    favorites.delete(symbol);
  } else {
    favorites.add(symbol);
  }
  saveFavorites();
}

document.getElementById("coin-table-body").addEventListener("click", (e) => {
  const btn = e.target.closest(".favorite-btn");
  if (!btn) return;

  const symbol = btn.dataset.symbol;
  toggleFavorite(symbol);

  const isFavorite = favorites.has(symbol);
  btn.classList.toggle("active", isFavorite);
  btn.setAttribute("aria-pressed", isFavorite);
  btn.setAttribute(
    "aria-label",
    `${isFavorite ? "Remove" : "Add"} ${symbol} ${isFavorite ? "from" : "to"} favorites`,
  );

  const starPath = btn.querySelector("svg path:last-child");
  starPath.setAttribute("d", isFavorite ? starFilledPath : starOutlinePath);
});

//debounce
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function init() {
  await loadCoinManifest();
  await loadCoins();
}

init();
