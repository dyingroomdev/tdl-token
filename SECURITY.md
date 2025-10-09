# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Dollar Token (TDL), please report it responsibly:

- **Email:** security@dollartoken.io *(replace with production alias)*
- **PGP:** provide an encrypted channel before sharing sensitive details
- **Include:** affected component (program, CLI, DApp, backend), minimal reproduction steps, observed impact, and mitigation suggestions if known.

We target an initial acknowledgement within **48 hours** and a public fix or mitigation plan within **7 days** for high severity issues.

## Security Features

- Multi-signature admin control (recommended for mainnet)
- Access control with blacklist/whitelist + trading pause
- Presale vesting contract with whitelist proofs (Merkle root)
- Mint hardening script (`npm run hardening`) to audit authorities
- Comprehensive logging via events, scripts, and dashboards

## Audit Status

- **Devnet**: Testing deployment
- **Mainnet**: Requires professional audit before deployment

## Known Limitations

- Admin has significant control (disclosed for transparency)
- Whitelist proofs are only as strong as CSV provenance—employ secured pipeline
- Requires multi-sig custody for program upgrade and treasury access
- Presale DApp relies on configured RPC; use a trusted endpoint in production

## Bug Bounty

For mainnet deployment, we will offer bug bounties:

- **Critical** (key compromise, mint inflation, treasury drain): up to $10,000
- **High** (permanent fund loss, bypassing presale caps/vesting): up to $5,000
- **Medium** (temporary denial of service, incorrect accounting): up to $1,000
- **Low** (informational, best practices): swag / thank-you note

Please do not open public GitHub issues for undisclosed vulnerabilities.
