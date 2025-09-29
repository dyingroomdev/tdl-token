#!/bin/bash

# Dollar Token Deployment Script
echo "🚀 Starting Dollar Token (TDL) Deployment Process..."

# Configuration
NETWORK="devnet"
CLUSTER_URL="https://api.devnet.solana.com"

# Set Solana config
echo "⚙️ Configuring Solana CLI..."
solana config set --url $CLUSTER_URL
solana config set --keypair ~/.config/solana/id.json

# Check balance
echo "💰 Checking SOL balance..."
BALANCE=$(solana balance --lamports)
MIN_BALANCE=2000000000  # 2 SOL in lamports

if [ $BALANCE -lt $MIN_BALANCE ]; then
    echo "🪙 Insufficient balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

echo "✅ Current balance: $(solana balance) SOL"

# Build the program
echo "🔨 Building the program..."
anchor build

# Get program ID and update files
echo "🔑 Generating and updating Program ID..."
PROGRAM_ID=$(anchor keys list | grep "dollar_token" | awk '{print $2}')
echo "Program ID: $PROGRAM_ID"

# Update lib.rs with correct program ID
sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" programs/dollar-token/src/lib.rs

# Update Anchor.toml with correct program ID
sed -i "s/dollar_token = \"[^\"]*\"/dollar_token = \"$PROGRAM_ID\"/" Anchor.toml

# Rebuild with correct program ID
echo "🔨 Rebuilding with correct Program ID..."
anchor build

# Deploy to devnet
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "📋 Program ID: $PROGRAM_ID"
    echo "🌐 Network: $NETWORK"
    echo "🔗 Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    
    # Save deployment info
    cat > deployment_info.json << EOF
{
  "programId": "$PROGRAM_ID",
  "network": "$NETWORK",
  "clusterUrl": "$CLUSTER_URL",
  "deploymentDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "explorerUrl": "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
}
EOF

    echo "📄 Deployment info saved to deployment_info.json"
    
    # Initialize the token
    echo "🎯 Initializing Dollar Token..."
    npm run client
    
else
    echo "❌ Deployment failed!"
    exit 1
fi

echo "🎉 Dollar Token deployment completed!"
