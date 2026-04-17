# Demo Login Credentials for App Store Review

## Demo Account Information

Use these credentials to demonstrate all premium features to App Store reviewers:

**Email:** `demo@motivationhub.app`  
**Password:** `Demo2025!`

## What the Demo Account Provides

The demo account automatically grants:

1. **Premium Status**: Full premium subscription (never expires)
2. **Credits**: 1,000 AI credits for unlimited AI features
3. **All Voices**: Access to all voice options in the app
4. **No Ads**: Ad-free experience
5. **Full Feature Access**: Complete access to all features including:
   - AI Voice Coach with text and voice responses
   - Unlimited scripture browsing and favorites
   - Chat sessions with AI
   - All motivational speeches and videos
   - Playlist creation and management
   - YouTube video playback

## How It Works

The demo account is handled entirely in the app code:

1. When the user signs in with `demo@motivationhub.app` and password `Demo2025!`, the app detects this is a demo account
2. Instead of making a real authentication call, the app creates a local authenticated session
3. The IAP (In-App Purchase) context automatically grants premium entitlements
4. The user gets full access to all features without needing to make purchases

## For App Store Connect

When submitting your app for review, add this information in the "App Review Information" section:

**Demo Account Username:** demo@motivationhub.app  
**Demo Account Password:** Demo2025!

**Additional Notes:**
```
This demo account has full premium access pre-configured to allow reviewers to test all features including:
- AI Voice Coach (uses credits for AI responses)
- Premium content and speeches
- Scripture favorites and playlists
- All voice options
- Ad-free experience

No in-app purchase is needed with this account as it comes with 1,000 credits and unlimited premium access.
```

## Testing the Demo Account

To verify the demo account works correctly:

1. Sign out if you're currently signed in
2. On the sign-in screen, enter:
   - Email: `demo@motivationhub.app`
   - Password: `Demo2025!`
3. Sign in and verify:
   - You can access all features
   - The profile/settings shows premium status
   - AI features work without purchase prompts
   - No paywall appears

## Technical Implementation

The demo account is implemented in:
- `hooks/auth-context.tsx` - Handles demo authentication
- `hooks/iap-context.tsx` - Grants premium entitlements to demo users

This approach ensures App Store reviewers can fully test the app without needing to set up real purchases or subscriptions.
