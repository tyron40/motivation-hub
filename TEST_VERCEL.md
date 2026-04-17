# Vercel Backend Testing Guide

This guide helps you test your Vercel-deployed backend endpoints.

## Quick Start

### Option 1: Run TypeScript Test (Recommended)
```bash
bun run test-vercel-now.ts
```

This will test all endpoints and show detailed results with JSON parsing.

### Option 2: Run Bash Script with curl
```bash
chmod +x test-curl.sh
./test-curl.sh
```

This uses curl to test endpoints and shows raw responses.

### Option 3: Run with Environment Variables
```bash
chmod +x test-now.sh
./test-now.sh
```

This loads .env file and runs the TypeScript test.

## What Gets Tested

1. **Root Endpoint** (`/`)
   - Should return: `{"status":"ok","message":"API is running",...}`

2. **Health Check** (`/health` and `/api/health`)
   - Should return: `{"status":"healthy",...}`
   - Shows which environment variables are configured

3. **TTS Endpoint** (`/api/tts`)
   - Tests text-to-speech generation
   - Should return: `{"audio":{"base64Data":"...","mimeType":"audio/mpeg"}}`

4. **Chat Endpoint** (`/api/chat`)
   - Tests OpenAI chat completion
   - Should return: `{"message":"..."}`

## Expected Results

✅ **All tests passing** means:
- Backend is deployed correctly
- All routes are accessible
- OpenAI API key is configured
- Endpoints return valid JSON

❌ **If tests fail**, check:

### 404 Errors
- Verify `vercel.json` rewrites are correct
- Make sure latest code is deployed: `vercel --prod`
- Check that `api/index.ts` exports the Hono app correctly

### 500 Errors
- Check Vercel logs: `vercel logs`
- Verify environment variables in Vercel dashboard:
  - `OPENAI_API_KEY` (required for TTS and Chat)
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Network Errors
- Verify the Vercel URL is correct
- Check if deployment is live: visit the URL in browser
- Ensure you have internet connection

### JSON Parse Errors
- Backend might be returning HTML instead of JSON
- Check Vercel logs for actual error messages
- Verify CORS configuration in `backend/hono.ts`

## Manual Testing

You can also test endpoints manually using curl:

### Test Root
```bash
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/
```

### Test Health
```bash
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health
```

### Test TTS
```bash
curl -X POST https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"alloy"}'
```

### Test Chat
```bash
curl -X POST https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}'
```

## Vercel Dashboard

To check your deployment:

1. Visit: https://vercel.com/dashboard
2. Find your project: `motivation-hub`
3. Check:
   - **Deployments**: Latest deployment status
   - **Logs**: Real-time logs from your backend
   - **Settings > Environment Variables**: Verify all keys are set

## Environment Variables Required

Make sure these are set in Vercel dashboard:

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Troubleshooting

### "Network request failed"
- Check if Vercel deployment is live
- Verify URL is correct in `.env` file
- Test with curl to see actual response

### "JSON Parse error: Unexpected character: o"
- Backend is returning HTML error page instead of JSON
- Check Vercel logs for the actual error
- Verify OpenAI API key is set correctly

### "TTS API error: 404"
- Routes might not be configured correctly
- Check `vercel.json` rewrites
- Verify `api/index.ts` is exporting correctly

### "OpenAI API key not configured"
- Add `OPENAI_API_KEY` to Vercel environment variables
- Redeploy after adding the key

## Next Steps

After all tests pass:
1. Update your app to use the Vercel API
2. Test in the mobile app
3. Monitor Vercel logs for any issues
4. Set up production environment variables
