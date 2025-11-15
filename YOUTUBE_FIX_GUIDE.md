# YouTube Video Playback Fix Guide

## Problem
Videos showing "Error 153: This video cannot be embedded" when trying to play.

## Solution
The backend now properly filters non-embeddable videos and only returns videos that can be played in your app.

## What Was Fixed

### 1. Backend YouTube API Enhancement
- Added `videoEmbeddable: 'true'` parameter to YouTube search API
- Added `videoSyndicated: 'true'` to ensure videos can be embedded
- Doubled the fetch limit to account for filtered videos
- Enhanced filtering to check multiple embeddable status fields
- Better logging to see which videos are being filtered out

### 2. Caching Improvements
- Videos are cached for 12 hours to reduce API calls
- Cache is properly managed with size limits
- Expired cache is used as fallback if API fails

## Setup Required

### YouTube API Key Configuration

**IMPORTANT**: You need to set your YouTube API key in Vercel environment variables for the videos to work!

#### Step 1: Get Your YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Click "Create Credentials" → "API Key"
4. Copy the API key (it will look like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

#### Step 2: Enable YouTube Data API v3

1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"
4. Wait for it to be enabled (takes a few seconds)

#### Step 3: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add a new variable:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your API key from Step 1
   - **Environments**: Select all (Production, Preview, Development)
4. Click "Save"

#### Step 4: Redeploy

1. Go to "Deployments" in Vercel
2. Click on the latest deployment
3. Click "Redeploy" (or push a new commit to trigger deployment)
4. Wait for deployment to complete

## Verification

### Check if API Key is Configured

Visit your backend health endpoint:
```
https://motivation-hub-iota.vercel.app/api/health
```

Look for:
```json
{
  "env": {
    "hasYouTubeKey": true  // Should be true if configured
  }
}
```

### Test Video Fetching

You can test the YouTube API directly:

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

This should return a list of embeddable videos.

## How It Works

1. **Frontend Request**: App calls your Vercel backend at `/api/youtube/category` or `/api/youtube/search`
2. **Backend Fetches**: Backend uses your YouTube API key to search YouTube
3. **Filtering**: Backend filters out non-embeddable videos using:
   - `videoEmbeddable` search parameter
   - `embeddable` status check in video details
   - `privacyStatus` check (only public videos)
4. **Response**: Only embeddable videos are returned to the app
5. **Caching**: Results are cached for 12 hours to save API quota

## API Quota Limits

YouTube API has daily quotas:
- Default: 10,000 units per day
- Search: 100 units per request
- Video details: 1 unit per request

With caching, you should stay well within limits.

## Troubleshooting

### If videos still don't play:

1. **Check API Key**: Make sure it's set in Vercel and redeployed
2. **Check Logs**: Look at Vercel logs for YouTube API errors
3. **Check Quota**: Visit [Google Cloud Console Quotas](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
4. **Clear Cache**: Wait 12 hours or clear the cache by redeploying

### Common Errors:

- **403 Forbidden**: API key invalid or YouTube Data API v3 not enabled
- **400 Bad Request**: Malformed request (shouldn't happen with this fix)
- **429 Too Many Requests**: Quota exceeded, wait for daily reset

## Testing

After setup, test by:

1. Open the app
2. Navigate to the Videos tab
3. Select a category (e.g., "Motivation")
4. Try playing a video
5. Check console logs for "✅ Successfully fetched X embeddable videos"

All videos should now play without Error 153!
