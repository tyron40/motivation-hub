# Motivation Hub - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    iOS Device (TestFlight)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Motivation Hub App                        │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  Home Screen (app/(tabs)/index.tsx)              │ │ │
│  │  │  - Loads 100 YouTube videos                      │ │ │
│  │  │  - Uses youtubeDirectService.ts                  │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  AI Chat (app/(tabs)/chat.tsx)                   │ │ │
│  │  │  - Requires Vercel backend                       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  Voice Coach (app/voice-coach.tsx)               │ │ │
│  │  │  - Requires Vercel backend                       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌──────────────────────┐
│  YouTube API      │              │  Vercel Backend      │
│  (googleapis.com) │              │  (motivation-hub...) │
│                   │              │                      │
│  ✅ WORKING       │              │  ⚠️ OPTIONAL         │
│  - Direct calls   │              │  - AI Chat           │
│  - No backend     │              │  - Voice Coach       │
│  - 100 videos     │              │  - TTS               │
│  - Fast response  │              │                      │
└───────────────────┘              └──────────────────────┘
```

## Data Flow

### YouTube Videos (✅ Working)

```
User opens app
    ↓
Home screen loads
    ↓
fetchTrendingYouTubeContent(100)
    ↓
youtubeDirectService.ts
    ↓
Direct HTTPS call to googleapis.com
    ↓
Uses EXPO_PUBLIC_YOUTUBE_API_KEY
    ↓
Returns 100 videos
    ↓
Display on screen
```

**Key Points:**
- ✅ No backend needed
- ✅ Works on TestFlight
- ✅ Fast and reliable
- ✅ Client-side API calls

### AI Chat (⚠️ Requires Backend)

```
User sends message
    ↓
Chat screen
    ↓
POST to /api/chat
    ↓
Vercel Backend (Hono)
    ↓
OpenAI API
    ↓
Response back to app
```

**Key Points:**
- ⚠️ Requires Vercel deployment
- ⚠️ Needs OPENAI_API_KEY in Vercel
- ⚠️ May show 404 if backend not deployed

### Voice Coach (⚠️ Requires Backend)

```
User records voice
    ↓
Voice Coach screen
    ↓
POST to /api/tts
    ↓
Vercel Backend (Hono)
    ↓
OpenAI TTS API
    ↓
Audio response back to app
```

**Key Points:**
- ⚠️ Requires Vercel deployment
- ⚠️ Needs OPENAI_API_KEY in Vercel
- ⚠️ May show 404 if backend not deployed

## File Structure

```
motivation-hub/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          ✅ Uses youtubeDirectService
│   │   ├── chat.tsx           ⚠️ Uses Vercel backend
│   │   ├── profile.tsx        ✅ Local only
│   │   └── scripture.tsx      ✅ Local only
│   ├── player.tsx             ✅ YouTube player
│   ├── voice-coach.tsx        ⚠️ Uses Vercel backend
│   └── diagnostic.tsx         🔧 Tests both APIs
│
├── services/
│   ├── youtubeDirectService.ts    ✅ Direct YouTube API
│   ├── youtubeService.ts          ⚠️ Via Vercel (not used)
│   └── contentService.ts          ⚠️ Via Vercel (not used)
│
├── backend/
│   ├── hono.ts                    ⚠️ Vercel backend
│   └── trpc/
│       └── routes/
│           ├── chat/route.ts      ⚠️ AI Chat
│           ├── tts/route.ts       ⚠️ Text-to-Speech
│           └── content/           ⚠️ YouTube (not used)
│
├── .env                           🔑 API keys
├── app.json                       📱 App config
└── vercel.json                    ☁️ Backend config
```

## Environment Variables

### Client-Side (Baked into App)
```env
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSy...
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub...
EXPO_PUBLIC_SUPABASE_URL=https://vncaboq...
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important:**
- These are baked into the app at build time
- Changing them requires rebuilding the app
- `EXPO_PUBLIC_` prefix makes them accessible in client

### Server-Side (Vercel Only)
```env
YOUTUBE_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
```

**Important:**
- These are only on Vercel
- Not accessible from client
- Used by backend features only

## API Endpoints

### YouTube API (googleapis.com)
```
✅ GET https://www.googleapis.com/youtube/v3/search
✅ GET https://www.googleapis.com/youtube/v3/videos
```
**Status:** Working on TestFlight

### Vercel Backend (motivation-hub...)
```
⚠️ GET  /api/health          - Health check
⚠️ POST /api/chat            - AI Chat
⚠️ POST /api/tts             - Text-to-Speech
⚠️ POST /api/youtube/...     - YouTube (not used)
```
**Status:** May need deployment

## Network Security (iOS)

### NSAppTransportSecurity (app.json)
```json
{
  "NSExceptionDomains": {
    "googleapis.com": { ... },      ✅ YouTube API
    "ytimg.com": { ... },           ✅ YouTube thumbnails
    "vercel.app": { ... },          ⚠️ Backend
    "supabase.co": { ... }          ✅ Database
  }
}
```

**All domains use HTTPS with TLS 1.2+**

## Diagnostic Tool

### Location
Profile → Diagnostics

### Tests
1. **Environment Variables**
   - Checks if API keys are set
   - Shows platform (iOS/Android/Web)

2. **YouTube API (Direct)**
   - Fetches 5 test videos
   - ✅ Should be GREEN on TestFlight

3. **Vercel Health Check**
   - Tests backend connectivity
   - ⚠️ May be RED if not deployed

4. **TTS Endpoint**
   - Tests text-to-speech
   - ⚠️ May be RED if not deployed

## Production Checklist

### For YouTube Videos (Already Working)
- [x] EXPO_PUBLIC_YOUTUBE_API_KEY set in .env
- [x] youtubeDirectService.ts implemented
- [x] Home screen uses direct service
- [x] NSAppTransportSecurity configured
- [x] Works on TestFlight

### For Backend Features (Optional)
- [ ] Vercel backend deployed
- [ ] OPENAI_API_KEY set in Vercel
- [ ] YOUTUBE_API_KEY set in Vercel (if using backend YouTube)
- [ ] Health endpoint returns 200
- [ ] AI Chat works
- [ ] Voice Coach works

## Summary

**Your app is production-ready for YouTube functionality!**

The architecture uses **direct YouTube API calls** from the client, which is why videos work perfectly on TestFlight without any backend deployment.

Backend features (AI Chat, Voice Coach) are **optional** and require a separate Vercel deployment. If you see 404 errors, they're from these optional features, not from YouTube videos.

---

**Architecture Type:** Hybrid (Direct API + Optional Backend)  
**Primary Feature:** YouTube Videos (Direct API)  
**Optional Features:** AI Chat, Voice Coach (Backend)  
**Status:** ✅ Production Ready for YouTube
