# YouTube API Playback - Working Configuration Guide

## Current Setup (Already Configured) ✅

Your app is **ALREADY PROPERLY CONFIGURED** to play YouTube videos! Here's how it works:

### 1. Backend YouTube API (backend/hono.ts)
- ✅ Fetches videos from YouTube Data API v3
- ✅ Filters for embeddable, public videos
- ✅ Routes: `/api/youtube/category`, `/api/youtube/search`, `/api/youtube/trending`
- ✅ Includes proper error handling and caching

### 2. Frontend (services/contentService.ts)
- ✅ Calls your Vercel backend at `https://motivation-hub-iota.vercel.app/api/youtube/*`
- ✅ Converts YouTube videos to Speech objects with `youtubeId` field
- ✅ Caches content for offline use (7 days)

### 3. Audio Player (components/AudioOnlyVideoPlayer.tsx)
- ✅ Uses YouTube IFrame API through WebView
- ✅ Plays YouTube audio without showing video (hidden player)
- ✅ Handles play/pause, seek, progress tracking
- ✅ Auto-skips videos that can't be embedded (errors 101, 150, 153)
- ✅ Shows proper error messages and retry logic

### 4. Player Page (app/player.tsx)
- ✅ Uses AudioOnlyVideoPlayer for speeches with `youtubeId`
- ✅ Handles next/previous navigation
- ✅ Shows beautiful UI with thumbnails and controls

## What You Need to Do

### 1. Set YouTube API Key in Vercel (CRITICAL)

Your backend needs a valid YouTube API key:

```bash
# In Vercel Dashboard → Your Project → Settings → Environment Variables
YOUTUBE_API_KEY=your_actual_api_key_here
```

**How to get an API key:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create or select a project
3. Click "Create Credentials" → "API Key"
4. **IMPORTANT**: Enable "YouTube Data API v3" in your project
5. Copy the API key and add it to Vercel environment variables
6. Redeploy your Vercel backend after adding the key

### 2. Verify Backend is Working

Test your backend endpoints:

```bash
# Test category endpoint
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/category \
  -H "Content-Type: application/json" \
  -d '{"category":"motivation","limit":5}'

# Test search endpoint
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/search \
  -H "Content-Type: application/json" \
  -d '{"query":"motivational speech","limit":5}'

# Test trending endpoint
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'
```

Expected response:
```json
{
  "videos": [
    {
      "id": "VIDEO_ID",
      "title": "Video Title",
      "description": "Description",
      "thumbnail": "https://...",
      "channelTitle": "Channel Name",
      "duration": 300,
      "viewCount": 10000,
      ...
    }
  ]
}
```

## How It Actually Works

1. **App starts** → Loads trending YouTube videos via `fetchTrendingContent()`
2. **User selects speech** → `setCurrentSpeech()` is called
3. **Player page opens** → Checks if speech has `youtubeId`
4. **If youtubeId exists** → Uses `AudioOnlyVideoPlayer` component
5. **AudioOnlyVideoPlayer**:
   - Creates hidden WebView with YouTube IFrame API
   - Loads video: `https://www.youtube.com/embed/${videoId}`
   - Plays audio through WebView
   - Sends playback updates (time, duration, state) to React Native
   - Handles errors (embedding restrictions, video unavailable, etc.)
6. **If embedding error (101, 150, 153)** → Auto-skips to next video after 1.5s

## Common Issues & Solutions

### Issue: "This video cannot be embedded"

**Cause:** YouTube video has embedding restrictions (privacy settings, copyright, regional restrictions)

**Solution:** This is normal! The app automatically skips these videos. The backend tries to filter them out, but YouTube's API doesn't always report embedding status accurately.

**What the app does:**
- Shows error message: "This video cannot be embedded. Skipping..."
- Auto-skips to next video after 1.5 seconds
- User can also manually press "Skip" button

### Issue: "Speeches not playing"

**Possible causes:**
1. YouTube API key not set in Vercel → Check environment variables
2. API key quota exceeded → Check: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
3. YouTube Data API v3 not enabled → Enable it in Google Cloud Console
4. Backend not deployed → Redeploy Vercel backend

**Debugging:**
```typescript
// Check console logs in your app:
// You should see:
console.log('📺 Fetching YouTube content via Vercel backend for: motivation');
console.log('✅ Fetched X videos from backend');
console.log('🎵 Initializing AudioOnlyVideoPlayer for video: VIDEO_ID');
console.log('✅ Player ready, duration: 300');
console.log('▶️ Playback started successfully');
```

### Issue: "Using mock data / No videos found"

**Cause:** Backend API is failing, app falls back to mock data

**Solution:**
1. Check backend logs in Vercel dashboard
2. Verify YouTube API key is correct
3. Test backend endpoints manually (see commands above)
4. Check YouTube API quota isn't exceeded

## API Quota Management

YouTube Data API v3 has a daily quota limit (usually 10,000 units/day):
- Search: 100 units per request
- Video details: 1 unit per request
- Your daily usage: ~102 units per API call (search + details)

**Quota limit:** ~98 API calls per day

**How the app manages this:**
- ✅ Caches responses for 30 minutes (in-memory)
- ✅ Caches responses for 7 days (AsyncStorage)
- ✅ Rotates search queries daily (different content each day)
- ✅ Filters out non-embeddable videos to reduce wasted calls

## Testing Your Setup

### 1. Clear app cache and test fresh fetch:
```typescript
// In your app, add a button to test:
import { clearContentCache } from '@/services/contentService';

// On button press:
await clearContentCache();
await loadTrendingContent(false); // force refresh
```

### 2. Check backend health:
```bash
curl https://motivation-hub-iota.vercel.app/api/health
```

### 3. Monitor console logs:
Open the app and watch the console. You should see:
```
📺 Initializing app with YouTube API speeches...
📈 Fetching trending YouTube content via Vercel backend
🔗 API URL: https://motivation-hub-iota.vercel.app/api/youtube/trending
✅ Fetched 20 videos from backend
✅ Loaded 20 valid YouTube speeches from API
```

## Why This is Better Than Other Approaches

❌ **Direct YouTube audio extraction** → Violates YouTube ToS, requires server-side processing
❌ **Third-party YouTube downloaders** → Unreliable, often blocked, legal issues
❌ **YouTube video embedding** → Shows video player (you don't want this)
✅ **Hidden YouTube IFrame player** → Legal, reliable, plays audio only, proper attribution

## Summary

Your app is already correctly configured! The only thing you need to do is:

1. **Add YouTube API key to Vercel environment variables**
2. **Redeploy your backend**
3. **Test the endpoints**

That's it! The speeches should then play perfectly. Some videos will still fail due to embedding restrictions, but the app handles this gracefully by auto-skipping.

## Environment Variables Checklist

Make sure these are set in Vercel:

```bash
# Required for YouTube API
YOUTUBE_API_KEY=your_actual_api_key_here

# Optional (for other features)
OPENAI_API_KEY=... # For TTS and chat
EXPO_PUBLIC_SUPABASE_URL=... # For user data
EXPO_PUBLIC_SUPABASE_ANON_KEY=... # For user data
```

After setting environment variables, redeploy:
```bash
# In Vercel Dashboard → Deployments → Redeploy latest
# OR
vercel --prod
```
