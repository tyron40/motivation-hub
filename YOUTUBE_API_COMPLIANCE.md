# YouTube API Compliance Statement

**App Name:** Motivation Hub  
**Developer:** TyroTech (Tyron Montavis Torance Roberts)  
**App Version:** 1.0  
**Bundle Identifier:** app.rork.motivational-speech-app  
**API Used:** YouTube Data API v3  
**Purpose:** The app integrates motivational and educational video content using YouTube's official API for discovery and playback.

---

## Compliance Confirmation

This document confirms that **Motivation Hub** fully complies with the [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service).

### 1. Official YouTube API Integration

- All YouTube videos are **embedded directly** from YouTube using official APIs and embed players
- The app uses YouTube Data API v3 endpoints:
  - `search.list` - For discovering motivational videos by category
  - `videos.list` - For fetching video metadata (title, description, thumbnail, duration, view count)
- All API requests are authenticated with our registered YouTube Data API v3 key
- API key is stored securely on our Vercel backend (not exposed in client code)

### 2. No Unauthorized Content Access

- The app **does not download**, **store**, or **redistribute** YouTube video or audio content
- The app **does not cache** videos for offline playback
- The app **does not extract** audio streams from YouTube videos
- The app **does not modify**, **overlay**, or **obscure** YouTube branding, player controls, or advertisements
- All playback is handled entirely via YouTube's official embedded player (`https://www.youtube-nocookie.com/embed/`)

### 3. Playback Implementation

- Videos are played using **WebView** components that load YouTube's official embed URLs
- The embed URLs use YouTube's privacy-enhanced domain (`youtube-nocookie.com`)
- All embed parameters are compliant with YouTube's terms:
  - `controls=1` - YouTube controls are visible and functional
  - `modestbranding=1` - Minimal YouTube branding while maintaining attribution
  - `rel=0` - Related videos are limited to same channel (when possible)
  - `enablejsapi=1` - YouTube's JavaScript API is enabled
  - `fs=1` - Fullscreen is available to users

### 4. User Experience

- Users can view motivational videos organized by categories (Motivation, Success, Mindset, Inspiration, etc.)
- When a user taps a video, it opens YouTube's embedded player
- Users can control playback using YouTube's native player controls
- Users can open videos in the YouTube app or website via standard YouTube sharing
- No attempt is made to prevent users from accessing YouTube directly

### 5. Content Attribution

- All video titles, descriptions, channel names, and thumbnails are displayed as returned by the YouTube API
- Channel attribution is clearly visible on all video cards and player screens
- YouTube branding and logos are not removed or hidden
- Users can identify content as coming from YouTube at all times

### 6. API Usage Limits

- Our API requests respect YouTube's quota limits
- We implement request caching (30 minutes) to minimize redundant API calls
- We handle API errors gracefully and provide fallback content when quota is exceeded
- We do not attempt to circumvent rate limits or quotas

### 7. Privacy & Security

- API key is stored as an environment variable on our secure Vercel backend
- Client-side code never exposes the YouTube API key
- User viewing data is not collected or shared with third parties
- Privacy-enhanced YouTube domain (`youtube-nocookie.com`) is used for embeds

---

## Technical Implementation Details

**Backend API Routes (Vercel/Hono):**
- `/api/youtube/category` - Fetch videos by motivational category
- `/api/youtube/search` - Search for videos by keyword
- `/api/youtube/trending` - Fetch trending motivational content

**Frontend Implementation:**
- `YouTubeEmbed.tsx` - WebView-based YouTube embed player component
- `VideoPlayer.tsx` - Video player wrapper
- `youtubeService.ts` - API integration service (calls Vercel backend)
- `youtubeDirectService.ts` - Direct YouTube Data API v3 integration

**YouTube API Endpoints Used:**
```
GET https://www.googleapis.com/youtube/v3/search
GET https://www.googleapis.com/youtube/v3/videos
```

**Embed URLs:**
```
https://www.youtube-nocookie.com/embed/{videoId}?controls=1&modestbranding=1&rel=0
```

---

## Google Cloud Console Project

**Project Name:** TyroTech Motivation Hub  
**Google Cloud Console Project ID:** [Your Project ID]  
**API Key:** Securely stored on Vercel backend (not publicly exposed)  
**API Enabled:** YouTube Data API v3  

---

## Developer Declaration

I, **Tyron Montavis Torance Roberts**, founder of TyroTech, confirm that:

1. This application fully complies with the YouTube API Services Terms of Service
2. No copyrighted or third-party video content is accessed, downloaded, or distributed outside of YouTube's official framework
3. All video playback occurs through YouTube's official embedded player
4. YouTube branding and attribution remain visible and unmodified
5. Users maintain full access to YouTube's native player controls and features
6. The app does not enable offline video playback or content redistribution

I understand that violation of YouTube's Terms of Service may result in API access revocation and app removal from the App Store.

**Signature:**  
Tyron Montavis Torance Roberts  
Founder, TyroTech  

**Date:** October 21, 2025

---

## Supporting Evidence

**Code Repository Structure:**
```
services/
  ├── youtubeService.ts          # YouTube API integration (via Vercel)
  ├── youtubeDirectService.ts    # Direct API v3 calls (for testing)
components/
  ├── YouTubeEmbed.tsx           # Official YouTube embed player
  ├── VideoPlayer.tsx            # Video player wrapper
backend/
  └── hono.ts                    # Vercel API routes (YouTube endpoints)
```

**No Download/Cache Code:**
- Verified: No use of `expo-media-library`, `expo-file-system`, `downloadAsync`, `saveToLibraryAsync`
- Verified: No video caching for offline playback
- Verified: All playback is streaming-only via YouTube's embed player

---

## Contact Information

**Developer:** Tyron Montavis Torance Roberts  
**Company:** TyroTech  
**App:** Motivation Hub  
**Bundle ID:** app.rork.motivational-speech-app  

For any questions regarding our YouTube API implementation or compliance, please contact via App Store Connect.

---

**Last Updated:** October 21, 2025  
**Build Number:** 57
