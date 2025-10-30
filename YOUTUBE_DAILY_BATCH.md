# YouTube API Daily Batch System

## Overview

This system implements a once-per-day YouTube API batch fetch that:
- Fetches YouTube videos once daily at 2 AM UTC via Vercel cron
- Stores videos in Supabase database
- Serves cached videos to users throughout the day
- Controls YouTube API quota and costs effectively

## Components

### 1. Database Tables (Supabase)

**`youtube_video_cache`** - Stores cached YouTube videos
- `id`: Video ID (primary key)
- `title, description, thumbnail`: Video metadata  
- `channel_title, channel_id`: Channel information
- `published_at, duration, view_count`: Video stats
- `category, query`: Categorization data
- `fetched_at`: When video was fetched
- `expires_at`: When cache expires (24 hours)

**`youtube_batch_logs`** - Tracks daily batch runs
- `batch_date`: Date of batch (unique)
- `total_videos_fetched`: Count of videos
- `categories_processed`: List of categories
- `queries_used`: YouTube search queries used
- `api_calls_made`: Number of API calls
- `status`: pending/processing/completed/failed
- `started_at, completed_at`: Timing information

### 2. Backend Endpoints

**tRPC Procedures:**
- `content.runDailyBatch` - Runs the daily fetch (mutation)
  - Input: `videosPerQuery` (1-10), `forceRefresh` (boolean)
  - Fetches 5 videos per category by default
  - Rotates through queries daily
  
- `content.getCachedVideos` - Gets cached videos (query)
  - Input: `category` (optional), `limit` (1-100)
  - Returns videos from cache with metadata
  
- `content.getBatchStatus` - Gets today's batch status (query)
  - Returns current batch log with status

**Cron Endpoint:**
- `/api/cron/youtube-batch` - Triggered by Vercel cron
  - Runs daily at 2 AM UTC
  - Optional `CRON_SECRET` environment variable for auth
  - Calls `runDailyBatch` procedure automatically

### 3. Cron Schedule

Configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/youtube-batch",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Schedule: `0 2 * * *` = Every day at 2:00 AM UTC

### 4. Query Rotation

Each category has 5 different search queries that rotate daily:
- Query used = `queries[currentDay % 5]`
- Example for "motivation": 
  - Day 1: "motivational speech 2024"
  - Day 2: "david goggins motivation"
  - Day 3: "best motivational speech"
  - etc.

## API Quota Management

**Default Configuration:**
- 8 categories × 5 videos = 40 videos per day
- 2 API calls per query (search + details) = 16 API calls/day
- YouTube free tier: 10,000 units/day
- Cost per batch: ~16 units (well within limits)

**To Adjust:**
- Increase `videosPerQuery` (max 10) for more content
- Add/remove categories in `CATEGORY_SEARCH_QUERIES`
- Modify cron schedule for different frequency

## Setup Instructions

### 1. Run Supabase Migration

Execute `backend/supabase-migrations/002_youtube_cache.sql` in your Supabase SQL editor:
```sql
-- Creates tables and indexes
-- Sets up cleanup function
```

### 2. Configure Environment Variables

In Vercel:
```bash
YOUTUBE_API_KEY=your_youtube_api_key
CRON_SECRET=your_random_secret (optional, for security)
```

### 3. Deploy to Vercel

```bash
# Deploy updated code
vercel --prod

# Vercel will automatically register the cron job
```

### 4. Verify Setup

**Check batch status:**
```typescript
const { data } = await trpc.content.getBatchStatus.useQuery();
console.log(data.status); // 'not_started' or 'completed'
```

**Manually trigger batch (testing):**
```typescript
const result = await trpc.content.runDailyBatch.useMutation({
  videosPerQuery: 5,
  forceRefresh: true,
});
```

**Get cached videos:**
```typescript
const { data } = await trpc.content.getCachedVideos.useQuery({
  category: 'motivation',
  limit: 20,
});
console.log(data.videos); // Array of cached videos
```

## Usage in Frontend

### Replace Direct YouTube API Calls

**Before:**
```typescript
// Direct API call every time
const videos = await fetchYouTubeVideos(query, limit);
```

**After:**
```typescript
// Use cached videos
const { data } = await trpc.content.getCachedVideos.useQuery({
  category: 'motivation',
  limit: 20,
});
const videos = data?.videos || [];
```

### Check if Today's Batch Ran

```typescript
const { data: batchStatus } = await trpc.content.getBatchStatus.useQuery();

if (batchStatus.status === 'completed') {
  // Show videos from cache
} else if (batchStatus.status === 'failed') {
  // Show error message
} else {
  // Still processing or not started yet
}
```

## Monitoring

### Vercel Logs

Check cron execution:
1. Go to Vercel dashboard
2. Select your project
3. Click "Logs"
4. Filter by `/api/cron/youtube-batch`

### Supabase Queries

**Check latest batch:**
```sql
SELECT * FROM youtube_batch_logs 
ORDER BY batch_date DESC 
LIMIT 1;
```

**Count cached videos:**
```sql
SELECT category, COUNT(*) 
FROM youtube_video_cache 
WHERE expires_at > NOW() 
GROUP BY category;
```

**View expired videos:**
```sql
SELECT COUNT(*) 
FROM youtube_video_cache 
WHERE expires_at < NOW();
```

## Cleanup

The system automatically cleans up expired videos:
- Runs at start of each batch
- Removes videos where `expires_at < NOW()`
- Function: `cleanup_expired_youtube_videos()`

## Troubleshooting

### Cron Not Running

1. Check Vercel cron is enabled (Pro plan required)
2. Verify `vercel.json` is deployed
3. Check Vercel logs for errors

### No Videos in Cache

1. Check batch status: `content.getBatchStatus`
2. Review batch logs table for errors
3. Verify YouTube API key is set
4. Check API quota hasn't been exceeded

### Authorization Errors

If using `CRON_SECRET`:
- Vercel automatically adds auth header
- Don't need to configure anything
- Remove `CRON_SECRET` if having issues

## Benefits

✅ **Cost Control:** Fixed API usage per day  
✅ **Performance:** Serve from cache, no API latency  
✅ **Reliability:** Works even if YouTube API has issues  
✅ **Predictable:** Same content for all users each day  
✅ **Scalable:** Database queries scale better than API calls

## Future Enhancements

- Add admin panel to trigger batch manually
- Implement category-specific refresh schedules
- Add trending/popular video detection
- Support user-requested categories
- Implement progressive cache warming
