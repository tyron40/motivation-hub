# YouTube API Setup Complete Guide

## ✅ Current Status

Your app is correctly configured to fetch YouTube videos from your Vercel backend. All the code is in place and working. You just need to configure the YouTube API key.

## 🔑 What You Need To Do

### Step 1: Get Your YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable **YouTube Data API v3**:
   - Go to APIs & Services → Library
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create API credentials:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - Copy the API key

### Step 2: Add API Key to Local Environment

Replace `your_youtube_api_key_here` in your `.env` file with your actual API key:

```env
# .env file
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 3: Add API Key to Vercel

1. Go to your Vercel project: https://motivation-hub-iota.vercel.app
2. Go to Settings → Environment Variables
3. Add a new variable:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your YouTube API key (same as above)
   - **Environments**: Select Production, Preview, and Development
4. Click "Save"
5. Redeploy your project (Vercel will auto-redeploy, or you can trigger manually)

## 🎯 How It Works

### Backend Architecture (Vercel)

Your Vercel backend (`backend/hono.ts`) has these YouTube endpoints:

1. **`POST /api/youtube/category`** - Fetch videos by category (Motivation, Success, etc.)
2. **`POST /api/youtube/search`** - Search YouTube with custom query
3. **`POST /api/youtube/trending`** - Fetch trending motivational videos

### Frontend Architecture

Your app uses these services to fetch videos:

1. **`services/youtubeService.ts`** - Main service that calls Vercel backend
2. **`services/contentService.ts`** - Content management with caching
3. **All API calls go through**: `https://motivation-hub-iota.vercel.app/api/youtube/*`

### Video Playback

Videos are played using:
1. **`components/YouTubeEmbed.tsx`** - WebView-based YouTube player
2. **`components/VideoPlayer.tsx`** - Wrapper component
3. **`app/video-player.tsx`** - Full-screen video player page

## ✨ Features

✅ **Category-based videos** - Fetch videos for Motivation, Success, Mindset, etc.
✅ **Search functionality** - Search YouTube with custom queries
✅ **Trending videos** - Get popular motivational content
✅ **12-hour caching** - Reduces API quota usage
✅ **Fallback videos** - Hardcoded videos if API fails
✅ **Privacy-friendly embeds** - Uses youtube-nocookie.com
✅ **Cross-platform** - Works on iOS, Android, and Web

## 🔄 API Quota Management

YouTube Data API v3 has a daily quota limit (10,000 units by default).

**Quota costs per operation:**
- Search: 100 units
- Video details: 1 unit

**Your app's optimizations:**
- 12-hour server-side caching
- 7-day client-side caching
- Daily rotation of search queries
- Fallback to hardcoded videos

## 🧪 Testing

After adding your API key:

1. **Test backend directly**:
```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

2. **Check health endpoint**:
```bash
curl https://motivation-hub-iota.vercel.app/api/health
```

Should show: `"hasYouTubeKey": true`

3. **Test in app**:
   - Open the Videos tab
   - Videos should load from YouTube API
   - Tap on a video to play it

## 🐛 Troubleshooting

### Videos not loading
- ✅ Check `.env` has correct API key
- ✅ Check Vercel environment variables are set
- ✅ Check YouTube Data API v3 is enabled in Google Cloud
- ✅ Check API quota hasn't been exceeded
- ✅ Check browser console for error messages

### API quota exceeded
- Wait 24 hours for quota to reset
- Or request quota increase from Google
- Or use fallback videos (already implemented)

### Invalid API key error
- Verify the API key is correct (no extra spaces)
- Check if API key has restrictions (IP/domain)
- Make sure YouTube Data API v3 is enabled

## 📱 RevenueCat Configuration

Your RevenueCat public key is already configured:
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_QKJQVBGeYJCnkqLYRVAiGUgHsdY
```

⚠️ **Note**: This is a **production** key. For testing in Rork sandbox, you need to:
1. Use a **Test Store API Key** from RevenueCat
2. Or create a development build

## 🚀 All Done!

Once you add your YouTube API key to both `.env` and Vercel:
1. Videos will load from YouTube API
2. Search will work
3. Trending videos will appear
4. All videos will be playable

Your app architecture is solid and ready for production! 🎉
