# YouTube Playback Fix Guide

## Issue
Speeches are not playing because YouTube videos have embedding restrictions (error codes 101, 150, 153).

## Root Cause
The app is using YouTube's IFrame API to play videos, but many YouTube videos restrict embedding even when the API returns them with `videoEmbeddable: true`. This happens because:

1. Video owners can disable embedding after upload
2. Some videos have regional restrictions
3. Copyright claims can restrict embedding
4. YouTube's API doesn't always reflect real-time embed status

## Solution Steps

### Step 1: Verify YouTube API Key in Vercel

1. Go to your Vercel dashboard: https://vercel.com/
2. Select your project: `motivation-hub-iota`
3. Go to **Settings** → **Environment Variables**
4. Verify that `YOUTUBE_API_KEY` is set
5. If not set, add it:
   - **Key**: `YOUTUBE_API_KEY`
   - **Value**: Your YouTube Data API v3 key from Google Cloud Console
   - **Environments**: Production, Preview, Development

### Step 2: Get YouTube API Key (if needed)

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "YouTube Data API v3"
   - Click **Enable**
4. Create API credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the API key
5. (Optional) Restrict the API key:
   - Click on the created API key
   - Under **API restrictions**, select "Restrict key"
   - Choose "YouTube Data API v3"
   - Save

### Step 3: Redeploy Backend

After setting the environment variable in Vercel:

1. Go to **Deployments** tab in Vercel
2. Click on the latest deployment
3. Click the **⋯** menu → **Redeploy**
4. Wait for deployment to complete

### Step 4: Clear App Cache

Since the app caches content for 7 days:

1. Open the app
2. The speeches should automatically load from the backend with properly embeddable videos
3. If issues persist, you may need to wait for the cache to expire or clear app data

## How the Fix Works

The backend now:
1. ✅ Requests only embeddable videos with `videoEmbeddable: true` parameter
2. ✅ Double-checks `item.status.embeddable === true` before returning videos
3. ✅ Filters out live broadcasts (they can't be embedded)
4. ✅ Filters out private videos
5. ✅ Only returns videos that are confirmed embeddable

## Testing the Fix

### Test 1: Check Backend Health

```bash
curl https://motivation-hub-iota.vercel.app/api/health
```

Expected response should show:
```json
{
  "ok": true,
  "status": "healthy",
  "env": {
    "hasYouTubeKey": true
  }
}
```

If `hasYouTubeKey` is `false`, the YouTube API key is not set in Vercel.

### Test 2: Fetch Videos

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

Expected response:
```json
{
  "videos": [
    {
      "id": "VIDEO_ID",
      "title": "...",
      "embeddable": true
    }
  ]
}
```

## Alternative Solutions (if YouTube embedding continues to fail)

If you continue to have issues with YouTube embedding restrictions:

### Option 1: Use Public Podcast Content
The app can fall back to podcasts from PodcastIndex which don't have embedding restrictions.

### Option 2: Use Audio Extraction Service
Implement a service to extract audio from YouTube videos on your backend. This requires:
- youtube-dl or yt-dlp on your server
- Audio streaming capability
- More complex infrastructure

### Option 3: Host Your Own Content
Upload motivational speeches to a cloud storage service (S3, Cloudflare R2, etc.) and serve them directly.

## Additional Troubleshooting

### Issue: "YouTube API quota exceeded"
- **Solution**: YouTube API has a daily quota of 10,000 units per day
- Each search costs 100 units, each video details request costs 1 unit
- Monitor usage: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
- Consider implementing daily batch fetching instead of real-time searches

### Issue: Videos still show embedding errors
- **Solution**: Some videos may slip through the filters. The app now auto-skips these videos and moves to the next one
- The player will show "This video cannot be embedded. Skipping..." and automatically skip after 1.5 seconds

### Issue: No videos loading at all
- **Solution**: Check Vercel deployment logs for YouTube API errors
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check that API key doesn't have IP/referrer restrictions blocking Vercel servers

## Current Status

✅ Backend improved to filter embeddable videos only
✅ Auto-skip functionality for non-embeddable videos
✅ Better error messages
⚠️ Requires YouTube API key to be set in Vercel

## Need Help?

If you continue to have issues:

1. Check Vercel deployment logs for detailed error messages
2. Test the backend health endpoint to verify YouTube API key is configured
3. Monitor the console logs in the app for specific error messages
4. Consider implementing one of the alternative solutions above
