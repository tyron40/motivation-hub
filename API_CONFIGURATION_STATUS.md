# API Configuration Status

## ✅ Current Status: Your App is Using Vercel Backend Correctly

Your app **IS already configured** to use your Vercel backend directly (not Rork backend tRPC). Here's the current setup:

### Backend Configuration ✅

**Vercel Backend URL:** `https://motivation-hub-iota.vercel.app`

**Environment Variable:** `EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app`

### Available Endpoints ✅

Your Vercel backend (`backend/hono.ts`) provides these endpoints:

1. **Text-to-Speech:** `POST /api/tts`
2. **Chat:** `POST /api/chat`
3. **YouTube - Category:** `POST /api/youtube/category`
4. **YouTube - Search:** `POST /api/youtube/search`
5. **YouTube - Trending:** `POST /api/youtube/trending`

### Services Using Vercel Backend Correctly ✅

1. **`lib/api-client.ts`**
   - ✅ Uses `EXPO_PUBLIC_RORK_API_BASE_URL` from `.env`
   - ✅ Calls `/api/tts` and `/api/chat` directly

2. **`services/youtubeService.ts`**
   - ✅ Uses `EXPO_PUBLIC_RORK_API_BASE_URL` from `.env`
   - ✅ Calls `/api/youtube/category`, `/api/youtube/search`, `/api/youtube/trending`

3. **`services/contentService.ts`**
   - ✅ Uses `EXPO_PUBLIC_RORK_API_BASE_URL` from `.env`
   - ✅ Calls `/api/youtube/category`, `/api/youtube/search`, `/api/youtube/trending`

## ⚠️ Current Issues

### 1. YouTube Video Playback Error (Error 153)

**Error:** "This video cannot be embedded. Skipping..."

**Cause:** Some YouTube videos have embedding disabled by the video owner.

**Solution:** Your backend already filters for embeddable videos (line 413-419 in `backend/hono.ts`), which is correct. The error occurs when:
- Hardcoded fallback video IDs have embedding disabled
- YouTube API returns videos that later become non-embeddable

**Fix Applied:** The backend correctly checks `item.status?.embeddable` and filters non-embeddable videos.

### 2. RevenueCat Configuration Error (Expected in Sandbox)

**Error:** "Invalid API key. The native store is not available when running inside Rork sandbox"

**Status:** ✅ This is **EXPECTED** and **NOT A PROBLEM**

**Explanation:** RevenueCat doesn't work in:
- Rork preview environment
- Expo Go
- Development builds without proper provisioning

**Your Code Already Handles This:** `hooks/iap-context.tsx` lines 94-107 correctly handle the sandbox error and log that IAP will work in production builds.

## 🔧 Configuration Checklist

### Vercel Environment Variables

Make sure these are set in your Vercel project settings:

1. ✅ `EXPO_PUBLIC_SUPABASE_URL` - Set in Vercel (from screenshot)
2. ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Set in Vercel (from screenshot)
3. ✅ `OPENAI_API_KEY` - Set in Vercel (from screenshot)
4. ✅ `EXPO_PUBLIC_YOUTUBE_API_KEY` - Set in Vercel (from screenshot)
5. ⚠️ `YOUTUBE_API_KEY` - Should also be set in Vercel (backend reads this)

**Note:** The backend reads YouTube API key from either:
```typescript
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
```

### Local .env File

Your `.env` file should have:
```bash
# API Configuration (Points to your Vercel backend)
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_QKJQVBGeYJCnkqLYRVAiGUgHsdY

# Toolkit Configuration (for AI features)
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com

# YouTube API Key (optional for local dev, required in Vercel)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## 🎯 What You Need to Do

### 1. Verify YouTube API Key in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify `EXPO_PUBLIC_YOUTUBE_API_KEY` is set with a valid API key
5. Optionally add `YOUTUBE_API_KEY` with the same value (for consistency)

### 2. Test YouTube API

You can test if your YouTube API is working by visiting:

```
https://motivation-hub-iota.vercel.app/api/health
```

This should return:
```json
{
  "ok": true,
  "status": "healthy",
  "env": {
    "hasYouTubeKey": true,
    ...
  }
}
```

If `hasYouTubeKey` is `false`, the API key is not set in Vercel.

### 3. Test YouTube Content Fetch

Test the YouTube category endpoint:

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/category \
  -H "Content-Type: application/json" \
  -d '{"category": "motivation", "limit": 5}'
```

This should return embeddable videos.

## 📝 Summary

**Your app is correctly configured to use your Vercel backend!** 

The only issue is:
1. ⚠️ YouTube video embedding errors (Error 153) - caused by non-embeddable videos
   - Backend already filters these
   - Ensure YouTube API key is set in Vercel
   - The API will return only embeddable videos

2. ℹ️ RevenueCat errors in sandbox - **this is expected and normal**
   - Will work in production builds
   - Already handled correctly in code

## 🚀 Next Steps

1. Verify YouTube API key is set in Vercel environment variables
2. Test the `/api/health` endpoint to confirm API key is detected
3. Test video playback - should work with embeddable videos from API
4. RevenueCat will work automatically in production builds (no action needed)
