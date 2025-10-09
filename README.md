# Dollar Token (TDL) 💰

A professional-grade Solana SPL token with advanced access control features, built using the Anchor framework.

![Dollar Token Logo](assets/logo.svg)

**⚠️ IMPORTANT**: This token includes powerful admin control features (blacklist, whitelist, trading toggle). These must be used transparently and ethically. Full disclosure of these capabilities is mandatory for legal and ethical compliance.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Token Economics](#token-economics)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Security](#security)
- [Legal Disclaimer](#legal-disclaimer)
- [Support](#support)
- [Presale Program](#presale-program)

---

## 🌟 Overview

**Dollar Token (TDL)** is a fixed-supply utility token on Solana with:
- **Total Supply**: 100,000,000 TDL (fixed)
- **Decimals**: 9
- **Network**: Solana
- **Framework**: Anchor 0.29.0

### Key Features

✅ **Standard SPL Token Functions**
- Mint, transfer, and burn capabilities
- Full SPL token compatibility
- Works with all Solana wallets

✅ **Admin Controls**
- Burn tokens (reduce supply)
- Drain liquidity (treasury management)
- Transfer authority
- **Access control features** (see below)

✅ **Advanced Access Control** ⚠️
- **Blacklist System**: Block specific wallets from trading
- **Whitelist System**: Restrict trading to approved wallets
- **Trading Toggle**: Enable/disable all trading globally

✅ **Safety & Transparency**
- Events logged on-chain for all actions
- Multi-signature wallet support
- Real-time monitoring dashboard
- Comprehensive audit trail

---

## 🎯 Token Economics

### Distribution Breakdown

| Category | Allocation | Tokens | Purpose |
|----------|------------|--------|---------|
| **Presale** | 25% | 25,000,000 TDL | Early investors and community |
| **Liquidity** | 20% | 20,000,000 TDL | DEX liquidity pools |
| **Rewards** | 25% | 25,000,000 TDL | Staking rewards and incentives |
| **Team** | 15% | 15,000,000 TDL | Core team (24-month vesting) |
| **Marketing** | 15% | 15,000,000 TDL | Marketing and partnerships |

### Presale Information

- **Presale Price**: $0.01 per TDL
- **Listing Price**: $0.015 per TDL (50% increase)
- **Raise Target**: $250,000
- **Market Cap at Launch**: $1,500,000
- **Min Investment**: $50
- **Max Investment**: $5,000

---

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ and npm
- Rust and Cargo
- Solana CLI tools
- Anchor CLI v0.29.0
- WSL (if on Windows)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dollar-token
cd dollar-token

# Install root dependencies (programs, SDK, scripts)
npm install

# Install web DApp dependencies
npm install --prefix app

# (Optional) install Anchor CLI locally
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### Local Development

```bash
# Launch the presale DApp (default port 5173)
npm run app:dev

# Configure environment (fill with devnet addresses)
cp app/.env.example app/.env
vi app/.env

# Build the web bundle
npm run app:build

# Run TypeScript compile checks and presale unit tests
npx tsc --noEmit
npx ts-mocha -p tsconfig.json -t 1000000 tests/presale/**/*.ts

# Execute Anchor program tests
anchor test
```

### Devnet Deployment Snippets

```bash
# Build + deploy the presale program (writes artifacts/addresses.*.json)
npm run presale:deploy:devnet

# Initialise a sale using configs/devnet.json
npm run presale:init -- \
  --tdl-mint <TDL_MINT> \
  --pay-mint <PAY_MINT> \
  --config configs/devnet.json

# Import whitelist CSV and publish Merkle root
npm run presale:whitelist -- \
  --state <STATE_PDA> --csv data/whitelist.csv

# Simulate buyer actions
npm run presale:buy -- --state <STATE_PDA> --pay-mint <PAY_MINT> --amount 1000000
npm run presale:claim -- --state <STATE_PDA> --tdl-mint <TDL_MINT>
npm run presale:refund -- --state <STATE_PDA> --pay-mint <PAY_MINT>

# Generate postmortem report
npm run presale:report -- --state <STATE_PDA> --format csv --out artifacts/report.csv
```

---

## 📚 Documentation

### Essential Guides

1. **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
2. **[Access Control Guide](ACCESS_CONTROL_GUIDE.md)** - How to use blacklist/whitelist features
3. **[Launch Checklist](LAUNCH_CHECKLIST.md)** - Complete pre-launch checklist
4. **[CLI Cheat Sheet](CLI_CHEATSHEET.md)** - Quick reference for all commands
5. **[Contributing Guide](CONTRIBUTING.md)** - Local workflow & pull request checklist

### Continuous Integration

Two GitHub Actions enforce quality gates:

- `.github/workflows/ci.yml` – installs dependencies, type-checks, builds the web app, and runs presale unit tests on every push/PR.
- `.github/workflows/anchor.yml` – builds Anchor programs and executes `anchor test` whenever on-chain code changes.

### Key Files

```
dollar-token-project/
├── programs/dollar-token/
│   └── src/lib.rs              # Main Solana program
├── programs/tdl_presale/       # Presale + vesting Anchor program
│   ├── src/lib.rs              # On-chain logic (whitelist, vesting, refunds)
│   └── Cargo.toml
├── client/
│   ├── interact.ts             # Client for token operations
│   ├── access-control.ts       # Access control manager
│   └── distribution.ts         # Distribution setup
├── sdk/
│   ├── idl/tdl_presale.json    # Generated Anchor IDL
│   ├── types/tdl_presale.ts    # Anchor type bindings
│   └── index.ts                # SDK entrypoint
├── scripts/
│   ├── manage-access.ts        # CLI tool for access control
│   └── monitor.ts              # Real-time monitoring dashboard
├── tests/
│   ├── dollar-token.ts         # Core dollar token tests
│   ├── access-control.ts       # Client access-control tests
│   └── presale/presale.spec.ts # Presale + vesting coverage
└── examples/
    ├── blacklist-bots.json     # Example blacklist
    └── whitelist-presale.json  # Example whitelist

## Presale Program

The presale logic for vesting, whitelist management, and post-sale claims lives in the standalone Anchor program under `programs/tdl_presale`. Running `anchor build` emits the IDL to `sdk/idl/tdl_presale.json` and TypeScript bindings to `sdk/types/tdl_presale.ts`, which are re-exported via `sdk/index.ts` for use in downstream tooling.

### Presale Tooling

- **CLI (`scripts/presale-cli.ts`)** – wraps initialise, buy, claim, refund, whitelist, pause and reporting commands. Invoke with `npm run presale -- --help`.
- **Automation scripts** – see `scripts/*.ts` for deploy, init, whitelist import, buy/claim simulations, refunds, and postmortem reports. All emit artefacts under `artifacts/`.
- **SDK (`sdk/`)** – provides `TdlPresaleClient` helpers used by scripts, tests, and the DApp. Import via `@sdk` alias inside the app or from downstream packages.
- **Tests (`tests/presale/presale.spec.ts`)** – mocha suite covering caps, whitelist enforcement, refunds, vesting, and guard controls. Run with `npx ts-mocha -p tsconfig.json -t 1000000 tests/presale/**/*.ts`.

### Presale DApp

A React + Vite dashboard lives in `app/` featuring:

- Live sale status, timelines, and progress
- Buyer participation form (whitelist-aware)
- Vesting claims with real-time unlock calculations
- Admin console for pause, whitelist uploads, and treasury withdrawals

Configure via `app/.env` (see `.env.example`) and launch locally with `npm run app:dev`.

---

## 🔐 Access Control Features

### ⚠️ Critical Disclosure

This token includes administrative controls that must be disclosed:

#### 1. Blacklist System
- **Purpose**: Block specific wallets from trading
- **Use Cases**: Bot protection, blocking malicious actors
- **Transparency**: All blacklist actions logged on-chain
- **Not Used For**: Preventing legitimate user sells

#### 2. Whitelist System
- **Purpose**: Restrict trading to approved wallets only
- **Use Cases**: Presale phase, KYC requirements
- **Duration**: Temporary (disabled after public launch)
- **Not Used For**: Permanent trading restrictions

#### 3. Trading Toggle
- **Purpose**: Global on/off switch for all trading
- **Use Cases**: Pre-launch, emergency bug fixes only
- **Notification**: 24-hour advance notice (except emergencies)
- **Not Used For**: Market manipulation

### Usage Examples

```bash
# Blacklist a bot wallet
npm run manage blacklist add BoT111... -r "Bot detected"

# Add presale investor to whitelist
npm run manage whitelist add Inv111... 10000

# Enable/disable trading
npm run manage trading true

# Check current status
npm run status

# Emergency pause (use responsibly!)
npm run emergency-pause
```

### Transparency Commitment

All administrative actions are:
- ✅ Logged on-chain permanently
- ✅ Recorded in public logs
- ✅ Reported in regular transparency reports
- ✅ Subject to community review
- ✅ Controlled by multi-signature wallet (production)

---

## 🛡️ Security

### Audits

- **Status**: [Pending/Completed]
- **Firm**: [Audit Firm Name]
- **Report**: [Link to audit report]
- **Findings**: All critical and high severity issues resolved

### Security Measures

✅ **Smart Contract Security**
- Comprehensive test coverage (>90%)
- Professional security audit
- No upgradeable proxies (immutable after deployment)
- Access controls with multi-sig

✅ **Operational Security**
- Hardware wallets for all admin keys
- Multi-signature requirements (3-of-5)
- 24/7 monitoring with alerts
- Incident response procedures

✅ **Transparency**
- All contract code public and verified
- Regular transparency reports
- Public blacklist registry
- Open-source client tools

### Bug Bounty

We offer rewards for responsible disclosure of security vulnerabilities:
- **Critical**: Up to $10,000
- **High**: Up to $5,000
- **Medium**: Up to $1,000
- **Low**: Up to $500

Contact: security@dollartoken.io

---

## 📊 Monitoring

### Real-Time Dashboard

```bash
# Start monitoring dashboard
npm run monitor
```

Features:
- Live token statistics
- Access control status
- Recent events log
- Suspicious activity alerts
- Holder count and volume tracking

### Logs and Reports

All operations are logged in `logs/` directory:
- `blacklist.json` - All blacklist operations
- `whitelist.json` - All whitelist operations
- `monitor.json` - Real-time events
- Regular transparency reports published to community

---

## 🤝 Community

### Official Channels

- **Website**: https://dollartoken.finance
- **Twitter**: [@DollarTokenTDL](https://twitter.com/DollarTokenTDL)
- **Telegram**: [Dollar Token Official](https://t.me/dollartokenofficial)
- **Discord**: [Join Our Discord](https://discord.gg/dollartoken)
- **Medium**: [Our Blog](https://medium.com/@dollartoken)

### Support

- **General Inquiries**: hello@dollartoken.io
- **Technical Support**: support@dollartoken.io
- **Security Issues**: security@dollartoken.io
- **Press**: press@dollartoken.io

---

## 🗺️ Roadmap

### Q1 2024
- ✅ Smart contract development
- ✅ Security audit
- ✅ Community building
- 🔄 Presale launch
- 🔄 DEX listing (Raydium)

### Q2 2024
- 📅 Additional DEX listings (Orca)
- 📅 CEX applications
- 📅 Staking platform launch
- 📅 Mobile app development

### Q3 2024
- 📅 Cross-chain bridge
- 📅 Governance system
- 📅 NFT integration
- 📅 Strategic partnerships

### Q4 2024
- 📅 Ecosystem expansion
- 📅 DeFi integrations
- 📅 DAO transition Phase 1
- 📅 Year-end report

---

## ⚖️ Legal Disclaimer

### Important Legal Information

**READ CAREFULLY BEFORE USING OR INVESTING**

1. **Not Financial Advice**: This documentation is for informational purposes only and does not constitute financial, investment, legal, or tax advice.

2. **Regulatory Compliance**: Ensure you comply with all applicable laws and regulations in your jurisdiction before using or investing in TDL.

3. **Admin Control Features**: This token includes administrative control features (blacklist, whitelist, trading toggle). While these are designed for legitimate purposes (bot protection, compliance, security), they give the admin significant power over the token. These features are disclosed here for transparency.

4. **Investment Risk**: Cryptocurrency investments carry significant risk. Never invest more than you can afford to lose. Past performance does not guarantee future results.

5. **No Guarantees**: There are no guarantees about the future value, utility, or success of TDL. The project may fail, and tokens may become worthless.

6. **Security Risks**: While we implement strong security measures, no system is 100% secure. Smart contracts may have undiscovered vulnerabilities.

7. **Jurisdiction**: This token may not be available in all jurisdictions. Check your local laws before participating.

8. **Tax Implications**: Cryptocurrency transactions may have tax implications. Consult with a tax professional regarding your situation.

**By using Dollar Token, you acknowledge that you have read, understood, and agree to these terms and accept all associated risks.**

**FOR U.S. PERSONS**: This token has not been registered under the Securities Act of 1933 or any state securities laws. It is being offered and sold in reliance on exemptions. Consult with legal counsel regarding applicability to your situation.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**IMPORTANT**: The MIT license covers the code but does not constitute legal or investment advice. All legal disclaimers above still apply.

---

## 🙏 Acknowledgments

Built with:
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana](https://solana.com/)
- [SPL Token Program](https://spl.solana.com/)

Special thanks to:
- Solana Foundation
- Anchor contributors
- Our community and early supporters
- Security auditors

---

## 📞 Contact

### Team

- **Founder/CEO**: [Name]
- **CTO**: [Name]
- **Head of Marketing**: [Name]

### Inquiries

- **Email**: hello@dollartoken.io
- **Telegram**: [@DollarTokenSupport](https://t.me/dollartokensupport)
- **Website**: https://dollartoken.finance

---

## 🔄 Version History

- **v1.0.0** (2024-01-15) - Initial mainnet release
  - Core token functionality
  - Access control features
  - Distribution system
  - Monitoring tools

---

## ⭐ Star Us!

If you find this project useful, please consider giving it a star on GitHub!

---

**Disclaimer**: This README and all associated documentation must be read in conjunction with the legal disclaimers. Always do your own research (DYOR) before investing in any cryptocurrency project.

*Last updated: January 2024*
*Version: 1.0.0*
