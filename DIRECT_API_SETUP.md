# Direct API Configuration

## Changes Made

This document summarizes the changes made to use YouTube API and RevenueCat directly from the `.env` file instead of through backend/Rork environment variables.

## YouTube API Configuration

### 1. Environment Variable
Updated `.env` file to include:
```
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyDCCZSM3VQT8BcYEqX5Qs0X5Yn_YF6Kd0w
```

### 2. Service Architecture
- **File**: `services/contentService.ts`
- **Change**: Now imports and uses functions from `services/youtubeDirectService.ts` which makes direct API calls to YouTube Data API v3
- **Functions**:
  - `fetchFreshContentByCategory()` - Uses `fetchContentByCategory()` from direct service
  - `searchFreshContent()` - Uses `searchYouTubeContent()` from direct service  
  - `fetchTrendingContent()` - Uses `fetchTrendingYouTubeContent()` from direct service

### 3. How It Works
1. App calls content service functions
2. Content service calls YouTube direct service functions
3. Direct service uses `process.env.EXPO_PUBLIC_YOUTUBE_API_KEY` to make API calls
4. Results are filtered for embeddable videos only (`videoEmbeddable=true`)
5. Results are cached locally for 7 days

## RevenueCat Configuration

### 1. Environment Variable
Already configured in `.env`:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_QKJQVBGeYJCnkqLYRVAiGUgHsdY
```

### 2. Implementation
- **File**: `hooks/iap-context.tsx`
- **Configuration**: Lines 59-63
```typescript
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  default: '',
});
```

### 3. Features
- Automatically configured on app start
- Logs in user with user ID when authenticated
- Fetches available packages/offerings from RevenueCat
- Handles purchases and restores
- Updates entitlements based on customer info

## Benefits

1. **No Backend Dependency**: App can work independently without backend/Vercel deployment
2. **Faster Response**: Direct API calls eliminate backend roundtrip
3. **Better Debugging**: Console logs show exact API calls being made
4. **Embeddable Videos**: Direct service filters out non-embeddable videos automatically
5. **Offline Support**: Local caching provides 7-day content availability

## Testing

1. **YouTube API**:
   - Open any category to trigger API calls
   - Check console for logs starting with "🔍 Fetching YouTube videos for..."
   - Videos should load with embeddable content only

2. **RevenueCat**:
   - Navigate to Settings → Manage Subscription
   - Check console for "✅ RevenueCat configured successfully"
   - Tap any product to test purchase flow

## Troubleshooting

### YouTube API Not Working
- Check console for API key: "⚠️ YouTube API key not configured"
- Verify key in `.env` has `EXPO_PUBLIC_` prefix
- Ensure YouTube Data API v3 is enabled in Google Cloud Console

### RevenueCat Not Working
- Check console for "❌ Error configuring RevenueCat"
- Verify products are created in App Store Connect
- Ensure offerings are configured in RevenueCat dashboard
- Check that API key matches the one in RevenueCat dashboard

### Videos Not Playing (Error 153)
- This error means the video owner has disabled embedding
- The direct service now filters these out automatically
- If you still see this error, it means the video was embeddable at fetch time but is no longer
- Clear cache in Settings to refetch fresh videos
