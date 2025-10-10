# Content Fetching Strategy Guide

## Overview

This app now supports **dynamic content fetching** from YouTube using the YouTube Data API v3. This ensures fresh, daily-rotating content for each category.

## Features

### 1. **Daily Content Rotation**
- Each category has 5 different search queries
- Content rotates daily based on the current date
- Users see new content every day without manual intervention

### 2. **Smart Caching**
- Content is cached for 24 hours using AsyncStorage
- Reduces API quota usage
- Provides offline access to previously loaded content
- Automatic cache invalidation after 24 hours

### 3. **Fallback Strategy**
- Primary: Fresh YouTube content via API
- Secondary: Cached content (if available)
- Tertiary: Embedded mock data (4000+ speeches)

## Setup Instructions

### Step 1: Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Step 3: Deploy Backend

Your backend needs to be deployed to handle YouTube API requests:

```bash
# Deploy to Vercel (recommended)
vercel deploy

# Or deploy to your preferred platform
```

## Usage

### Load Fresh Content by Category

```typescript
import { useSpeechContext } from '@/hooks/speech-context';

function MyComponent() {
  const { loadFreshContent, speeches, isLoading } = useSpeechContext();
  
  useEffect(() => {
    // Load fresh content for "motivation" category
    loadFreshContent('motivation', true); // true = use cache if available
  }, []);
  
  return (
    <View>
      {isLoading ? <ActivityIndicator /> : null}
      {speeches.map(speech => <SpeechCard key={speech.id} speech={speech} />)}
    </View>
  );
}
```

### Search Fresh Content

```typescript
const { searchFreshContent, speeches } = useSpeechContext();

const handleSearch = async (query: string) => {
  await searchFreshContent(query);
  // speeches will be updated with search results
};
```

### Load Trending Content

```typescript
const { loadTrendingContent, speeches } = useSpeechContext();

useEffect(() => {
  loadTrendingContent(true); // Load trending motivational content
}, []);
```

## Content Service API

### `fetchFreshContentByCategory(category, limit, useCache)`

Fetches fresh content for a specific category.

**Parameters:**
- `category` (string): Category name (e.g., 'motivation', 'success')
- `limit` (number): Max number of videos to fetch (default: 10)
- `useCache` (boolean): Whether to use cached content (default: true)

**Returns:** `Promise<Speech[]>`

### `searchFreshContent(query, limit)`

Searches YouTube for specific content.

**Parameters:**
- `query` (string): Search query
- `limit` (number): Max results (default: 20)

**Returns:** `Promise<Speech[]>`

### `fetchTrendingContent(limit, useCache)`

Fetches trending motivational content.

**Parameters:**
- `limit` (number): Max results (default: 20)
- `useCache` (boolean): Use cached content (default: true)

**Returns:** `Promise<Speech[]>`

### `clearContentCache()`

Clears all cached content.

**Returns:** `Promise<void>`

### `getCacheInfo()`

Gets information about cached content.

**Returns:** `Promise<{ categories: string[], totalSize: number, oldestCache: Date | null }>`

## Category Search Queries

Each category has 5 rotating search queries:

### Motivation
1. motivational speech 2024
2. david goggins motivation
3. best motivational speech
4. powerful motivation
5. morning motivation speech

### Success
1. success mindset speech
2. entrepreneur motivation
3. business success speech
4. wealth mindset
5. success principles

### Mindset
1. growth mindset speech
2. mental toughness
3. champion mindset
4. positive thinking speech
5. mindset transformation

### Inspiration
1. inspirational speech
2. life changing speech
3. inspiring stories
4. overcome adversity
5. never give up speech

### Study
1. study motivation
2. focus and concentration
3. academic success
4. learning motivation
5. student motivation

### High Energy
1. high energy motivation
2. pump up speech
3. workout motivation
4. intense motivation
5. energy boost speech

### Daily Motivation
1. daily motivation speech
2. morning routine motivation
3. daily inspiration
4. start your day right
5. daily mindset

### Powerful Speeches
1. powerful motivational speech
2. life changing speech
3. greatest speeches
4. legendary speeches
5. iconic motivational speech

## API Quota Management

YouTube Data API v3 has a daily quota of **10,000 units**.

### Cost per Request:
- Search: 100 units
- Video details: 1 unit per video

### Optimization Tips:

1. **Use Caching**: Enable caching to reduce API calls
2. **Limit Results**: Fetch only what you need (10-20 videos)
3. **Daily Rotation**: Queries rotate daily, spreading usage
4. **Fallback to Cache**: Always try cache first

### Example Daily Usage:
- 10 categories × 1 search/day = 1,000 units
- 10 videos × 1 unit = 10 units
- **Total: ~1,010 units/day** (well within quota)

## Testing

Test the content fetching system:

```typescript
import { fetchFreshContentByCategory, getCacheInfo, clearContentCache } from '@/services/contentService';

// Test fetching
const speeches = await fetchFreshContentByCategory('motivation', 5, false);
console.log('Fetched speeches:', speeches.length);

// Check cache
const cacheInfo = await getCacheInfo();
console.log('Cache info:', cacheInfo);

// Clear cache
await clearContentCache();
```

## Troubleshooting

### No Content Loading

1. **Check API Key**: Ensure `YOUTUBE_API_KEY` is set in `.env`
2. **Check Backend**: Ensure backend is deployed and accessible
3. **Check Quota**: Verify you haven't exceeded daily quota
4. **Check Logs**: Look for error messages in console

### Stale Content

1. **Clear Cache**: Call `clearContentCache()`
2. **Force Refresh**: Pass `useCache: false` to fetch functions
3. **Check Date**: Content rotates daily at midnight

### API Errors

Common errors and solutions:

- **403 Forbidden**: API key invalid or quota exceeded
- **400 Bad Request**: Invalid search query
- **404 Not Found**: Video not available
- **500 Server Error**: YouTube API issue (retry later)

## Best Practices

1. **Always use caching** in production
2. **Handle errors gracefully** with fallbacks
3. **Show loading states** during fetches
4. **Implement pull-to-refresh** for manual updates
5. **Monitor API usage** to stay within quota
6. **Test with mock data** during development

## Future Enhancements

- [ ] Add user preferences for content types
- [ ] Implement content recommendations
- [ ] Add content filtering options
- [ ] Support multiple languages
- [ ] Add content quality scoring
- [ ] Implement A/B testing for queries
- [ ] Add analytics for popular content
- [ ] Support custom search queries

## Support

For issues or questions:
1. Check console logs for errors
2. Verify API key configuration
3. Test with mock data first
4. Check backend deployment status
5. Review YouTube API documentation
