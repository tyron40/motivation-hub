# App Store Review Response

**To:** Apple App Review Team  
**From:** Tyron Montavis Torance Roberts, TyroTech  
**App:** Motivation Hub (app.rork.motivational-speech-app)  
**Version:** 1.0 (Build 58)  
**Date:** October 24, 2025

---

## Re: Guideline 5.2.3 - Performance - YouTube API Compliance

Hello App Review Team,

Thank you for your continued feedback on Motivation Hub. I appreciate your diligence in ensuring app quality and compliance.

### Summary of Changes

This submission addresses Guideline 5.2.3 concerns regarding potential unauthorized access to third-party audio/video content. Motivation Hub uses the **official YouTube Data API v3** exclusively for metadata and the **YouTube iFrame Player API** for embedded playback. All content is displayed in full compliance with YouTube's Terms of Service.

### Compliance Measures Implemented

1. **Official YouTube Player Only**
   - All videos are embedded using YouTube's official iFrame Player (`https://www.youtube.com/embed/{videoId}`)
   - No custom video players handle YouTube content
   - YouTube branding, controls, and advertisements are fully preserved

2. **No Downloads or Caching**
   - The app does **not** download any YouTube video or audio files
   - The app does **not** cache YouTube content offline
   - All playback is streamed directly from YouTube's servers
   - Users cannot save videos for offline viewing

3. **Metadata Only**
   - The app fetches only public metadata (title, thumbnail, view count, etc.)
   - No direct video stream URLs are accessed or stored
   - Only approved YouTube Data API v3 endpoints are used:
     - `videos.list`
     - `search.list`
     - `playlistItems.list`

4. **No Monetization of YouTube Content**
   - **YouTube videos are and will always remain FREE** in this app
   - In-app purchases apply **ONLY to AI features** (chat credits, premium voices, usage limits)
   - Purchases do **NOT** unlock YouTube content, remove ads, or alter playback
   - Clear disclaimers are displayed on all purchase screens:
     > "Purchases apply only to AI features (chat credits, premium voices, higher usage limits). YouTube videos are provided by YouTube and remain free; purchases do not unlock or alter YouTube content."

5. **YouTube Attribution**
   - Every video card displays: **"Source: YouTube"**
   - First-launch modal links to YouTube API Services ToS

6. **Technical Safeguards**
   - Implemented `YouTubeCompliance` module that enforces ToS compliance at build-time and runtime
   - Validates all player URLs to ensure official YouTube domains
   - Blocks download/caching operations with runtime assertions
   - Logs all compliance checks for audit purposes

### Documentation Provided

I have attached a signed **YouTube API Compliance Statement** (`YOUTUBE_API_COMPLIANCE.md`) that includes:
- Detailed compliance confirmation for each ToS requirement
- Technical implementation details
- API key and project information
- Developer declaration and signature

The full document is available at:
- Attached to this submission
- In the app's source code repository
- Available for inspection by Apple and Google/YouTube teams

### Official YouTube API Services Terms of Service

Our app fully complies with:
- YouTube Terms of Service: https://www.youtube.com/t/terms
- YouTube API Services ToS: https://developers.google.com/youtube/terms/api-services-terms-of-service
- Google API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy

### Separation of Features

To be absolutely clear:
- **YouTube Content**: Free browsing and playback (no paywalls, no ads removal, no special access)
- **AI Features** (monetized): Chat with motivational coach, text-to-speech voice generation, premium AI voices, higher usage limits

These features are completely separate. Purchasing AI credits or premium subscriptions does **NOT** change the YouTube experience in any way.

### Background Audio Clarification

The `UIBackgroundModes: ["audio"]` permission in `Info.plist` is used **exclusively** for the app's native audio player (motivational audio tracks stored on our backend). It is **NOT** used for YouTube content.

YouTube videos do not play in the background unless the user has YouTube Premium (which is YouTube's own feature, not ours).

### Testing Instructions for Reviewers

1. **Browse YouTube Videos**: Tap any video card → plays in official YouTube player with all YouTube controls visible
2. **Attempt Offline Access**: Turn off internet → videos do not play (no offline caching)
3. **Check Paywall**: Tap "Upgrade" → disclaimer clearly states YouTube content remains free
4. **Check Attribution**: Each video card shows "Source: YouTube"
5. **AI Features (Separate)**: Tap "Chat" tab → AI coach feature (uses OpenAI, not YouTube content)

### Request

I respectfully request a re-evaluation of this submission. Motivation Hub is designed as a **motivational content aggregator** that helps users discover inspiring YouTube videos alongside AI-powered coaching. We take YouTube's ToS very seriously and have implemented comprehensive technical and legal safeguards to ensure full compliance.

If any additional information or clarification is needed, please don't hesitate to reach out.

Thank you for your time and consideration.

---

**Respectfully submitted,**

Tyron Montavis Torance Roberts  
Founder, TyroTech  
Email: [Your Email]  
Support: https://rork.com/support

---

## Attachments

1. `YOUTUBE_API_COMPLIANCE.md` - Signed compliance statement
2. Screenshots showing YouTube attribution and disclaimers
3. Source code snippets demonstrating compliance measures

---

**End of Response**
