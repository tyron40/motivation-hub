# Supabase Authentication Fix

## Problem
Authentication is failing with "Failed to fetch" and "AuthRetryableFetchError" errors.

## Root Causes
1. **Network Configuration**: The Supabase URL might not be properly allowed in iOS App Transport Security
2. **Connection Issues**: Network connectivity problems or incorrect Supabase configuration
3. **Missing Error Handling**: Errors not properly caught and displayed to users

## Solutions Applied

### 1. Enhanced Supabase Client (`lib/supabase.ts`)
✅ Added comprehensive error handling with try-catch blocks
✅ Added detailed logging for debugging
✅ Added network error messages for better user feedback
✅ Configured proper client options

### 2. app.json Configuration Update Required

**PASTE THIS INTO YOUR app.json** (build number incremented to 58):

```json
{
  "expo": {
    "name": "Motivation Hub",
    "slug": "motivational-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "app.rork.motivational-speech-app",
      "buildNumber": "58",
      "infoPlist": {
        "UIBackgroundModes": [
          "audio"
        ],
        "NSMicrophoneUsageDescription": "Motivation Hub uses your microphone only when you press and hold to speak with the Voice Coach feature. For example, when you open Voice Coach from your Profile tab and hold the microphone button, we record and transcribe your voice to text so you can have a conversation with your AI coach. Your audio is processed securely and not stored.",
        "NSPhotoLibraryUsageDescription": "Motivation Hub lets you personalize your profile by selecting a photo from your library. When you tap the camera icon on your Profile tab, you can choose an existing photo to use as your profile picture. This photo is stored locally on your device and used only to display your profile within the app.",
        "NSCameraUsageDescription": "Motivation Hub allows you to take a new photo for your profile picture. When you tap the camera icon on your Profile tab and select 'Take Photo', the camera opens so you can capture a new image. This photo is stored locally and used only within the app.",
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSExceptionDomains": {
            "googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            },
            "vercel.app": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            },
            "youtube.com": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            },
            "supabase.co": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            },
            "vncaboqllcykibwdnmwp.supabase.co": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            },
            "rork.com": {
              "NSIncludesSubdomains": true,
              "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
              "NSTemporaryExceptionRequiresForwardSecrecy": true,
              "NSTemporaryExceptionMinimumTLSVersion": "TLSv1.2"
            }
          }
        }
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "app.rork.motivational-speech-app",
      "versionCode": 58,
      "permissions": [
        "RECORD_AUDIO",
        "INTERNET",
        "MODIFY_AUDIO_SETTINGS",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "usesCleartextTraffic": false
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://rork.com/"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Motivation Hub uses your microphone only when you press and hold to speak with the Voice Coach feature. For example, when you open Voice Coach from your Profile tab and hold the microphone button, we record and transcribe your voice to text so you can have a conversation with your AI coach. Your audio is processed securely and not stored."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Motivation Hub lets you personalize your profile by selecting a photo from your library. When you tap the camera icon on your Profile tab, you can choose an existing photo to use as your profile picture. This photo is stored locally on your device and used only to display your profile within the app.",
          "cameraPermission": "Motivation Hub allows you to take a new photo for your profile picture. When you tap the camera icon on your Profile tab and select 'Take Photo', the camera opens so you can capture a new image. This photo is stored locally and used only within the app."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "7389ef4c-4537-4e7b-9081-c30a7e9c22bd"
      }
    }
  }
}
```

## Key Changes in app.json:
1. **Build number**: Incremented to 58
2. **Added Supabase subdomain**: `vncaboqllcykibwdnmwp.supabase.co` to NSExceptionDomains
3. **Added rork.com**: For toolkit API access
4. **All domains use TLS 1.2**: Ensures secure connections

## Testing Steps

1. **Check Console Logs**: Look for these messages:
   ```
   🔧 Supabase Configuration: { url: ..., hasKey: true, ... }
   🔐 [Supabase] Attempting sign in for: user@example.com
   ```

2. **If you see connection errors**:
   - Check your network connection
   - Verify Supabase project is active at https://app.supabase.com
   - Check if your Supabase URL and anon key are correct in .env

3. **Verify Environment Variables**:
   ```bash
   # In .env file
   EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

## Additional Debugging

Run the test script to verify Supabase connectivity:
```typescript
import { testSupabaseConnection } from './scripts/test-supabase';

// In your app or test file
testSupabaseConnection();
```

## What to Check in Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project `vncaboqllcykibwdnmwp`
3. Check:
   - **Project Status**: Should be "Active"
   - **API Settings**: Verify URL and anon key
   - **Auth Settings**: Email auth should be enabled
   - **Network**: No IP restrictions blocking your requests

## Common Issues & Solutions

### Issue 1: "Failed to fetch" on Web
**Solution**: Check browser console for CORS errors. Supabase should allow web origins by default.

### Issue 2: "Failed to fetch" on iOS
**Solution**: 
- Verify NSAppTransportSecurity settings in app.json (done above)
- Rebuild the app after changing app.json
- Check iOS device has internet connection

### Issue 3: "AuthRetryableFetchError"
**Solution**: 
- Network timeout or connection issue
- Check Supabase project is not paused
- Verify your subscription/plan is active

### Issue 4: Email confirmation required
**Solution**: 
- Check email for confirmation link
- Or disable email confirmation in Supabase dashboard:
  - Go to Authentication > Settings
  - Disable "Enable email confirmations"

## Next Steps After Fix

1. **Update app.json** with the configuration above
2. **Rebuild the app**:
   ```bash
   # For iOS
   eas build -p ios --profile production
   
   # For development
   npx expo prebuild
   npx expo run:ios
   ```
3. **Test authentication flow**:
   - Sign up with a new account
   - Check console logs
   - Verify email confirmation (if enabled)
   - Sign in with created account
4. **Monitor logs** for any remaining errors

## User-Friendly Error Messages

The updated code now shows helpful messages:
- "Network error. Please check your connection and try again."
- Error details logged to console for debugging
- Users see actionable error messages instead of technical ones
