# Contributing Guidelines

Thanks for taking the time to contribute to **Dollar Token (TDL)**! This document outlines the workflow we follow for code changes, testing, and reviews.

## Getting Started

- Fork the repository and create a feature branch (`feat/<topic>`, `fix/<bug>`, `docs/<area>` etc.).
- Install dependencies:
  ```bash
  npm install          # root scripts & SDK
  npm install --prefix app  # web DApp
  ```
- Optional: Install Anchor CLI and Solana toolchain (`cargo install anchor-cli`, `solana --version`).

## Development Workflow

1. **Format & Compile**
   ```bash
   npx tsc --noEmit
   ```
2. **Run tests**
   ```bash
   # Presale & program unit tests
   npx ts-mocha -p tsconfig.json -t 1000000 tests/presale/**/*.ts
   anchor test
   ```
3. **Web app** (when touched)
   ```bash
   npm run app:build
   ```
4. Commit with clear, conventional messages (`feat: ...`, `fix: ...`, `docs: ...`).

## Pull Requests

- Ensure CI passes (`ci` and `anchor` GitHub Actions).
- Link to relevant issue / context in the PR description.
- Provide testing evidence (commands run + key output) in the PR body.
- Highlight any migrations or manual steps required for reviewers.

## Coding Standards

- Follow existing TypeScript, Rust, and React patterns in the repo.
- Prefer small, composable functions with explicit types.
- Document public APIs and complex logic with succinct comments.
- Do not commit secrets, keypairs, or RPC credentials.

## Security & Responsible Disclosure

- Never post exploit details publicly. Use the contact listed in `SECURITY.md`.
- Run `npm run hardening` before revoking authorities or preparing mainnet releases.
- Flag any changes that might impact token supply, treasury custody, or presale logic.

## Release Checklist (maintainers)

- [ ] Anchor programs build + test (`anchor build`, `anchor test`).
- [ ] TypeScript compile + tests (`npx tsc --noEmit`, `npx ts-mocha ...`).
- [ ] App builds (`npm run app:build`).
- [ ] Mint hardening report updated (if authorities changed).
- [ ] Docs / changelog updated.

Thanks again for contributing! 🙌
