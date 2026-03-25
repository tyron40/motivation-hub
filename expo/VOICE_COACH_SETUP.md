# Voice Coach Setup Guide

## Current Issue

The voice coach feature is experiencing a JSON parsing error when trying to connect to the backend. This error occurs because:

1. **Backend URL Not Configured**: The `EXPO_PUBLIC_RORK_API_BASE_URL` environment variable is not set
2. **Production Deployment**: The app works locally (when running `bun start`) but fails in TestFlight because there's no deployed backend

## Error Details

```
❌ TTS mutation error: TRPCClientError: Unexpected non-whitespace character after JSON at position 4
```

This error means the tRPC client is trying to connect to a backend that doesn't exist or is returning HTML instead of JSON.

## Solution Options

### Option 1: Deploy Your Backend (Recommended for Production)

To make the voice coach work in TestFlight and production builds, you need to deploy your backend.

#### Step 1: Choose a Hosting Provider

Popular options:
- **Fly.io** (Recommended) - Free tier available
- **Railway** - Easy deployment
- **Render** - Free tier available
- **Vercel** - Serverless deployment

#### Step 2: Deploy the Backend

For Fly.io example:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Navigate to your project
cd your-project-directory

# Create a fly.toml file
flyctl launch

# Deploy
flyctl deploy
```

#### Step 3: Set Environment Variables

After deployment, set your environment variables on the hosting platform:

```bash
# For Fly.io
flyctl secrets set OPENAI_API_KEY=your-openai-api-key
flyctl secrets set EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
flyctl secrets set EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Step 4: Update Your .env File

Add the deployed backend URL to your `.env` file:

```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-app.fly.dev
```

#### Step 5: Rebuild Your App

```bash
# For EAS Build
eas build --platform ios --profile production

# Or for local builds
bun expo prebuild
```

### Option 2: Use Local Development Only

If you only want to test locally:

1. Make sure `bun start` is running
2. The tunnel URL will be automatically set
3. Voice coach will work in Expo Go and local builds

### Option 3: Store OpenAI Key in Supabase (Current Setup)

Your backend is already configured to fetch the OpenAI API key from Supabase. Make sure:

1. You have a `secrets` table in Supabase
2. The table has columns: `key` (text) and `value` (text)
3. Insert your OpenAI API key:

```sql
INSERT INTO secrets (key, value)
VALUES ('OPENAI_API_KEY', 'sk-proj-your-actual-key-here');
```

## Verifying the Setup

### Check Backend Connection

1. Open your app
2. Navigate to Voice Coach
3. Check the console logs for:
   - `✅ Using backend URL: [your-url]`
   - If you see `❌ Backend URL not configured`, the environment variable is not set

### Test TTS Generation

1. Try speaking to the voice coach
2. Check console logs for:
   - `🎤 Generating TTS for text: ...`
   - `✅ TTS audio received from backend`
   - If you see errors, check the backend logs

### Backend Health Check

You can test if your backend is running by visiting:
- `https://your-backend-url.com/` - Should return `{"status":"ok","message":"API is running"}`
- `https://your-backend-url.com/api` - Should return `{"status":"ok","message":"tRPC API is running"}`

## Troubleshooting

### Error: "Backend URL not configured"

**Solution**: Set `EXPO_PUBLIC_RORK_API_BASE_URL` in your `.env` file and rebuild the app.

### Error: "OpenAI API key not configured"

**Solution**: 
1. Check if the key is in Supabase `secrets` table
2. Or set `OPENAI_API_KEY` in your backend environment variables
3. Verify the key is valid and has credits

### Error: "Network request failed"

**Solution**:
1. Check if your backend is running
2. Verify the backend URL is correct
3. Check if there are CORS issues (backend should allow requests from your app)

### Error: "Unexpected non-whitespace character after JSON"

**Solution**:
1. This usually means the backend is returning HTML instead of JSON
2. Check if the backend URL is correct
3. Verify the backend is running and accessible
4. Check backend logs for errors

## Important Notes

1. **Never commit API keys**: The `.env` file should be in `.gitignore`
2. **Use environment variables**: Store sensitive data in environment variables, not in code
3. **Backend deployment is required for production**: TestFlight and App Store builds need a deployed backend
4. **Local development**: `bun start` automatically sets up a tunnel URL for local testing

## Current Configuration

Your app is configured to:
- Use Supabase for OpenAI API key storage
- Use tRPC for backend communication
- Use toolkit.rork.com for speech-to-text (STT) only
- Require a deployed backend for text-to-speech (TTS) and chat

## Next Steps

1. Deploy your backend to a hosting provider
2. Set the `EXPO_PUBLIC_RORK_API_BASE_URL` environment variable
3. Rebuild your app for TestFlight
4. Test the voice coach feature

For more help, check:
- `BACKEND_DEPLOYMENT.md` - Backend deployment guide
- `PRODUCTION_READY.md` - Production checklist
