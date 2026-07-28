# CryptoShark 🦈

A crypto dashboard built with **vanilla JavaScript, HTML, and CSS**. Displays live market data for cryptocurrency trading pairs using the public Binance API.

## About

CryptoShark lets you browse cryptocurrencies (paired with USDT), see their current price and 24-hour stats, search through them, mark favorites and view detailed order book info for a selected coin.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES2017+, `async`/`await`, `fetch`)
- [Binance Public API](https://binance-docs.github.io/apidocs/spot/en/) (no authentication required)

## API Endpoints Used

| Endpoint               | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `/api/v3/ticker/24hr`  | Full 24h stats for all trading pairs (price, % change, volume, high/low) |
| `/api/v3/ticker/price` | Lightweight current price only                                           |
| `/api/v3/depth`        | Order book (bids/asks) for a specific coin                               |

## Notes

- All numeric values from the Binance API are returned as strings and are explicitly converted to numbers before sorting/comparison.
- No trading or account features are included — this project only displays public market data.
