# YouTube API 403 Error - Fix Guide

## Problem
You're getting a **YouTube API error: 403** which means the YouTube Data API v3 is rejecting your requests.

## Error Details
```
❌ YouTube API error: 500 {"error":"Failed to fetch YouTube content","details":"YouTube API error: 403"}
```

## Common Causes & Solutions

### 1. ❌ YouTube API Key Not Set in Vercel
**Most likely cause**: The `YOUTUBE_API_KEY` environment variable is not set in your Vercel deployment.

**How to fix**:
1. Go to https://vercel.com/your-username/motivation-hub-iota/settings/environment-variables
2. Click "Add New" and add:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your YouTube API key
   - **Environment**: Production, Preview, Development (select all)
3. Click "Save"
4. **Important**: Redeploy your app for changes to take effect

### 2. ❌ YouTube Data API v3 Not Enabled
Your API key exists but the YouTube Data API v3 service is not enabled in Google Cloud Console.

**How to fix**:
1. Go to https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. Make sure you're in the correct Google Cloud project
3. Click "Enable" if the API is not already enabled
4. Wait a few minutes for the change to propagate

### 3. ❌ Invalid or Restricted API Key
Your API key may have restrictions that block requests from your Vercel server.

**How to fix**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Find your YouTube API key and click on it
3. Check **API restrictions**:
   - Either select "Don't restrict key" (for testing)
   - Or ensure "YouTube Data API v3" is in the allowed APIs list
4. Check **Application restrictions**:
   - Select "None" (for server-side use)
   - Or add your Vercel domain to allowed HTTP referrers
5. Save changes and wait a few minutes

### 4. ❌ API Quota Exceeded
You've exceeded your daily YouTube API quota (default is 10,000 units per day).

**How to check**:
1. Go to https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. Check your current usage
3. Each search uses ~100 units, each video details request uses ~1 unit

**How to fix**:
- Wait until the next day (quota resets at midnight Pacific Time)
- Or request a quota increase from Google (can take several days)
- Or implement caching to reduce API calls (already implemented in the app)

## How to Get a YouTube API Key

If you don't have a YouTube API key yet:

1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Library"
4. Search for "YouTube Data API v3" and enable it
5. Go to "APIs & Services" > "Credentials"
6. Click "Create Credentials" > "API Key"
7. Copy the API key
8. Add it to Vercel environment variables (see Solution 1 above)

## Verify Your Setup

After fixing the issue, you can verify it works by:

1. Check the Vercel deployment logs for YouTube API calls
2. Visit your app's health endpoint: https://motivation-hub-iota.vercel.app/api/health
3. Check that `hasYouTubeKey: true` in the response
4. Try loading videos in your app

## Deployment Checklist

Before deploying, make sure:

- [ ] YouTube Data API v3 is enabled in Google Cloud Console
- [ ] You have a valid YouTube API key
- [ ] The API key has no restrictions (or correct restrictions set)
- [ ] The `YOUTUBE_API_KEY` is set in Vercel environment variables
- [ ] You've redeployed after adding the environment variable
- [ ] The health endpoint shows `hasYouTubeKey: true`

## Still Having Issues?

If you've followed all steps and still see the 403 error:

1. Check Vercel deployment logs for detailed error messages
2. Visit https://motivation-hub-iota.vercel.app/api/health to verify API key is present
3. Try creating a new API key in Google Cloud Console
4. Make sure you're using the correct Vercel project
5. Check that your Google Cloud billing is active (required for API usage)

## Alternative: Use Mock Data Temporarily

If you need to test the app without the YouTube API, the app will automatically fall back to mock data when the API is unavailable. The mock data is defined in `mocks/speeches.ts`.
