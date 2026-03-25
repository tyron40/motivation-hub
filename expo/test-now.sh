#!/bin/bash

echo "🧪 Running Vercel Backend Tests..."
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the test script
bun run test-vercel-now.ts
