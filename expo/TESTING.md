# Testing Your Vercel Deployment

This guide helps you verify that your Vercel backend is working correctly.

## Quick Test Commands

### Option 1: Using Bun/Node (Recommended)
```bash
bun run scripts/test-vercel.ts
```

### Option 2: Using Bash (requires `jq` and `curl`)
```bash
bash scripts/test-vercel-endpoints.sh
```

### Option 3: Manual curl commands

Test each endpoint individually:

```bash
# 1. Test root endpoint
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/

# 2. Test health check
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health

# 3. Test TTS endpoint
curl -X POST https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"alloy"}'

# 4. Test Chat endpoint
curl -X POST https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}'
```

## What Each Test Checks

1. **Root endpoint (/)** - Verifies the API is running
2. **Health check (/api/health)** - Checks environment variables are set
3. **TTS endpoint (/api/tts)** - Tests text-to-speech generation
4. **Chat endpoint (/api/chat)** - Tests OpenAI chat integration

## Expected Results

### ✅ Success
- Status: 200 OK
- Content-Type: application/json
- Valid JSON response

### ❌ Common Errors

#### 404 Not Found
- **Cause**: Vercel routing issue or endpoint not deployed
- **Fix**: Check `vercel.json` rewrites and redeploy

#### 500 Internal Server Error
- **Cause**: Missing environment variables or OpenAI API error
- **Fix**: Check Vercel environment variables in dashboard

#### Network request failed
- **Cause**: CORS issue or wrong URL
- **Fix**: Verify CORS settings in `backend/hono.ts`

## Vercel CLI Commands

### View logs
```bash
vercel logs
```

### Deploy to production
```bash
vercel --prod
```

### Check deployment status
```bash
vercel ls
```

### Set environment variables
```bash
vercel env add OPENAI_API_KEY
vercel env add EXPO_PUBLIC_SUPABASE_URL
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Environment Variables Checklist

Make sure these are set in your Vercel dashboard:

- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Troubleshooting

### TTS returns 404
1. Check if `/api/tts` endpoint exists in `backend/hono.ts`
2. Verify `vercel.json` has correct rewrites
3. Redeploy: `vercel --prod`

### TTS returns 500
1. Check Vercel logs: `vercel logs`
2. Verify `OPENAI_API_KEY` is set in Vercel dashboard
3. Test OpenAI API key directly

### Network request failed in app
1. Check `EXPO_PUBLIC_RORK_API_BASE_URL` in `.env`
2. Verify URL matches your Vercel deployment
3. Check CORS settings in `backend/hono.ts`
4. Rebuild the app after changing `.env`

## Testing from the App

After verifying the backend works with curl/scripts, test from your app:

1. Make sure `.env` has the correct Vercel URL:
   ```
   EXPO_PUBLIC_RORK_API_BASE_URL=https://your-deployment.vercel.app
   ```

2. Restart the app to load new environment variables

3. Try the Voice Coach feature or Chat feature

4. Check console logs for detailed error messages
