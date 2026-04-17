# 🧪 How to Test Your Vercel Backend

I've created comprehensive testing tools for your Vercel deployment. Here's how to use them:

## Quick Test (Recommended)

Run this command to test all endpoints:

```bash
bun run test-vercel-now.ts
```

This will test:
- ✅ Root endpoint (/)
- ✅ Health checks (/health and /api/health)
- ✅ TTS endpoint (/api/tts)
- ✅ Chat endpoint (/api/chat)

## Detailed Diagnostics

For detailed debugging information:

```bash
bun run diagnose-vercel.ts
```

This shows:
- Request/response headers
- Response body content
- Timing information
- Detailed error messages
- Troubleshooting suggestions

## Simple curl Test

For a quick check using curl:

```bash
chmod +x test-curl.sh
./test-curl.sh
```

## What to Expect

### ✅ All Tests Passing

You should see output like:
```
✅ Root: PASSED
✅ Health (no prefix): PASSED
✅ Health (with prefix): PASSED
✅ TTS: PASSED
✅ Chat: PASSED

✅ Passed: 5/5
```

This means your backend is working correctly!

### ❌ If Tests Fail

Common issues and solutions:

#### 1. "Network request failed"
**Problem**: Can't connect to Vercel
**Solution**: 
- Check if URL is correct in `.env`
- Visit the URL in browser to verify it's live
- Check your internet connection

#### 2. "JSON Parse error: Unexpected character: o"
**Problem**: Backend returning HTML instead of JSON
**Solution**:
- Check Vercel logs: `vercel logs`
- Verify environment variables are set in Vercel dashboard
- Make sure latest code is deployed

#### 3. "TTS API error: 404"
**Problem**: Route not found
**Solution**:
- Check `vercel.json` rewrites
- Verify `api/index.ts` is correct
- Redeploy: `vercel --prod`

#### 4. "OpenAI API key not configured"
**Problem**: Missing environment variable
**Solution**:
- Go to Vercel dashboard
- Add `OPENAI_API_KEY` in Settings > Environment Variables
- Redeploy after adding

## Vercel Dashboard Checklist

Visit https://vercel.com/dashboard and verify:

1. **Latest Deployment**
   - Status: Ready ✅
   - No build errors

2. **Environment Variables** (Settings > Environment Variables)
   - `OPENAI_API_KEY` ✅
   - `EXPO_PUBLIC_SUPABASE_URL` ✅
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` ✅

3. **Logs** (Deployments > [Latest] > Logs)
   - No error messages
   - Requests are being received

## Manual Testing

You can also test manually with curl:

### Test Health
```bash
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T...",
  "env": {
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "hasOpenAIKey": true
  }
}
```

### Test TTS
```bash
curl -X POST https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","voice":"alloy"}'
```

Expected response:
```json
{
  "audio": {
    "base64Data": "...",
    "mimeType": "audio/mpeg"
  }
}
```

## Files Created

I've created these test files for you:

1. **test-vercel-now.ts** - Main test script with JSON parsing
2. **diagnose-vercel.ts** - Detailed diagnostics with troubleshooting
3. **test-curl.sh** - Simple bash script using curl
4. **test-now.sh** - Wrapper that loads .env and runs tests
5. **TEST_VERCEL.md** - Comprehensive testing guide
6. **RUN_TESTS.md** - This file (quick reference)

## Next Steps

After all tests pass:

1. ✅ Backend is verified working
2. Test in your mobile app
3. Monitor Vercel logs for any issues
4. Consider setting up production environment

## Need Help?

If tests are failing:

1. Run the diagnostic script: `bun run diagnose-vercel.ts`
2. Check Vercel logs: `vercel logs`
3. Review the detailed output for specific error messages
4. Check the troubleshooting section in TEST_VERCEL.md

---

**Ready to test?** Run: `bun run test-vercel-now.ts`
