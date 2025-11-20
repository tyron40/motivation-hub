# YouTube API Compliance Note

## Current Status
Your app is fetching YouTube video metadata through your Vercel backend API, which is compliant with YouTube's Terms of Service.

## Important: YouTube Playback Restrictions

**YouTube does NOT allow:**
- Extracting audio-only streams from videos
- Playing YouTube content outside of an official YouTube player
- Embedding videos that have embedding disabled by the creator

**What Your App Should Do:**
1. ✅ Display video information (title, thumbnail, description, channel)
2. ✅ Show YouTube branding and attribution
3. ✅ When user taps "Play", open the video in:
   - YouTube app (if installed)
   - YouTube website in browser
   - Or use the official YouTube embedded player (respecting embed restrictions)

## Current Implementation

Your backend (`backend/hono.ts`) correctly:
- ✅ Uses YouTube Data API v3 to fetch video metadata
- ✅ Filters out non-embeddable videos
- ✅ Caches results to reduce API quota usage
- ✅ Returns proper video information

## What Needs to Change

The app currently tries to:
- ❌ Play audio from YouTube videos using WebView with IFrame API
- ❌ This fails for videos with embedding disabled (Error 101, 150, 153)

**Recommended Fix:**
Replace `AudioOnlyVideoPlayer` component with a proper YouTube video link that:
1. Shows video thumbnail and info
2. Has a "Watch on YouTube" button
3. Opens the video in YouTube app or browser when clicked

This approach is:
- ✅ Compliant with YouTube TOS
- ✅ Better user experience (official YouTube player)
- ✅ No embedding errors
- ✅ Respects content creator's embedding preferences

## Implementation Options

### Option 1: Open in YouTube App/Browser (Recommended for App Store)
```typescript
import { Linking } from 'react-native';

const openYouTubeVideo = (videoId: string) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  Linking.openURL(youtubeUrl);
};
```

### Option 2: Use Official YouTube Player (with proper fallback)
Keep current WebView approach but:
- Handle embedding errors gracefully
- Show "Watch on YouTube" button when embedding fails
- Always display YouTube branding

## Alternative: Use Different Content Source

If you want true audio-only playback, consider:
- Podcasts (via PodcastIndex API or similar)
- Licensed audio content
- User-uploaded content to your own storage
- Audio books or audiobook APIs

Your app already has mocks for speeches (`mocks/youtube-speeches.ts`) which could be replaced with actual audio files or podcast content.
