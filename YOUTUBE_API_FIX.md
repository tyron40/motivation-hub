# YouTube API Fix - Production Ready

## Problem
The app was trying to use `EXPO_PUBLIC_YOUTUBE_API_KEY` to call YouTube API directly from the client, which caused:
1. **Security Risk**: API key exposed in client-side code
2. **API Key Invalid Error**: The key either has restrictions or is invalid
3. **400 Error**: "API key not valid. Please pass a valid API key."

## Solution
✅ **Removed client-side YouTube API calls** - The app now uses **only the Vercel backend** to fetch YouTube videos.

## Changes Made

### 1. Updated `.env` File
- ❌ Removed `EXPO_PUBLIC_YOUTUBE_API_KEY` (client-side key)
- ✅ Kept `YOUTUBE_API_KEY` (server-side only)
- The API key is now **only accessible from the backend**

### 2. Updated App Code
- ✅ `app/category/[id].tsx` - Now uses `youtubeService.ts` (backend) instead of `youtubeDirectService.ts` (direct API)
- ✅ `components/DiagnosticInfo.tsx` - Updated to test YouTube API via backend

### 3. Backend Already Configured
The Vercel backend (`backend/hono.ts`) already has these endpoints:
- ✅ `POST /api/youtube/category` - Fetch videos by category
- ✅ `POST /api/youtube/search` - Search YouTube videos
- ✅ `POST /api/youtube/trending` - Fetch trending videos

## What You Need to Do

### Step 1: Set YouTube API Key in Vercel
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `motivation-hub`
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   Name: YOUTUBE_API_KEY
   Value: [Your YouTube Data API v3 Key]
   Environments: Production, Preview, Development
   ```

### Step 2: Get a Valid YouTube API Key
If your current key is invalid, create a new one:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. **Important**: Do NOT add any restrictions (HTTP referrers, IP addresses, or API restrictions)
   - For production, you can add IP restrictions later (Vercel's IP ranges)
6. Copy the API key

### Step 3: Update Vercel Environment Variable
1. In Vercel dashboard, update `YOUTUBE_API_KEY` with the new key
2. Redeploy your app (Vercel will auto-deploy on next push, or manually trigger)

### Step 4: Verify Backend URL
Make sure your `.env` file has the correct Vercel URL:
```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app
```

### Step 5: Test the App
1. Rebuild your app: `bun start` or rebuild for TestFlight
2. Open the app and check if YouTube videos load
3. Check the diagnostic page: `/diagnostic` route

## Architecture

### Before (❌ Insecure)
```
React Native App → YouTube API (with EXPO_PUBLIC_YOUTUBE_API_KEY)
```

### After (✅ Secure)
```
React Native App → Vercel Backend → YouTube API (with YOUTUBE_API_KEY)
```

## Benefits
1. ✅ **Secure**: API key is never exposed to clients
2. ✅ **Reliable**: Backend can handle rate limiting and caching
3. ✅ **Flexible**: Easy to add features like caching, analytics, etc.
4. ✅ **Production Ready**: Works on all platforms (iOS, Android, Web)

## Troubleshooting

### If YouTube videos still don't load:

1. **Check Vercel Environment Variables**
   ```bash
   # Visit your Vercel dashboard
   https://vercel.com/[your-username]/motivation-hub/settings/environment-variables
   ```

2. **Test Backend Directly**
   ```bash
   curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
     -H "Content-Type: application/json" \
     -d '{"limit": 5}'
   ```

3. **Check Vercel Logs**
   - Go to Vercel dashboard → Your project → Deployments
   - Click on the latest deployment → View Function Logs
   - Look for YouTube API errors

4. **Verify API Key**
   - Make sure the YouTube Data API v3 is enabled in Google Cloud Console
   - Make sure the API key has no restrictions (or correct restrictions)
   - Test the key directly:
     ```bash
     curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=motivation&type=video&maxResults=1&key=YOUR_API_KEY"
     ```

## Next Steps

1. ✅ Set `YOUTUBE_API_KEY` in Vercel environment variables
2. ✅ Redeploy your Vercel backend
3. ✅ Rebuild your React Native app
4. ✅ Test on TestFlight

## Security Notes

- ✅ Never commit API keys to git
- ✅ Never use `EXPO_PUBLIC_` prefix for API keys
- ✅ Always use backend for API calls that require keys
- ✅ Use environment variables for all sensitive data
