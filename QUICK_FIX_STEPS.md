# Quick Fix Steps - YouTube API Error

## The Problem
Your app shows: **"API key not valid. Please pass a valid API key."**

This is because the YouTube API key is either:
1. Invalid or expired
2. Has restrictions that block the request
3. Being called from the client (insecure)

## The Solution (3 Steps)

### Step 1: Get a Valid YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Click **"Enable APIs and Services"**
4. Search for **"YouTube Data API v3"** and enable it
5. Go to **Credentials** → **Create Credentials** → **API Key**
6. **IMPORTANT**: Do NOT add any restrictions yet (you can add them later)
7. Copy the API key (it looks like: `AIzaSyC...`)

### Step 2: Add API Key to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **motivation-hub**
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: [Paste your API key from Step 1]
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy

**Option A: Automatic (Recommended)**
- Just push any change to your git repository
- Vercel will automatically redeploy with the new environment variable

**Option B: Manual**
1. Go to your Vercel project dashboard
2. Click **Deployments** tab
3. Click the **"..."** menu on the latest deployment
4. Click **"Redeploy"**

## Verify It Works

### Test 1: Check Vercel Health
Open this URL in your browser:
```
https://motivation-hub-iota.vercel.app/api/health
```

You should see:
```json
{
  "ok": true,
  "status": "healthy",
  "env": {
    "hasYouTubeKey": true  ← This should be true
  }
}
```

### Test 2: Test YouTube API
Run this in your terminal:
```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

You should see a JSON response with YouTube videos.

### Test 3: Test in App
1. Rebuild your app (if you changed .env file)
2. Open the app on your device
3. Check if YouTube videos load on the home screen
4. Go to the diagnostic page and run tests

## Troubleshooting

### If health check shows `hasYouTubeKey: false`
- The environment variable is not set in Vercel
- Go back to Step 2 and make sure you saved it

### If YouTube API test returns an error
- Check Vercel logs: Dashboard → Deployments → Latest → Function Logs
- Make sure YouTube Data API v3 is enabled in Google Cloud Console
- Make sure the API key has no restrictions

### If app still doesn't work
1. Make sure your `.env` file has:
   ```env
   EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app
   ```
2. Rebuild your app after changing `.env`
3. Check the app logs for errors

## Important Notes

✅ **DO**: Set `YOUTUBE_API_KEY` in Vercel environment variables
❌ **DON'T**: Use `EXPO_PUBLIC_YOUTUBE_API_KEY` in your app (security risk)

✅ **DO**: Use the backend to fetch YouTube videos
❌ **DON'T**: Call YouTube API directly from the app

✅ **DO**: Keep API keys in Vercel environment variables
❌ **DON'T**: Commit API keys to git

## Need Help?

If you're still having issues:
1. Check Vercel logs for errors
2. Test the backend directly (see Test 2 above)
3. Make sure all environment variables are set correctly
4. Rebuild your app after any changes

## Summary

The fix is simple:
1. Get a valid YouTube API key from Google Cloud Console
2. Add it to Vercel environment variables as `YOUTUBE_API_KEY`
3. Redeploy your Vercel backend

That's it! Your app will now fetch YouTube videos securely through the backend.
