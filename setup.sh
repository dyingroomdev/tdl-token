#!/bin/bash

echo "🚀 Dollar Token (TDL) Project Setup Script"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in WSL
if grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null ; then
    print_success "WSL environment detected ✓"
else
    print_warning "This script is optimized for WSL. Proceeding anyway..."
fi

# Create project structure
print_status "Creating project structure..."
mkdir -p dollar-token-project
cd dollar-token-project

# Initialize Anchor project
print_status "Initializing Anchor project..."
if command -v anchor &> /dev/null; then
    anchor init . --no-git
    print_success "Anchor project initialized ✓"
else
    print_error "Anchor not found. Please install Anchor CLI first."
    exit 1
fi

# Create additional directories
mkdir -p client assets tests

# Create directory structure
print_status "Setting up directory structure..."
mkdir -p programs/dollar-token/src

print_success "Project structure created:"
echo "  dollar-token-project/"
echo "  ├── programs/dollar-token/src/"
echo "  ├── client/"
echo "  ├── assets/"
echo "  ├── tests/"
echo "  └── target/"

# Check dependencies
print_status "Checking dependencies..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION ✓"
else
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    print_success "Rust installed ✓"
else
    print_error "Rust not found. Please install Rust first."
    exit 1
fi

# Check Solana CLI
if command -v solana &> /dev/null; then
    SOLANA_VERSION=$(solana --version)
    print_success "Solana CLI installed ✓"
else
    print_error "Solana CLI not found. Please install Solana CLI first."
    exit 1
fi

# Set up Solana config for devnet
print_status "Configuring Solana for devnet..."
solana config set --url devnet

# Check if wallet exists, if not create one
WALLET_PATH="$HOME/.config/solana/id.json"
if [ ! -f "$WALLET_PATH" ]; then
    print_status "Creating new Solana wallet..."
    solana-keygen new --outfile "$WALLET_PATH" --no-bip39-passphrase
    print_success "New wallet created ✓"
else
    print_success "Existing wallet found ✓"
fi

# Display wallet info
WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
print_status "Wallet address: $WALLET_ADDRESS"

# Check SOL balance
BALANCE=$(solana balance --url devnet 2>/dev/null || echo "0 SOL")
print_status "Current balance: $BALANCE"

# Request airdrop if balance is low
if [[ $BALANCE == "0 SOL" ]]; then
    print_status "Requesting SOL airdrop..."
    solana airdrop 2 --url devnet
    print_success "Airdrop requested ✓"
fi

# Create placeholder files with instructions
print_status "Creating placeholder files..."

# Create instruction file
cat > INSTRUCTIONS.md << 'EOF'
# Dollar Token Setup Instructions

## Next Steps:

1. **Copy the provided artifacts** into their respective files:
   - Copy `lib.rs` content to `programs/dollar-token/src/lib.rs`
   - Copy `Cargo.toml` content to `programs/dollar-token/Cargo.toml`
   - Copy `package.json` content to root directory
   - Copy other files as indicated in the deployment guide

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Build the program:**
   ```bash
   anchor build
   ```

4. **Update Program ID:**
   ```bash
   anchor keys list
   # Copy the program ID and update in lib.rs and Anchor.toml
   ```

5. **Run tests:**
   ```bash
   anchor test
   ```

6. **Deploy to devnet:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Important Files to Create:
- `programs/dollar-token/src/lib.rs` - Main program code
- `programs/dollar-token/Cargo.toml` - Rust dependencies
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `Anchor.toml` - Anchor configuration
- `tests/dollar-token.ts` - Test suite
- `client/interact.ts` - Client interaction script
- `client/distribution.ts` - Token distribution
- `deploy.sh` - Deployment script
- `assets/logo.svg` - Token logo

Refer to the provided artifacts for the complete file contents.
EOF

# Create basic package.json to start with
cat > package.json << 'EOF'
{
  "name": "dollar-token",
  "version": "0.1.0",
  "description": "Dollar Token (TDL) Solana Program",
  "main": "index.js",
  "scripts": {
    "test": "anchor test",
    "build": "anchor build",
    "deploy:devnet": "anchor deploy --provider.cluster devnet"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0",
    "@solana/spl-token": "^0.3.8",
    "@solana/web3.js": "^1.87.6"
  },
  "devDependencies": {
    "typescript": "^4.9.5",
    "ts-node": "^10.9.1"
  }
}
EOF

print_success "Setup completed! ✓"
print_status "Project location: $(pwd)"
echo ""
print_warning "NEXT STEPS:"
echo "1. Copy all the provided artifact files into their respective locations"
echo "2. Run 'npm install' to install dependencies" 
echo "3. Follow the deployment guide for detailed instructions"
echo ""
print_status "Read INSTRUCTIONS.md for detailed next steps"

# Final summary
echo ""
echo "=========================================="
print_success "Dollar Token Project Setup Complete! 🎉"
echo "=========================================="
