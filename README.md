## Lazarus Web

[![CI](https://github.com/LazarusProtocol/web/actions/workflows/ci.yml/badge.svg)](https://github.com/LazarusProtocol/web/actions)

Developer diagnostics, visual TTL heatmap, vault escrow portal, and keeper operator dashboard for the Lazarus Protocol.

Built with React 19, Vite, TailwindCSS v4, and `@creit-tech/stellar-wallets-kit` (Freighter, Albedo, Lobstr, xBull).

* **Live Console:** [https://lazarusprotocol.online/](https://lazarusprotocol.online/)
* **Indexer API:** [https://api.lazarusprotocol.online/](https://api.lazarusprotocol.online/)

---

### Core Features

* **Live Telemetry & Search:** Real-time health metrics and 56-character Soroban contract ID search.
* **Visual TTL Heatmap:** Color-coded storage entry status categorized by remaining ledgers:
  * **Healthy:** `> 30 days` (`> 518,400 ledgers`)
  * **Warming Window:** `2,000 to 518,400 ledgers` (queued for keeper cohort extension)
  * **Critical Risk:** `<= 2,000 ledgers` (emergency threshold bypass)
* **Vault Escrow Portal:** Non-custodial contract enrollment, deposit/withdraw controls, fixed bounty configuration, and live settlement feeds.
* **Keeper Operator Dashboard:** Keeper node registration, pending voucher batch tracking, and one-click on-chain redemption.
* **Developer Documentation:** Guides covering CAP-0062 / CAP-0066 state-rent lifecycle and keeper operations.

---

### Development & Build

```bash
# Install dependencies
npm install

# Start Vite dev server (proxies /api to indexer :8000)
npm run dev

# Run lint checks & build production bundle
npm run lint
npm run build
```
