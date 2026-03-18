#!/usr/bin/env bash
# deploy.sh — Deploy USDCx to Stacks Testnet
#
# Prerequisites:
#   npm install -g @stacks/cli
#   STX testnet balance (faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet)
#
# Usage:
#   DEPLOYER_KEY=<64-char-hex-private-key> bash deploy.sh

set -euo pipefail

NETWORK="testnet"
API="https://api.testnet.hiro.so"
DEPLOYER_KEY="${DEPLOYER_KEY:?Set DEPLOYER_KEY env var}"

# Derive deployer address
DEPLOYER=$(stx get_address -t "$DEPLOYER_KEY" 2>/dev/null | grep "^ST" | head -1)
echo "Deployer: $DEPLOYER"

# ── Step 1: Deploy usdcx-token ────────────────────────────────────────────────
echo ""
echo "==> Deploying usdcx-token..."
stx deploy_contract \
  usdcx-token \
  ./usdcx-token.clar \
  0 \
  "$DEPLOYER_KEY" \
  -t

echo ""
echo "==> Waiting 30s for usdcx-token to confirm..."
sleep 30

# ── Step 2: Deploy usdcx-v1 ──────────────────────────────────────────────────
echo ""
echo "==> Deploying usdcx-v1..."
stx deploy_contract \
  usdcx-v1 \
  ./usdcx-v1.clar \
  1 \
  "$DEPLOYER_KEY" \
  -t

echo ""
echo "==> Waiting 30s for usdcx-v1 to confirm..."
sleep 30

# ── Step 3: Register usdcx-v1 as mint-role caller ────────────────────────────
echo ""
echo "==> Granting mint role to usdcx-v1..."
stx call_contract_func \
  "$DEPLOYER" \
  usdcx-token \
  set-active-protocol-caller \
  "'${DEPLOYER}.usdcx-v1" \
  "0x01" \
  "true" \
  0 \
  "$DEPLOYER_KEY" \
  -t

echo ""
echo "✓ Done!"
echo ""
echo "Token contract : ${DEPLOYER}.usdcx-token"
echo "Bridge contract: ${DEPLOYER}.usdcx-v1"
echo ""
echo "Add to server/.env.local:"
echo "  USDCX_CONTRACT_ADDRESS=${DEPLOYER}"
echo "  USDCX_CONTRACT_NAME=usdcx-token"
