let coinNames = {};
let allCoins = [];
let favorites = loadFavorites();
let isShowingAllCoins = true;
let currentDisplayCoins = [];
let visibleCount = 0;
let isLoadingMore = false;
let currentDepthSymbol = null;
const coinTableBody = document.getElementById("coin-table-body");
const searchHint = document.getElementById("searchHint");
const favoritesTableBody = document.getElementById("favorites-coin-table-body");
const favoritesNavLink = document.getElementById("nav-favorites");
const favoritesTable = document.getElementById("favorites-table");
const noFavoritesMessage = document.getElementById("no-favorites-message");
const loader = document.getElementById("loader");
const table = document.getElementById("coin-table");
const errorMessage = document.getElementById("error-message");
const searchInput = document.getElementById("coinSearch");
const searchForm = document.getElementById("searchForm");
const depthModal = document.getElementById("depthModal");
const depthBody = document.getElementById("depthBody");
const depthTitle = document.getElementById("depthTitle");
const depthLimitSelect = document.getElementById("depthLimit");
const loadMoreTrigger = document.getElementById("loadMoreTrigger");
const scrollSpinner = document.getElementById("scrollSpinner");
const pageSize = 50;
const scrollRenderDelay = 250;

const debouncedFilterCoinsBySearchQuery = debounce(
  filterCoinsBySearchQuery,
  300,
);

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

function renderRow(coin, index) {
  const { symbol, lastPrice, quoteVolume, highPrice, lowPrice } = coin;
  const isFavorite = favorites.has(symbol);
  const base = getBaseAsset(symbol);
  const name = coinNames[base] || base;
  const iconUrl = `https://essamamdani.github.io/open-crypto-icons/icons/colored/${base.toLowerCase()}.svg`;
  const { change, isPositive } = formatChangeData(coin);

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
  <td class="price">${formatMoney(lastPrice)}</td>
  <td class="change ${isPositive ? "positive" : "negative"}">
    <span class="change-inner">
      <span class="change-icon"> ${isPositive ? "▲" : "▼"}</span>
      <span class="change-value">${Math.abs(change)}%</span>
    </span>
  </td>
  <td>${formatMoney(highPrice)}</td>
  <td>${formatMoney(lowPrice)}</td>
  <td>${formatMoney(quoteVolume)}</td>
  </tr>
  `;
}

function updateRowValues(coin) {
  [...document.querySelectorAll(`tr[data-symbol="${coin.symbol}"]`)].map(
    (row) => updateSingleRow(row, coin),
  );
}

function updateSingleRow(row, coin) {
  const { change, isPositive } = formatChangeData(coin);

  row.querySelector(".price").textContent = formatMoney(coin.lastPrice);

  const changeCell = row.querySelector(".change");
  changeCell.classList.toggle("positive", isPositive);
  changeCell.classList.toggle("negative", !isPositive);
  changeCell.querySelector(".change-icon").textContent =
    ` ${isPositive ? "▲" : "▼"}`;
  changeCell.querySelector(".change-value").textContent =
    `${Math.abs(change)}%`;

  const cells = row.querySelectorAll("td");
  cells[4].textContent = formatMoney(coin.highPrice);
  cells[5].textContent = formatMoney(coin.lowPrice);
  cells[6].textContent = formatMoney(coin.quoteVolume);
}
// render table
function renderTable(coins) {
  currentDisplayCoins = coins;
  visibleCount = Math.min(pageSize, coins.length);
  renderVisibleRows();
}

async function fetchDepth(symbol, limit) {
  const response = await fetch(
    `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`,
  );
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function renderDepthLoading() {
  depthBody.innerHTML = `
  <div class="depth-state">
    <div class="spinner-text"></div>
    Loading order book...
  </div>
  `;
}

function renderDepthError() {
  depthBody.innerHTML = `
  <p class="depth-state">Failed to load order book. Please try again.</p>
  `;
}

function parseDepthSide(entries) {
  return entries.map(([price, qty]) => ({
    price: parseFloat(price),
    qty: parseFloat(qty),
  }));
}

function renderDepthList(entries, side) {
  return entries
    .map(
      (entry) => `
  <tr>
    <td class="${side}-price">${entry.price.toLocaleString()}</td>
    <td class="depth-qty">${entry.qty}</td>
  </tr>
  `,
    )
    .join("");
}

// infinite scroll
function renderVisibleRows() {
  if (currentDisplayCoins.length === 0) {
    coinTableBody.innerHTML = `
    <tr class="no-results-row">
    <td colspan="7">No coins found.</td>
    </tr>
    `;
    return;
  }

  const visibleCoins = currentDisplayCoins.slice(0, visibleCount);
  coinTableBody.innerHTML = visibleCoins.map(renderRow).join("");
}

function loadMoreRows() {
  if (isLoadingMore || visibleCount >= currentDisplayCoins.length) return;

  isLoadingMore = true;
  scrollSpinner.hidden = false;

  setTimeout(() => {
    visibleCount = Math.min(
      visibleCount + pageSize,
      currentDisplayCoins.length,
    );
    renderVisibleRows();
    scrollSpinner.hidden = true;
    isLoadingMore = false;
    connectTickerStream(
      currentDisplayCoins.slice(0, visibleCount).map((coin) => coin.symbol),
    );
  }, scrollRenderDelay);
}

const scrollObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadMoreRows();
  }
});

scrollObserver.observe(loadMoreTrigger);

// open modal window
let currentDepthData = null;

async function openDepthModal(symbol) {
  currentDepthSymbol = symbol;

  depthTitle.textContent = `Order book - ${symbol}`;
  depthModal.classList.add("active");
  renderDepthLoading();
  updateLiveIndicator();

  try {
    const data = await fetchDepth(symbol, 100);
    currentDepthData = {
      bids: parseDepthSide(data.bids),
      asks: parseDepthSide(data.asks),
    };
    renderVisibleDepth();
    reconcileDepthStream();
  } catch (err) {
    renderDepthError();
    console.error(err);
  }
}

function renderVisibleDepth() {
  const limit = Number(depthLimitSelect.value);
  const bids = currentDepthData.bids.slice(0, limit);
  const asks = currentDepthData.asks.slice(0, limit);

  depthBody.innerHTML = `
  <div class="book-columns">
    <table class="data-table depth-table">
      <thead><tr><th>Bid price</th><th>Qty</th></tr></thead>
      <tbody>${renderDepthList(bids, "bid")}</tbody>
    </table>
    <table class="data-table depth-table">
      <thead><tr><th>Ask price</th><th>Qty</th></tr></thead>
      <tbody>${renderDepthList(asks, "ask")}</tbody>
    </table>
  </div>
  `;
}

depthLimitSelect.addEventListener("change", () => {
  if (currentDepthData) {
    renderVisibleDepth();
    updateLiveIndicator();
    reconcileDepthStream();
  }
});

// close modal window
function closeDepthModal() {
  disconnectDepthStream();
  depthModal.classList.remove("active");
  depthLimitSelect.value = "10";
  currentDepthData = null;
  currentDepthSymbol = null;
}

document.addEventListener("click", (e) => {
  const openTrigger = e.target.closest('[data-action="open-depth"]');
  if (openTrigger) {
    openDepthModal(openTrigger.dataset.symbol);
    return;
  }

  const closeTrigger = e.target.closest('[data-action="close-depth"]');
  if (closeTrigger || e.target === depthModal) {
    closeDepthModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && depthModal.classList.contains("active")) {
    closeDepthModal();
  }
});

const liveDepthLimits = new Set([10, 20]);
const depthLiveIndicator = document.getElementById("depthLiveIndicator");

function updateLiveIndicator() {
  const limit = Number(depthLimitSelect.value);
  const isLive = liveDepthLimits.has(limit);

  depthLiveIndicator.textContent = isLive ? "Live" : "Static snapshot";
  depthLiveIndicator.classList.toggle("is-live", isLive);
}

// load coins + live data update (with websockets)
let coinsBySymbol = new Map();

async function loadCoins() {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const data = await response.json();
    allCoins = data.filter((coin) => coin.symbol.endsWith("USDT"));
    coinsBySymbol = new Map(allCoins.map((coin) => [coin.symbol, coin]));

    renderTable(allCoins);
    table.hidden = false;
    connectTickerStream(
      currentDisplayCoins.slice(0, visibleCount).map((coin) => coin.symbol),
    );
  } catch (err) {
    errorMessage.hidden = false;
    console.log(err);
  } finally {
    loader.hidden = true;
  }
}

function formatChangeData(coin) {
  const change = parseFloat(coin.priceChangePercent);
  const isPositive = change >= 0;
  return { change, isPositive };
}

function formatMoney(value) {
  return `$${parseFloat(value).toLocaleString()}`;
}

// search coins
function filterCoinsBySearchQuery(query) {
  const trimmed = query.trim().toUpperCase();
  if (trimmed.length > 0 && trimmed.length < 3) {
    searchHint.hidden = false;

    if (!isShowingAllCoins) {
      renderTable(allCoins);
      isShowingAllCoins = true;
    }
    return;
  }

  searchHint.hidden = true;

  if (!trimmed) {
    if (!isShowingAllCoins) {
      renderTable(allCoins);
      isShowingAllCoins = true;
    }

    return;
  }

  const filtered = allCoins.filter((coin) => {
    const base = getBaseAsset(coin.symbol);
    const name = (coinNames[base] || "").toUpperCase();
    return coin.symbol.includes(trimmed) || name.includes(trimmed);
  });

  renderTable(filtered);
  isShowingAllCoins = false;
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

function handleRowClick(e, onFavoriteToggle) {
  const favoriteBtn = e.target.closest(".favorite-btn");
  if (favoriteBtn) {
    const symbol = favoriteBtn.dataset.symbol;
    toggleFavorite(symbol);
    updateFavoriteButtonUI(symbol);
    onFavoriteToggle?.();
    return;
  }
  const row = e.target.closest("tr[data-symbol]");
  if (row) {
    openDepthModal(row.dataset.symbol);
  }
}

coinTableBody.addEventListener("click", (e) => handleRowClick(e));

favoritesTableBody.addEventListener("click", (e) =>
  handleRowClick(e, renderFavoritesTable),
);

// favorites page
function renderFavoritesTable() {
  const favoriteCoins = allCoins.filter((coin) => favorites.has(coin.symbol));

  if (favoriteCoins.length === 0) {
    favoritesTable.hidden = true;

    noFavoritesMessage.hidden = false;
    return;
  }

  favoritesTable.hidden = false;
  noFavoritesMessage.hidden = true;
  favoritesTableBody.innerHTML = favoriteCoins.map(renderRow).join("");
}

favoritesNavLink.addEventListener("change", () => {
  if (favoritesNavLink.checked) {
    renderFavoritesTable();
  }
});

// update favorites
function updateFavoriteButtonUI(symbol) {
  const isFavorite = favorites.has(symbol);

  [...document.querySelectorAll(`.favorite-btn[data-symbol="${symbol}"]`)].map(
    (btn) => {
      btn.classList.toggle("active", isFavorite);
      btn.setAttribute("aria-pressed", isFavorite);
      btn.setAttribute(
        "aria-label",
        `${isFavorite ? "Remove" : "Add"} ${symbol} ${isFavorite ? "from" : "to"} favorites`,
      );
      const starPath = btn.querySelector("svg path:last-child");
      starPath.setAttribute("d", isFavorite ? starFilledPath : starOutlinePath);
    },
  );
}

// websocket
let tickerSocket = null;
let latestTickerData = null;
let isTickerRenderPending = false;

function connectTickerStream(symbols) {
  if (tickerSocket) {
    tickerSocket.close();
    tickerSocket = null;
  }
  const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
  tickerSocket = new WebSocket(
    `wss://stream.binance.com:9443/stream?streams=${streams}`,
  );
  tickerSocket.onopen = () => console.log("[WS ticker] connected");

  tickerSocket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    latestTickerData = [payload.data];

    scheduleTickerRender();
  };
}

function scheduleTickerRender() {
  if (isTickerRenderPending) return;
  isTickerRenderPending = true;

  requestAnimationFrame(() => {
    applyTickerUpdate(latestTickerData);
    isTickerRenderPending = false;
  });
}

function applyTickerUpdate(tickets) {
  console.log(
    `[WS ticker] received ${tickets.length} tickers, coinsBySymbol size: ${coinsBySymbol.size}`,
  );
  tickets
    .filter((ticker) => coinsBySymbol.has(ticker.s))
    .map((ticker) => {
      const coin = coinsBySymbol.get(ticker.s);
      coin.lastPrice = ticker.c;
      coin.priceChangePercent = ticker.P;
      coin.highPrice = ticker.h;
      coin.lowPrice = ticker.l;
      coin.quoteVolume = ticker.q;
      return coin;
    });

  renderVisibleRows();
  if (!favoritesTable.hidden) {
    renderFavoritesTable();
  }
}

// live coin update in the modal window
let depthSocket = null;

function connectDepthStream(symbol) {
  disconnectDepthStream();

  let latestDepthPayload = null;
  let isDepthRenderPending = false;

  depthSocket = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`,
  );

  depthSocket.onmessage = (event) => {
    latestDepthPayload = JSON.parse(event.data);
    if (!isDepthRenderPending) {
      isDepthRenderPending = true;
      requestAnimationFrame(() => {
        currentDepthData = {
          bids: parseDepthSide(latestDepthPayload.bids),
          asks: parseDepthSide(latestDepthPayload.asks),
        };
        renderVisibleDepth();
        isDepthRenderPending = false;
      });
    }
  };

  depthSocket.onerror = (err) => {
    console.error("[WS depth] error:", err);
  };
}

function disconnectDepthStream() {
  if (depthSocket) {
    depthSocket.onmessage = null;
    depthSocket.close();
    depthSocket = null;
  }
}

function reconcileDepthStream() {
  const limit = Number(depthLimitSelect.value);

  if (liveDepthLimits.has(limit)) {
    connectDepthStream(currentDepthSymbol);
  } else {
    disconnectDepthStream();
  }
}

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
