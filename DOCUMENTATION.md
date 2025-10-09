# Dollar Token (TDL) – Technical Overview & User Manual

This document summarizes the Dollar Token stack, including on-chain programs, tooling, frontend DApp, and operational workflows. Follow it for local setup, deployment, and ongoing management.

---

## 1. System Summary

### 1.1 Components

| Layer | Description |
|-------|-------------|
| **Core SPL Token (`programs/dollar-token`)** | Fixed-supply mint with admin transfer, mint/burn, liquidity drain, blacklist/whitelist trading gates, trading pause, and on-chain event logging. |
| **Presale & Vesting (`programs/tdl_presale`)** | Handles contributions (USDC/SOL), wallet caps, Merkle whitelist, configurable TGE/cliff/vesting schedule, refunds, vault withdrawals, and unallocated token returns. |
| **TypeScript SDK (`sdk/`)** | Exposes `TdlPresaleClient`, IDL, PDA helpers, and typed methods for buy/claim/refund usable by scripts and frontend. |
| **Scripts (`scripts/`)** | Hardening, presale CLI, deployment, whitelist import, buy/claim simulations, refunds, postmortem reporting, access-control manager, monitoring dashboard. |
| **Tests (`tests/`)** | Anchor + mocha suites covering token behavior, access-control flows, and presale mechanics (caps, whitelist, refunds, vesting, guards). |
| **Backend API (`backend/`)** | Express + TypeScript service exposing authenticated REST endpoints for presale status, whitelist updates, pause/withdraw controls, reports, and automation hooks (mint hardening). |
| **Web DApp (`app/`)** | React + Vite + Tailwind dashboard with wallet adapter support, live presale status, buy form, claim panel, launch checklist, reporting views, and admin console tied to the backend API. |
| **Docs & CI** | Updated README/SECURITY/CONTRIBUTING, `.env` templates, GitHub Actions pipelines for TypeScript checks and Anchor tests. |

### 1.2 Key Features

- **Wallet whitelist & blacklist** enforcement for core token transfers.
- **Trading toggle & liquidity controls** for launch operations.
- **Mint hardening audit** script to verify/revoke authorities.
- **Presale configuration** with soft/hard caps, min/max per wallet, buy cooldown, pause/unpause.
- **Merkle whitelist** ingestion from CSV (off-chain) and on-chain verification.
- **Vesting & refund flows** executing entirely through the presale program.
- **Comprehensive scripting** for automation, reporting, and CLI operations.
- **Frontend experience** for both contributors and admins.

---

## 2. Installation & Environment Setup

### 2.1 Prerequisites

- Node.js ≥ 18 and npm
- Rust toolchain + Cargo
- Solana CLI (≥1.17 recommended)
- Optional: Anchor CLI (`cargo install anchor-cli`)
- ts-node / ts-mocha for tests (installed automatically by scripts)

### 2.2 Repository Setup

```bash
git clone https://github.com/yourusername/dollar-token
cd dollar-token

# Install root dependencies (programs, SDK, scripts)
npm install

# Install web DApp dependencies
npm install --prefix app

# Install backend dependencies
npm install --prefix backend

# (Optional) install Anchor CLI and Solana toolchain
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### 2.3 Environment Variables

Copy and customize the frontend environment:

```bash
cp app/.env.example app/.env
vi app/.env   # populate program/state/mint addresses and RPC endpoint
```

Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_NETWORK` | `devnet`, `testnet`, or `mainnet-beta`. |
| `VITE_RPC_ENDPOINT` | Full RPC URL (overrides default cluster). |
| `VITE_PRESALE_PROGRAM_ID` | Deployed `tdl_presale` program address. |
| `VITE_PRESALE_STATE` | Presale state PDA. |
| `VITE_TDL_MINT` | Dollar Token mint address. |
| `VITE_PAY_MINT` | Contribution mint (USDC or wrapped SOL). |
| `VITE_PAY_SYMBOL` | Symbol shown in the UI (`USDC`, `SOL`). |
| `VITE_PRESALE_AUTHORITY` | Admin authority public key. |
| `VITE_TREASURY_TOKEN_ACCOUNT` | Treasury token account for withdrawals. |
| `VITE_BACKEND_URL` | Base URL for the backend API (default `http://localhost:4000`). |

---

## 3. Build, Test, and CI Workflows

### 3.1 Commands

```bash
# TypeScript compile check (root)
npx tsc --noEmit

# Presale mocha test suite
npx ts-mocha -p tsconfig.json -t 1000000 tests/presale/**/*.ts

# Anchor build + test (requires Solana validator)
anchor build
anchor test

# Web DApp build
npm run app:build

# Launch local DApp (http://localhost:5173)
npm run app:dev

# Backend API (http://localhost:4000)
cp backend/.env.example backend/.env
vi backend/.env
npm run dev --prefix backend

# Automation: generate presale summary (JSON/CSV)
# curl -H "x-api-key: <API_KEY>" http://localhost:4000/reports/summary
# curl -H "x-api-key: <API_KEY>" http://localhost:4000/reports/summary.csv -o presale-summary.csv

# Automation: run mint hardening audit
# curl -X POST -H "x-api-key: <API_KEY>" http://localhost:4000/operations/hardening
```

### 3.2 GitHub Actions

- `.github/workflows/ci.yml` – installs dependencies, runs TS compile, web build, and presale mocha tests for every push/PR.
- `.github/workflows/anchor.yml` – builds Anchor programs and runs `anchor test` whenever program sources change.

---

## 4. Scripts & CLI Reference

### 4.1 Presale CLI (`npm run presale -- ...`)

| Command | Description |
|---------|-------------|
| `init` | Initialize presale state, vault ATAs, and whitelist with a config JSON. |
| `set-config` | Update presale configuration before sale starts. |
| `status` | Print current presale metrics. |
| `buy` | Perform a contribution (supports guard & whitelist proof). |
| `claim` | Claim vested TDL tokens. |
| `refund` | Refund contributions if soft cap not met. |
| `withdraw` | Withdraw raised funds to treasury token account. |
| `report` | Export presale summary to JSON. |
| `toggle` | Pause or resume the sale. |

Example initialization flow:

```bash
npm run presale -- init \
  --tdl-mint <TDL_MINT> \
  --pay-mint <PAY_MINT> \
  --config configs/devnet.json
```

### 4.2 Dedicated Scripts

| Script | Command |
|--------|---------|
| Deploy presale program | `npm run presale:deploy:devnet` |
| Initialize presale (artifact output) | `npm run presale:init -- ...` |
| Import whitelist CSV | `npm run presale:whitelist -- ...` |
| Simulate buy | `npm run presale:buy -- ...` |
| Simulate claim | `npm run presale:claim -- ...` |
| Simulate refund | `npm run presale:refund -- ...` |
| Postmortem report | `npm run presale:report -- ...` |
| Mint hardening audit | `npm run hardening -- --mint <MINT>` |
| Access-control manager | `npm run manage -- ...` (see `scripts/manage-access.ts`) |
| Monitoring dashboard | `npm run monitor` |

All scripts emit JSON artefacts under `artifacts/` when applicable.

---

## 5. Frontend DApp Manual

### 5.1 Features

- **Status Card**: Displays progress (soft/hard cap), whitelist status, timelines.
- **Buy Panel**: Accepts contribution amount, optional Merkle proof; computes expected TDL output.
- **Claim Panel**: Shows purchased/claimed/claimable balances; calls on-chain claim instruction.
- **Admin Panel**:
  - Pause / resume sale.
  - Enable / disable whitelist.
  - Upload whitelist CSV → compute Merkle root → update config.
  - Perform treasury withdrawals to specified token account.
- **API Key Banner**: Store backend API key locally to unlock administrative actions routed through the new Express service.

### 5.2 Running Locally

```bash
npm run app:dev
# open http://localhost:5173
```

Connect via Phantom or Solflare (auto-configured). Ensure `.env` matches deployed program addresses.

### 5.3 Backend API Quickstart

1. Generate or supply a service signer (matches `PRESALE_AUTHORITY`):
   ```bash
   solana-keygen new -o backend/service-keypair.json
   ```
2. Configure environment and start API:
   ```bash
   cp backend/.env.example backend/.env
   vi backend/.env   # set RPC endpoint, API key, program addresses
   npm run dev --prefix backend
   ```
3. Call endpoints with `x-api-key` header:
   - `GET /status/presale` → summary metrics
   - `POST /presale/pause { "paused": true }`
   - `POST /whitelist/preview` (multipart CSV) → compute Merkle root
   - `POST /whitelist/apply` (multipart CSV) → publish whitelist root
   - (Future) `/token/*` for token administration

Use HTTPS/reverse proxy in production and restrict API access to trusted operators.

---

## 6. Operational Playbooks

### 6.1 Devnet Deployment (Quick Recap)

1. Deploy presale program: `npm run presale:deploy:devnet`.
2. Initialise state: `npm run presale:init -- --config configs/devnet.json`.
3. Fund presale TDL vault (mint tokens to PDA).
4. Import whitelist: `npm run presale:whitelist -- --csv data/whitelist.csv`.
5. Share DApp `.env` + addresses with team/testing wallets.

### 6.2 Mainnet Launch Checklist

- Mint hardening script executed and `artifacts/mint_audit.json` archived.
- Multi-sig upgrade authority & treasury custody configured.
- Presale config locked; whitelist root validated.
- Backend nonce / anti-bot service (optional) integrated.
- DApp built and hosted; backend endpoints secured.
- Run full test suite (`npx ts-mocha ...`, `anchor test`) before release.
- Update README/CHANGELOG for release notes.

### 6.3 Incident Response

- Use `npm run presale -- toggle --action pause` to halt contributions.
- Generate status snapshot with `npm run presale:report`.
- Coordinate via SECURITY policy: acknowledge within 48h, publish mitigation plan within 7 days for high-severity issues.
- Log actions in transparency reports (`scripts/manage-access.ts` already writes logs).

---

## 7. Contributing & Community

- Follow `CONTRIBUTING.md` for branch naming, testing, and PR workflow.
- Use conventional commits when possible.
- Discuss new features via issues/PRs, referencing relevant docs/tests.
- For vulnerabilities, **do not** open public issues—email the security contact in `SECURITY.md`.

---

## 8. Reference Links

- Core docs: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Programs: `programs/dollar-token`, `programs/tdl_presale`
- SDK: `sdk/`
- Scripts: `scripts/`
- Web App: `app/`
- Tests: `tests/`
- Artefact samples: `configs/devnet.json`, `data/whitelist.csv`, `artifacts/`

---

**Contact:** `security@dollartoken.io` (replace with production alias) | Twitter / GitHub links as per README.  
**Last updated:** 2024-05-08
