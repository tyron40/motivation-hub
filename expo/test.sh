#!/bin/bash

echo "🧪 Vercel Backend Test Suite"
echo ""
echo "Choose a test to run:"
echo ""
echo "  1) Quick Test (recommended)"
echo "  2) Detailed Diagnostics"
echo "  3) Simple curl Test"
echo "  4) Run All Tests"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo ""
    echo "Running quick test..."
    echo ""
    bun run test-vercel-now.ts
    ;;
  2)
    echo ""
    echo "Running detailed diagnostics..."
    echo ""
    bun run diagnose-vercel.ts
    ;;
  3)
    echo ""
    echo "Running curl tests..."
    echo ""
    chmod +x test-curl.sh
    ./test-curl.sh
    ;;
  4)
    echo ""
    echo "Running all tests..."
    echo ""
    echo "=== Quick Test ==="
    bun run test-vercel-now.ts
    echo ""
    echo ""
    echo "=== Detailed Diagnostics ==="
    bun run diagnose-vercel.ts
    echo ""
    echo ""
    echo "=== curl Tests ==="
    chmod +x test-curl.sh
    ./test-curl.sh
    ;;
  *)
    echo ""
    echo "Invalid choice. Running quick test by default..."
    echo ""
    bun run test-vercel-now.ts
    ;;
esac
