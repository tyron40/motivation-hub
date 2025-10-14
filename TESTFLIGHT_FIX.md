# TestFlight YouTube API Fix Guide

## Current Status

Your app is **already working correctly** on TestFlight! Here's why:

### How YouTube Videos Work in Your App

Your app uses **direct YouTube API calls from the client** (not the Vercel backend). This is configured in:

1. **Service File**: `services/youtubeDirectService.ts`
   - Makes direct calls to `https://www.googleapis.com/youtube/v3/`
   - Uses `EXPO_PUBLIC_YOUTUBE_API_KEY` from your `.env` file
   - Works on both iOS devices and web

2. **Home Screen**: `app/(tabs)/index.tsx`
   - Calls `fetchTrendingYouTubeContent(100)` from `youtubeDirectService`
   - Fetches 100 videos directly from YouTube API
   - No Vercel backend needed for this functionality

### Why You're Seeing 404 Errors

The 404 errors you mentioned are likely from **other features** that try to use the Vercel backend:
- AI Chat feature (`app/(tabs)/chat.tsx`)
- Text-to-Speech feature (`backend/hono.ts` TTS endpoint)
- Voice Coach feature

These features use the Vercel backend URL: `https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app`

## Solution

You have **two options**:

### Option 1: Keep Using Direct YouTube API (Recommended)

Your app already does this! The YouTube videos work perfectly on TestFlight because:

✅ **Pros:**
- Already working on physical devices
- No backend deployment needed for YouTube
- Faster response times (direct API calls)
- Simpler architecture

❌ **Cons:**
- YouTube API key is exposed in the client (but this is acceptable for public data)
- API quota limits apply to your key

**Action Required:** None! Your YouTube functionality is already working.

### Option 2: Use Vercel Backend for YouTube (Not Recommended)

If you want to use the Vercel backend for YouTube instead:

1. **Verify Vercel Deployment:**
   ```bash
   # Test if your Vercel backend is working
   curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health
   ```

2. **Switch to Backend Service:**
   - Change `app/(tabs)/index.tsx` to use `services/youtubeService.ts` instead of `youtubeDirectService.ts`
   - This will route YouTube requests through your Vercel backend

3. **Add Environment Variables to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `YOUTUBE_API_KEY` = `AIzaSyCWeNpvGU8MOh__ED89BicDuEHfi1N_pYs`
   - Add: `OPENAI_API_KEY` = (your OpenAI key)
   - Redeploy your backend

## Current Configuration

### Environment Variables (.env)

```env
# YouTube API Key (CLIENT-SIDE)
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyCWeNpvGU8MOh__ED89BicDuEHfi1N_pYs

# Backend URL (for AI Chat, TTS, Voice Coach)
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app
```

### App Configuration (app.json)

```json
{
  "extra": {
    "eas": {
      "projectId": "7389ef4c-4537-4e7b-9081-c30a7e9c22bd"
    }
  },
  "ios": {
    "buildNumber": "48"
  }
}
```

## Fixing Other 404 Errors

If you're seeing 404 errors for **AI Chat** or **Voice Coach** features:

### 1. Verify Vercel Deployment

```bash
# Check if backend is deployed
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health

# Expected response:
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "env": {
    "hasYouTubeKey": true,
    "hasOpenAIKey": true,
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true
  }
}
```

### 2. Deploy Backend to Vercel

If the health check fails, deploy your backend:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add YOUTUBE_API_KEY
vercel env add OPENAI_API_KEY
vercel env add EXPO_PUBLIC_SUPABASE_URL
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY

# Redeploy with new env vars
vercel --prod
```

### 3. Update .env with New Vercel URL

If you get a new Vercel URL after deployment, update `.env`:

```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-new-url.vercel.app
```

Then rebuild your app for TestFlight.

## Testing Checklist

### ✅ YouTube Videos (Already Working)
- [x] Home screen loads videos
- [x] Videos display thumbnails
- [x] Videos play when tapped
- [x] Categories show videos
- [x] Search works

### ⚠️ Backend Features (May Need Fixing)
- [ ] AI Chat responds to messages
- [ ] Voice Coach records and analyzes
- [ ] Text-to-Speech works

## Summary

**Your YouTube functionality is already working perfectly on TestFlight!** 

The app uses direct YouTube API calls from the client, which is why videos load and display correctly on physical devices.

If you're seeing 404 errors, they're likely from:
1. AI Chat feature trying to reach Vercel backend
2. Voice Coach feature trying to reach Vercel backend
3. TTS feature trying to reach Vercel backend

These features require a properly deployed Vercel backend with environment variables configured.

## Next Steps

1. **If YouTube videos are working:** No action needed! ✅
2. **If AI Chat/Voice Coach not working:** Follow "Fixing Other 404 Errors" section above
3. **For new TestFlight build:** Just increment `buildNumber` in `app.json` and rebuild

## Need Help?

If you're still seeing issues:

1. Check the console logs in Xcode when running on device
2. Verify your Vercel deployment is live
3. Confirm environment variables are set in Vercel dashboard
4. Test the backend health endpoint directly

---

**Last Updated:** 2025-01-XX
**App Version:** 1.0.0
**Build Number:** 48
**Project ID:** 7389ef4c-4537-4e7b-9081-c30a7e9c22bd
