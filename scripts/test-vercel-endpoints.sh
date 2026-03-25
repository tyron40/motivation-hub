#!/bin/bash

# Test Vercel Deployment Endpoints
# Usage: ./scripts/test-vercel-endpoints.sh

VERCEL_URL="https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app"

echo "🧪 Testing Vercel Deployment: $VERCEL_URL"
echo "================================================"
echo ""

# Test 1: Root endpoint
echo "1️⃣ Testing root endpoint (/)..."
curl -s "$VERCEL_URL/" | jq '.' || echo "❌ Failed"
echo ""
echo ""

# Test 2: Health check (no /api prefix)
echo "2️⃣ Testing health endpoint (/health)..."
curl -s "$VERCEL_URL/health" | jq '.' || echo "❌ Failed"
echo ""
echo ""

# Test 3: Health check (with /api prefix)
echo "3️⃣ Testing health endpoint (/api/health)..."
curl -s "$VERCEL_URL/api/health" | jq '.' || echo "❌ Failed"
echo ""
echo ""

# Test 4: TTS endpoint
echo "4️⃣ Testing TTS endpoint (/api/tts)..."
curl -s -X POST "$VERCEL_URL/api/tts" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"text":"Hello world","voice":"alloy"}' | jq '.audio.mimeType, (.audio.base64Data | length)' || echo "❌ Failed"
echo ""
echo ""

# Test 5: Chat endpoint
echo "5️⃣ Testing Chat endpoint (/api/chat)..."
curl -s -X POST "$VERCEL_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in one word"}]}' | jq '.' || echo "❌ Failed"
echo ""
echo ""

echo "================================================"
echo "✅ All tests completed!"
echo ""
echo "💡 Tips:"
echo "  - If you see 404 errors, check vercel.json rewrites"
echo "  - If you see 500 errors, check Vercel logs: vercel logs"
echo "  - If you see CORS errors, check backend/hono.ts CORS config"
echo "  - Make sure environment variables are set in Vercel dashboard"
