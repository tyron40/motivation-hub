# Podcast RSS Feed Fix

## Problem
The podcast RSS feed fetching was failing with "Failed to fetch" and "TRPCClientError: No procedure found on path 'trpc/podcast.rssFeed'" errors.

## Root Cause
The import statement in `backend/trpc/routes/podcast/rss-proxy.ts` was incorrectly using `.js` extension:
```typescript
import { publicProcedure } from "../../create-context.js";
```

This caused the module to fail to import properly when deployed to Vercel.

## Solution Applied

### 1. Fixed Import Path
**File**: `backend/trpc/routes/podcast/rss-proxy.ts`
- Changed: `from "../../create-context.js"`
- To: `from "../../create-context"`

### 2. Added Debug Logging
**File**: `backend/hono.ts`
- Added logging to show which procedures are registered
- Added version number (v2.3) to track deployments

### 3. Fixed Diagnostic Tool
**File**: `components/PodcastDiagnostic.tsx`
- Fixed manual tRPC HTTP request format
- Changed from POST with body to GET with query parameters
- This matches tRPC's expected format for `.query()` calls

### 4. Updated API Version
**File**: `api/index.ts`
- Bumped version to v2.3 to track deployment

## How to Verify the Fix

### Option 1: Use the Diagnostic Tool
1. Navigate to `/podcast-diagnostic` in your app
2. Tap "Run Diagnostics"
3. All tests should pass with ✅

### Option 2: Check Console Logs
After deploying to Vercel, check the logs for:
```
[Backend] Podcast procedures: { rssFeed: [Function] }
[Vercel] API handler loaded - v2.3 - Podcast RSS Support Fixed
```

### Option 3: Test Directly
The podcast service should now successfully fetch RSS feeds:
```typescript
import { fetchAllPodcasts } from '@/services/podcastService';

const speeches = await fetchAllPodcasts();
console.log(`Fetched ${speeches.length} podcast episodes`);
```

## Deployment Steps
1. Commit all changes
2. Push to your Git repository
3. Vercel will automatically deploy
4. Wait ~2 minutes for deployment
5. Test using the diagnostic tool

## Files Modified
- `backend/trpc/routes/podcast/rss-proxy.ts` - Fixed import
- `backend/hono.ts` - Added debug logging
- `api/index.ts` - Version bump
- `components/PodcastDiagnostic.tsx` - Fixed manual HTTP test

## Expected Behavior After Fix
✅ Podcast RSS feeds load successfully
✅ All 10 podcasts fetch episodes
✅ Episodes display with correct metadata
✅ Audio playback works properly
✅ No CORS errors
✅ No "procedure not found" errors

## Testing Checklist
- [ ] Deploy to Vercel
- [ ] Check Vercel logs show v2.3
- [ ] Run diagnostic tool - all tests pass
- [ ] Open app and view podcast episodes
- [ ] Play a podcast episode
- [ ] Verify all 10 podcasts load

## Notes
- The backend now properly proxies RSS feeds to avoid CORS
- Each podcast feed is fetched through the Vercel backend
- RSS XML is parsed on the backend
- Results are cached to improve performance
- No client-side CORS issues anymore
