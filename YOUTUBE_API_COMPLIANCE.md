# YouTube API Compliance Statement

**App Name:** Motivation Hub  
**Developer:** TyroTech (Tyron Montavis Torance Roberts)  
**App Version:** 1.0  
**Bundle Identifier:** app.rork.motivational-speech-app  
**API Used:** YouTube Data API v3  
**Purpose:** The app integrates motivational and educational video content using YouTube's official API for discovery and playback.

---

## Compliance Confirmation

This application fully complies with the YouTube API Services Terms of Service and Developer Policies. Below are the specific compliance measures implemented:

### 1. **Official YouTube Player Usage Only**
- All YouTube videos are **embedded directly** from YouTube using the official YouTube iFrame Player API.
- We use `react-native-webview` to render YouTube's official embed player at `https://www.youtube.com/embed/{videoId}`.
- **NO custom video players** are used for YouTube content.
- **NO third-party video player libraries** handle YouTube playback.

### 2. **No Downloads, Caching, or Redistribution**
- The app **does not download** any YouTube video or audio content to local storage.
- The app **does not cache** YouTube media files offline.
- The app **does not redistribute** YouTube content outside of the official player.
- All playback is **streamed directly** from YouTube's servers through the official player.
- Users **cannot** save videos for offline viewing.

### 3. **YouTube Terms of Service Compliance**
- Playback is handled entirely via YouTube's embedded player in full compliance with the [YouTube Terms of Service](https://www.youtube.com/t/terms) and [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service).
- The app does **not** modify, overlay, or obscure YouTube branding, logos, or advertisements.
- YouTube's standard controls (play, pause, volume, fullscreen) are fully available to users.
- The app **does not** attempt to block or skip YouTube advertisements.

### 4. **Official API Endpoints Only**
- The app uses **only** the following official YouTube Data API v3 endpoints:
  - `youtube.googleapis.com/youtube/v3/videos` (videos.list)
  - `youtube.googleapis.com/youtube/v3/search` (search.list)
  - `youtube.googleapis.com/youtube/v3/playlistItems` (playlistItems.list)
- All API requests include a registered API key linked to TyroTech's Google Developer Console account.
- **NO scraping, undocumented APIs, or reverse-engineered endpoints** are used.

### 5. **Metadata Usage Only**
- The app fetches **only metadata** from the YouTube API, including:
  - Video ID, title, description
  - Channel name and ID
  - Thumbnail URLs
  - View count, like count, duration
  - Published date and tags
- The app **does not** access or attempt to extract direct video stream URLs.

### 6. **No Monetization of YouTube Content**
- **YouTube content is and will always remain FREE** in this app.
- In-app purchases (credits and premium subscriptions) apply **ONLY to AI features**, including:
  - AI chat messages with the motivational coach
  - Text-to-speech (TTS) voice generation
  - Premium AI voice options
  - Higher usage limits for AI features
- **Purchases do NOT:**
  - Unlock access to YouTube videos
  - Remove or skip YouTube ads
  - Provide ad-free YouTube playback
  - Grant premium YouTube features
  - Gate, alter, or enhance YouTube content in any way

### 7. **Clear User Communication**
- The paywall UI prominently displays the disclaimer:
  > "Purchases apply only to AI features (chat credits, premium voices, higher usage limits). YouTube videos are provided by YouTube and remain free; purchases do not unlock or alter YouTube content."
- Every video card includes the attribution: **"Source: YouTube"**
- First-launch modal links users to the YouTube API Services ToS and the app's Privacy Policy.

### 8. **No Background Audio for YouTube Content**
- The app does **not** enable background audio playback for YouTube videos in a way that circumvents YouTube Premium.
- Background audio is **only available** for non-YouTube content (motivational audio tracks uploaded to the app's own backend).
- The `UIBackgroundModes: ["audio"]` permission in `Info.plist` is used **exclusively** for the app's native audio player, not for YouTube content.

### 9. **No Picture-in-Picture (PiP) for YouTube**
- The app does **not** enable Picture-in-Picture mode for YouTube videos unless the user has YouTube Premium (which is YouTube's own feature).
- Standard YouTube embed player behavior is preserved.

### 10. **Compliance Guard Module**
- The app includes a `YouTubeCompliance` module (`lib/youtube-compliance.ts`) that:
  - Validates all player URLs to ensure they are official YouTube domains
  - Blocks any download/caching operations at build-time and runtime
  - Enforces metadata-only usage
  - Prevents monetization of YouTube content
  - Logs all compliance checks for audit purposes

---

## API Key and Project Information

**Google Cloud Console Project:** TyroTech Motivation Hub  
**Google Cloud Console Project ID:** [Insert your project ID here]  
**YouTube Data API v3 Key:** Securely stored on Vercel backend environment variables (`YOUTUBE_API_KEY`)  
**API Key Restrictions:**
- HTTP referrers: `*.vercel.app`, `rork.com`, `*.rork.com`
- API restrictions: YouTube Data API v3 only
- Daily quota limit: 10,000 units (monitored and rate-limited on backend)

---

## Rate Limiting and Quota Management

- The backend (`/api/trpc/content.*`) proxies all YouTube API requests.
- Rate limiting is enforced to prevent quota exhaustion.
- Responses are cached (metadata only) to reduce API calls.
- Users are never exposed to the API key (server-side only).

---

## Privacy and Data Handling

- The app does **not** store YouTube user credentials.
- The app does **not** access YouTube user accounts or authentication.
- The app fetches **only public video metadata** from the YouTube Data API.
- User watch history is **not tracked** by our app (YouTube's own analytics apply).
- See full privacy policy at: [https://rork.com/privacy](https://rork.com/privacy)

---

## Declaration

I, **Tyron Montavis Torance Roberts**, founder of TyroTech, confirm that the Motivation Hub application:
1. Fully complies with the YouTube API Services Terms of Service.
2. Uses YouTube content exclusively through official, approved methods.
3. Does not download, cache, modify, or redistribute YouTube videos or audio.
4. Does not monetize, paywall, or gate YouTube content in any form.
5. Implements technical safeguards to prevent ToS violations.
6. Will maintain compliance in all future updates.

Any violation of these terms will result in immediate corrective action, including removal of YouTube integration if required by Google/YouTube.

---

**Signature:**  
Tyron Montavis Torance Roberts  
Founder, TyroTech  
**Date:** October 24, 2025

---

## Contact Information

**Developer:** Tyron Montavis Torance Roberts  
**Email:** [Your Contact Email]  
**Support URL:** https://rork.com/support  
**App Store Connect Team ID:** [Your Team ID]

---

## Appendix: Technical Implementation Details

### YouTube Player Implementation
```typescript
// components/YouTubeEmbed.tsx
<WebView
  source={{
    uri: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
  }}
  allowsFullscreenVideo={true}
  mediaPlaybackRequiresUserAction={false}
/>
```

### API Request Example
```typescript
// backend/trpc/routes/content/youtube-fetch.ts
const response = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${API_KEY}`
);
```

### Compliance Guard Example
```typescript
// lib/youtube-compliance.ts
YouTubeCompliance.validatePlayerUrl(url);
YouTubeCompliance.assertNoDownload('playVideo');
YouTubeCompliance.assertNoMonetization('videoPlayback');
```

---

**End of Compliance Statement**
