# App Store Response - Guideline 5.2.3 (YouTube Content)

## Response to Submit in App Store Connect

Copy and paste this response in the **App Store Connect → Resolution Center**:

---

Hello App Review Team,

Thank you for your review and the opportunity to clarify our use of YouTube content.

**Motivation Hub** integrates motivational and educational videos using the **official YouTube Data API v3**. All content is fetched and played **directly from YouTube's official embedded player**. Our app fully complies with the [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service).

### Key Compliance Points:

1. **No Content Download or Storage**
   - The app does **not** download, cache, or store any YouTube videos or audio files
   - All playback is streaming-only through YouTube's official embed player
   - No offline video playback is available

2. **Official API Usage**
   - We use YouTube Data API v3 with a registered API key
   - API endpoints: `search.list` and `videos.list` for metadata only
   - API key is stored securely on our Vercel backend (not exposed in client code)

3. **Official Embed Player**
   - All videos are displayed using YouTube's official embed URLs (`https://www.youtube-nocookie.com/embed/`)
   - YouTube branding, controls, and attribution remain visible and unmodified
   - Users have full access to YouTube's native player controls

4. **No Content Redistribution**
   - We do not extract, modify, or redistribute video/audio content
   - We do not overlay, obscure, or hide YouTube branding or ads
   - All content attribution (channel name, video title, thumbnail) is preserved exactly as provided by YouTube's API

5. **Privacy & Security**
   - Privacy-enhanced YouTube domain (`youtube-nocookie.com`) is used
   - No user viewing data is collected or shared
   - API key is never exposed to client-side code

### Technical Implementation:

**Backend (Vercel/Hono):**
- `/api/youtube/category` - Fetch video metadata by category
- `/api/youtube/search` - Search videos by keyword
- All API calls are server-side with secure key storage

**Frontend (React Native + Expo):**
- WebView components load YouTube's official embed player
- No video downloading or caching libraries are used
- Verified: No `expo-media-library`, `expo-file-system`, `downloadAsync`, or offline storage

### Attached Documentation:

We have prepared a signed compliance statement (`YOUTUBE_API_COMPLIANCE.md`) that includes:
- Full technical implementation details
- API usage documentation
- Developer declaration of compliance
- Code repository verification

We respectfully request a re-evaluation of our submission. Our app serves as a discovery and motivation tool that connects users to inspirational YouTube content while fully respecting YouTube's Terms of Service and content creators' rights.

Thank you for your time and guidance.

Kind regards,  
**Tyron Montavis Torance Roberts**  
Founder, TyroTech  
Motivation Hub

---

## How to Submit This Response

1. **Go to App Store Connect** → Your App → Version → App Review

2. **In the Resolution Center**, click "Reply to App Review"

3. **Paste the response above** in the message field

4. **Attach the compliance document:**
   - Click "Add Attachment"
   - Upload `YOUTUBE_API_COMPLIANCE.md` (located in your project root)
   - Alternative: Copy the content and paste as plain text in the reply

5. **Submit your response** and wait for re-review

---

## Additional Notes

- The compliance document (`YOUTUBE_API_COMPLIANCE.md`) is ready in your project root
- All technical claims in the response are verified and accurate
- No code changes are required - your app is already compliant
- The rejection appears to be a clarification request rather than a violation

---

**Last Updated:** October 21, 2025  
**Prepared by:** Rork AI Assistant
