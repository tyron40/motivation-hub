# YouTube API Setup Guide

## 🎥 Issue
Your videos are not playing because the YouTube API key is missing from your environment variables.

## ✅ Solution

### Step 1: Get Your YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable **YouTube Data API v3**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create API credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your new API key
5. (Optional but recommended) Restrict your API key:
   - Click on the API key you just created
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Save

### Step 2: Add API Key to Your Local Environment

1. Open your `.env` file
2. Replace `your_youtube_api_key_here` with your actual API key:
   ```
   YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. Save the file
4. Restart your development server

### Step 3: Add API Key to Vercel (Production)

This is **CRITICAL** - your backend runs on Vercel and needs the API key:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `motivation-hub-iota`
3. Go to Settings → Environment Variables
4. Add a new variable:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your YouTube API key
   - **Environments**: Select all (Production, Preview, Development)
5. Click "Save"
6. **Redeploy your application** for changes to take effect:
   - Go to "Deployments" tab
   - Click the three dots on the latest deployment
   - Click "Redeploy"

### Step 4: Verify Setup

After redeploying, test your backend:

1. Open: https://motivation-hub-iota.vercel.app/api/health
2. Check that `hasYouTubeKey: true` in the response
3. If false, double-check your Vercel environment variable

## 🔄 How It Works

```
Mobile App → Vercel Backend (/api/youtube/*) → YouTube API → Videos
```

Your app makes requests to:
- `https://motivation-hub-iota.vercel.app/api/youtube/category`
- `https://motivation-hub-iota.vercel.app/api/youtube/search`
- `https://motivation-hub-iota.vercel.app/api/youtube/trending`

Your Vercel backend uses your YouTube API key to fetch videos from YouTube, then sends them to your app.

## 🎯 What Will Work After Setup

✅ Video browsing by category
✅ Video search
✅ Trending videos
✅ Video playback
✅ Audio-only mode

## 💰 API Quota Information

YouTube Data API v3 has a daily quota limit:
- **Free tier**: 10,000 units/day
- **Search query**: ~100 units
- **Video details**: ~1-5 units

Your app caches results for 12 hours to minimize API usage.

## ⚠️ Common Issues

### Issue: "YouTube API key not configured"
**Solution**: Make sure you added the key to Vercel and redeployed

### Issue: "403 Forbidden" or "API key invalid"
**Solution**: 
- Check that YouTube Data API v3 is enabled
- Verify the API key is correct
- Check API key restrictions (if any)

### Issue: "Quota exceeded"
**Solution**: 
- Wait 24 hours for quota to reset
- Or upgrade your Google Cloud project
- Or implement longer caching (increase CACHE_DURATION in backend/hono.ts)

### Issue: Videos still not loading after setup
**Solution**:
1. Check Vercel logs for errors
2. Verify the API key is set: https://motivation-hub-iota.vercel.app/api/health
3. Clear your app cache and restart
4. Check browser console for errors

## 📝 Testing

After setup, test by:
1. Opening the Videos tab in your app
2. Trying different categories
3. Searching for motivational content
4. Playing a video

## 🔒 Security Notes

- Never commit your API key to Git
- The `.env` file is in `.gitignore`
- Store the key securely in Vercel environment variables
- Consider setting up API key restrictions in Google Cloud Console

## 🆘 Need Help?

If videos still aren't loading:
1. Check Vercel deployment logs
2. Visit https://motivation-hub-iota.vercel.app/api/health
3. Check browser console for error messages
4. Verify your YouTube API key quota isn't exceeded
