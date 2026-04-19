# Quick Fix for Network Errors

## The Issue
You're seeing "Network request failed" errors because your backend is not accessible.

## Immediate Solution

### For Local Development:
1. When you run `bun start`, check the console output
2. Look for a line that says something like: `Backend URL: https://xxxxx.ngrok.io` or similar
3. That URL should be automatically set as `EXPO_PUBLIC_RORK_API_BASE_URL`

### For Production (TestFlight):
Your backend needs to be deployed. The Voice Coach feature **requires** a backend server because:
- TTS (Text-to-Speech) uses OpenAI API (server-side only)
- Chat uses OpenAI API (server-side only)
- These cannot run client-side for security reasons (API keys would be exposed)

## What You Need to Do:

1. **Deploy your backend** (see BACKEND_DEPLOYMENT.md for detailed instructions)
2. **Set the environment variable** in your Expo project settings:
   - Go to your Expo dashboard
   - Add `EXPO_PUBLIC_RORK_API_BASE_URL` with your deployed backend URL
3. **Rebuild your app** for TestFlight

## Alternative: Disable Voice Coach Temporarily

If you want to publish without the Voice Coach feature:
1. Remove or hide the Voice Coach navigation/button
2. Or add a "Coming Soon" message instead of the actual feature

## Checking If It's Working

When the app starts, check the console logs:
- ✅ `Using backend URL: https://your-backend.com` = Working
- ❌ `Backend URL not configured` = Not working

The app will now show clear error messages explaining what needs to be configured.
