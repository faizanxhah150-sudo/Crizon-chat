#!/usr/bin/env bash
# Deploy Crizon's message-delivery and push-notification Cloud Functions.
# Run from the project root after installing Node dependencies and signing in
# with a Firebase account that has permission to deploy to crizon-6f77e.
set -euo pipefail

PROJECT_ID="crizon-6f77e"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required. Install Node.js 20 or newer first." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required." >&2
  exit 1
fi
if [ ! -f "firebase.json" ] || [ ! -f "functions/index.js" ]; then
  echo "ERROR: Run this script from the Crizon project root." >&2
  exit 1
fi

if ! npx --yes firebase-tools projects:list >/dev/null 2>&1; then
  echo "ERROR: Firebase CLI is not authenticated or cannot access the project." >&2
  echo "Run: npx firebase-tools login" >&2
  exit 1
fi

npm --prefix functions install
npx --yes firebase-tools deploy --only functions --project "$PROJECT_ID"
