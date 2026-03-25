#!/bin/bash
# Quick test script - just run this!

echo "🚀 Running Vercel Backend Tests..."
echo ""

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the test
bun run test-vercel-now.ts
