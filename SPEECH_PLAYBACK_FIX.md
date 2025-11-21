# Speech Playback Fix - Complete

## Problem
YouTube videos were not playing in the app. Users reported "they are not playing" issue.

## Root Cause
1. **YouTube IFrame API restrictions**: Many videos cannot be embedded due to YouTube's embedding policies
2. **Slow error recovery**: Videos took too long to skip when they couldn't play
3. **Poor filtering**: Backend wasn't strictly filtering for embeddable videos
4. **No user feedback**: Users didn't know when videos were being skipped

## Solution Implemented

### 1. Backend Improvements (`backend/hono.ts`)

**Better Video Filtering:**
```typescript
// Fetch 3x more videos to have better candidates
const fetchLimit = Math.min(maxResults * 3, 50);

// Add embeddable filter in search
searchUrl.searchParams.set('videoEmbeddable', 'true');

// Strict embeddable check (must be explicitly true)
const isEmbeddable = item.status?.embeddable === true;
```

**Result**: Only videos that YouTube explicitly marks as embeddable will be returned.

### 2. Frontend Improvements

**Faster Error Recovery (`components/AudioOnlyVideoPlayer.tsx`):**
- Reduced max retries from 2 to 1
- Reduced loading timeout from 15s to 10s
- Faster auto-skip: 800ms for embedding errors, 1.5s for other errors
- Videos that can't embed are skipped almost immediately

**User Feedback (`app/player.tsx`):**
- Added skip message toast when changing videos
- Shows "Loading next video..." when skipping
- Shows "Video not playable, skipping..." on errors
- Messages auto-dismiss after 1.5-2 seconds

## How It Works Now

1. **Backend fetches videos** → Only returns embeddable videos
2. **User plays video** → AudioOnlyVideoPlayer loads YouTube IFrame
3. **If video can't play** → Error detected in 800ms-1.5s
4. **Auto-skip** → Next video starts automatically
5. **User sees toast** → Clear feedback about what's happening

## Testing

Test the playback:
1. Open any speech category
2. Tap a speech to play
3. Observe that videos either play immediately or skip quickly
4. Check console logs for detailed playback information

## Expected Behavior

- ✅ Most videos should play successfully (filtered for embeddable)
- ✅ Non-playable videos skip automatically within 1-2 seconds
- ✅ Users see clear feedback when videos are skipping
- ✅ No manual intervention needed - auto-recovery

## Technical Details

### YouTube IFrame Player States
- `-1` UNSTARTED
- `0` ENDED
- `1` PLAYING ✅
- `2` PAUSED
- `3` BUFFERING
- `5` CUED

### Error Codes Handled
- `2` Invalid video ID
- `5` HTML5 player error
- `100` Video not found/private
- `101` Cannot be embedded ⚠️ (most common)
- `150` Cannot be embedded ⚠️
- `153` Cannot be embedded ⚠️

### Auto-Skip Timing
- **Embedding errors (101, 150, 100)**: 800ms
- **Other errors**: 1500ms
- **Loading timeout**: 10000ms

## Alternative Solutions (Not Implemented)

We did NOT implement these because they violate YouTube ToS:
- ❌ Using ytdl-core or yt-dlp to extract audio URLs
- ❌ Using third-party YouTube proxies
- ❌ Using unofficial YouTube APIs

## Compliance

✅ **YouTube API Compliant**: Uses official YouTube Data API v3 and IFrame Player API
✅ **Terms of Service**: Follows YouTube's embedding policies
✅ **User Experience**: Graceful error handling with auto-recovery

## Console Logs

Look for these logs when debugging:
```
🎵 Initializing AudioOnlyVideoPlayer for video: [videoId]
✅ Player ready, duration: [seconds]
▶️ Playback started successfully
⏭️ Auto-skipping unplayable video (embedding restricted)
[YouTube] ✅ Successfully fetched X/Y playable videos
```

## If Issues Persist

1. **Check YouTube API Key**: Ensure it's set in Vercel environment variables
2. **Check API Quota**: Visit https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
3. **Check Console Logs**: Look for error messages in browser/app console
4. **Check Backend Logs**: Check Vercel function logs for API errors

## Files Modified

- `backend/hono.ts` - Better video filtering
- `components/AudioOnlyVideoPlayer.tsx` - Faster error recovery
- `app/player.tsx` - User feedback messages
