#!/bin/bash

VERCEL_URL="https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app"

echo "🧪 Testing Vercel Deployment with curl"
echo "================================================"
echo "🌐 Base URL: $VERCEL_URL"
echo ""

# Test 1: Root endpoint
echo "1️⃣ Testing root endpoint (/)..."
curl -s "$VERCEL_URL/" | head -c 500
echo ""
echo ""

# Test 2: Health check (no /api prefix)
echo "2️⃣ Testing health endpoint (/health)..."
curl -s "$VERCEL_URL/health" | head -c 500
echo ""
echo ""

# Test 3: Health check (with /api prefix)
echo "3️⃣ Testing health endpoint (/api/health)..."
curl -s "$VERCEL_URL/api/health" | head -c 500
echo ""
echo ""

# Test 4: TTS endpoint
echo "4️⃣ Testing TTS endpoint (/api/tts)..."
echo "Request body: {\"text\":\"Hello world\",\"voice\":\"alloy\"}"
curl -s -X POST "$VERCEL_URL/api/tts" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"text":"Hello world","voice":"alloy"}' | head -c 500
echo ""
echo ""

# Test 5: Chat endpoint
echo "5️⃣ Testing Chat endpoint (/api/chat)..."
echo "Request body: {\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one word\"}]}"
curl -s -X POST "$VERCEL_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in one word"}]}' | head -c 500
echo ""
echo ""

echo "================================================"
echo "✅ All curl tests completed!"
echo ""
echo "💡 Next steps:"
echo "  - Run 'bun run test-vercel-now.ts' for detailed JSON parsing"
echo "  - Check Vercel logs: vercel logs"
echo "  - Verify environment variables in Vercel dashboard"
