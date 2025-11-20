# Quick Fix: Speeches Not Playing

## Problem
Speeches are not playing because:
1. YouTube videos have embedding restrictions (error code 153)
2. YouTube API key may not be configured in Vercel

## Solution (3 Steps)

### Step 1: Set YouTube API Key in Vercel ⚠️ REQUIRED

1. Open your Vercel dashboard: https://vercel.com/
2. Go to your project: `motivation-hub-iota`
3. Navigate to **Settings** → **Environment Variables**
4. Add or verify `YOUTUBE_API_KEY`:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your YouTube Data API v3 key
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

**Don't have a YouTube API key?**
- Go to: https://console.cloud.google.com/apis/credentials
- Create a new API key
- Enable "YouTube Data API v3"
- Copy the key and paste it in Vercel

### Step 2: Redeploy Your Vercel Backend

1. In Vercel dashboard, go to **Deployments** tab
2. Click on the latest deployment
3. Click **⋯** menu → **Redeploy**
4. ✅ Wait for deployment to complete (usually 1-2 minutes)

### Step 3: Test in the App

1. Open your app
2. Go to Settings → **Diagnostics**
3. Tap **Run Diagnostics**
4. Look for:
   - ✅ YouTube API (via Backend) should be green
   - ✅ Vercel Health Check should be green

If both are green:
- Go back to home screen
- Pull down to refresh
- Speeches should now load and play!

## What Was Fixed

### Backend Improvements (Already Done ✅)
1. ✅ Added stricter filtering for embeddable videos only
2. ✅ Filter out live broadcasts (can't be embedded)
3. ✅ Double-check embeddable status before returning videos
4. ✅ Auto-skip non-embeddable videos with clear error messages

### How It Works Now
```
User opens app
  ↓
App requests speeches from Vercel backend
  ↓
Backend calls YouTube API with filters:
  - videoEmbeddable: true
  - videoSyndicated: true
  - status.embeddable === true
  ↓
Backend returns ONLY embeddable videos
  ↓
App plays videos using YouTube IFrame API
  ↓
If video fails to embed (rare):
  - Shows "This video cannot be embedded"
  - Auto-skips to next video after 1.5 seconds
```

## Troubleshooting

### Issue: "YouTube API key not configured"
**Fix**: Complete Step 1 above

### Issue: Still showing embedding errors
**Reason**: Some videos may still slip through YouTube's API filters
**Fix**: App will auto-skip these videos (already implemented)

### Issue: No videos loading at all
**Check**:
1. Vercel deployment logs: https://vercel.com/your-project/logs
2. YouTube API quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
3. YouTube Data API v3 is enabled: https://console.cloud.google.com/apis/library/youtube.googleapis.com

### Issue: Diagnostics shows YouTube API failed
**Common causes**:
- YouTube API key not set in Vercel ← Most common
- YouTube Data API v3 not enabled in Google Cloud
- API key has restrictions blocking Vercel servers
- Daily quota exceeded (10,000 units/day)

## Verify It's Working

### Test 1: Check Backend
Open in browser: `https://motivation-hub-iota.vercel.app/api/health`

Should see:
```json
{
  "ok": true,
  "env": {
    "hasYouTubeKey": true  ← Should be true!
  }
}
```

### Test 2: Fetch Videos
```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

Should return 5 embeddable videos with `"embeddable": true`

### Test 3: In App
1. Go to Diagnostics screen
2. Run diagnostics
3. All checks should be ✅ green

## Alternative: Use Mock Data

If you can't set up YouTube API right now, the app has 4000+ embedded mock speeches that work without the API. They'll load automatically if the YouTube API fails.

## Need Help?

1. Check the `YOUTUBE_PLAYBACK_FIX_GUIDE.md` for detailed troubleshooting
2. Check Vercel deployment logs for specific error messages
3. Ensure your YouTube API key is valid and has the YouTube Data API v3 enabled

---

**TL;DR**: Set `YOUTUBE_API_KEY` in Vercel environment variables → Redeploy → Test in app. That's it! 🎉
