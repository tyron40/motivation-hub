# 🚀 Motivation Hub - Production Deployment Guide

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Vercel Backend Setup](#vercel-backend-setup)
4. [Building for Production](#building-for-production)
5. [TestFlight Deployment](#testflight-deployment)
6. [App Store Submission](#app-store-submission)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### 1. Security Audit
- [ ] Remove all API keys from `.env` file
- [ ] Verify no sensitive data in code
- [ ] Check that `OPENAI_API_KEY` is only in Vercel environment variables
- [ ] Confirm `YOUTUBE_API_KEY` is only in Vercel environment variables
- [ ] Remove `EXPO_PUBLIC_YOUTUBE_API_KEY` from `.env` (use backend instead)

### 2. Configuration Verification
- [ ] Update `EXPO_PUBLIC_RORK_API_BASE_URL` to your Vercel URL
- [ ] Verify Supabase URL and keys are correct
- [ ] Test all API endpoints on physical device
- [ ] Increment version number in `app.json`
- [ ] Increment build number in `app.json`

### 3. Feature Testing
- [ ] Test YouTube video fetching
- [ ] Test AI Chat functionality
- [ ] Test Voice Coach with TTS
- [ ] Test Scripture favorites
- [ ] Test Playlists
- [ ] Test authentication flow
- [ ] Test on both iOS and Android (if applicable)

---

## 🔧 Environment Configuration

### Step 1: Update Your `.env` File

Your `.env` file should look like this for production:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA

# Backend API URL
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app

# DO NOT include these in production .env:
# EXPO_PUBLIC_YOUTUBE_API_KEY (use backend instead)
# OPENAI_API_KEY (set in Vercel only)
```

### Step 2: Verify Vercel URL

Your Vercel deployment URL should be: `https://motivation-hub-iota.vercel.app`

**Important:** The correct domain is `motivation-hub-iota.vercel.app`, NOT the deployment-specific URL like `motivation-qmhnv05et-tyrons-projects-584a5697.vercel.app`

---

## 🌐 Vercel Backend Setup

### Step 1: Access Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: `motivation-hub`

### Step 2: Configure Environment Variables
Navigate to: **Settings → Environment Variables**

Add the following variables for **Production** environment:

```bash
# YouTube API Key (Server-side)
YOUTUBE_API_KEY=AIzaSyCWeNpvGU8MOh__ED89BicDuEHfi1N_pYs

# OpenAI API Key (Server-side)
OPENAI_API_KEY=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

# Supabase (optional, for backend access)
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA
```

### Step 3: Verify Deployment
1. Trigger a new deployment (or wait for auto-deploy)
2. Test the endpoints:
   - https://motivation-hub-iota.vercel.app/api/health
   - https://motivation-hub-iota.vercel.app/api/youtube/trending
   - https://motivation-hub-iota.vercel.app/api/tts
   - https://motivation-hub-iota.vercel.app/api/chat

All endpoints should return valid JSON responses.

---

## 📱 Building for Production

### Step 1: Update Version Numbers

Edit `app.json`:
```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "48"
    },
    "android": {
      "versionCode": 48
    }
  }
}
```

### Step 2: Build for iOS (TestFlight)

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production
```

### Step 3: Build for Android (Optional)

```bash
eas build --platform android --profile production
```

---

## 🧪 TestFlight Deployment

### Step 1: Wait for Build to Complete
- Monitor build progress in Expo dashboard
- Download the build when complete

### Step 2: Upload to App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to **TestFlight** tab
4. Upload the build (or it will auto-upload if configured)

### Step 3: Add Testers
1. Create a test group
2. Add internal/external testers
3. Submit for TestFlight review (external testers only)

### Step 4: Test on Physical Devices
- Install via TestFlight on multiple devices
- Test all features thoroughly
- Verify API connectivity
- Check error handling

---

## 🏪 App Store Submission

### Step 1: Prepare App Store Listing
- App name: **Motivation Hub**
- Description: Write compelling description
- Keywords: motivation, inspiration, speeches, coaching
- Screenshots: Prepare for all required device sizes
- App icon: Ensure it meets Apple guidelines

### Step 2: Submit for Review
1. Select the TestFlight build
2. Fill in all required information
3. Submit for App Store review

### Step 3: Monitor Review Status
- Typical review time: 1-3 days
- Respond promptly to any rejection feedback

---

## 🔍 Troubleshooting

### Issue: "JSON Parse error: Unexpected character: o"

**Cause:** Backend is returning HTML instead of JSON (usually a 503/504 error page)

**Solution:**
1. Check Vercel deployment status
2. Verify environment variables are set correctly
3. Check Vercel logs for errors
4. Ensure OpenAI API key is valid

### Issue: "Cannot connect to server"

**Cause:** Wrong API URL or network issues

**Solution:**
1. Verify `EXPO_PUBLIC_RORK_API_BASE_URL` is correct
2. Test URL in browser: https://motivation-hub-iota.vercel.app/api/health
3. Check device internet connection
4. Ensure no firewall blocking

### Issue: YouTube videos not loading

**Cause:** YouTube API key not configured or quota exceeded

**Solution:**
1. Verify `YOUTUBE_API_KEY` is set in Vercel
2. Check YouTube API quota in Google Cloud Console
3. Enable YouTube Data API v3 in Google Cloud Console
4. Verify API key has no restrictions blocking requests

### Issue: TTS not working

**Cause:** OpenAI API key not configured or invalid

**Solution:**
1. Verify `OPENAI_API_KEY` is set in Vercel
2. Check OpenAI account has credits
3. Test API key with curl:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: Voice Coach recording fails

**Cause:** Microphone permissions not granted

**Solution:**
1. Check app permissions in device Settings
2. Ensure `NSMicrophoneUsageDescription` is in `app.json`
3. Request permissions on app launch
4. Test on physical device (not simulator)

---

## 📊 Monitoring Production

### Vercel Logs
- Monitor: https://vercel.com/your-project/logs
- Check for errors in API calls
- Monitor response times

### Expo Analytics
- Monitor crashes in Expo dashboard
- Track user engagement
- Monitor API errors

### User Feedback
- Monitor TestFlight feedback
- Respond to App Store reviews
- Track support requests

---

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor API usage** for unusual activity
5. **Use HTTPS** for all API calls
6. **Validate user input** on backend
7. **Implement rate limiting** on backend endpoints

---

## 📞 Support

If you encounter issues:
1. Check Vercel logs
2. Check Expo build logs
3. Test API endpoints manually
4. Verify environment variables
5. Contact support if needed

---

## ✅ Final Checklist Before Submission

- [ ] All API keys removed from `.env`
- [ ] Vercel environment variables configured
- [ ] Backend deployed and tested
- [ ] App tested on physical devices
- [ ] Version and build numbers incremented
- [ ] All features working correctly
- [ ] Error handling tested
- [ ] Screenshots prepared
- [ ] App Store listing complete
- [ ] Privacy policy updated
- [ ] Terms of service updated

---

**Good luck with your App Store submission! 🎉**
