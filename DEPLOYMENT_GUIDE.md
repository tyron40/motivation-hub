# Deployment Guide - Motivation Hub

## 🚀 Quick Start

This guide will help you deploy your Motivation Hub app to production.

## ⚠️ CRITICAL: Before Deployment

### 1. Security Actions (REQUIRED)
```bash
# The OpenAI API key was exposed in app.json
# You MUST rotate it before deploying

1. Go to https://platform.openai.com/api-keys
2. Revoke the exposed key: sk-proj-ektpSVLvLLwnIbJZfI_4GPxVcjntXbcFQPQmNj5f2iaH...
3. Create a new API key
4. Add it to your .env file (server-side only)
5. Add it to Vercel environment variables
```

### 2. Environment Variables Setup

#### Local Development (.env file)
```bash
# Server-side only (NOT exposed to client)
OPENAI_API_KEY=your_new_openai_api_key_here

# Client-side (safe to expose)
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-vercel-app.vercel.app
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com
```

#### Vercel Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```
OPENAI_API_KEY=your_new_openai_api_key_here
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📦 Vercel Backend Deployment

### Current Status
- ✅ Vercel configuration fixed
- ✅ Edge Runtime configured
- ✅ API endpoints working
- ⚠️ Environment variables need to be set

### Deployment Steps

1. **Connect to Vercel**
```bash
# If not already connected
vercel login
vercel link
```

2. **Set Environment Variables**
```bash
# Add environment variables via CLI
vercel env add OPENAI_API_KEY
# Paste your new API key when prompted

vercel env add EXPO_PUBLIC_SUPABASE_URL
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY
```

3. **Deploy**
```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploys)
git push origin main
```

4. **Verify Deployment**
```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Test TTS endpoint
curl -X POST https://your-app.vercel.app/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"alloy"}'
```

### Vercel Configuration
The `vercel.json` is now properly configured:
```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "edge"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

## 📱 Mobile App Deployment

### iOS Deployment (App Store)

#### Prerequisites
- Apple Developer Account ($99/year)
- Xcode installed (Mac required)
- EAS CLI installed: `npm install -g eas-cli`

#### Steps

1. **Configure EAS**
```bash
# Login to Expo
eas login

# Initialize EAS
eas build:configure
```

2. **Update app.json**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "app.rork.motivational-speech-app",
      "buildNumber": "18"  // Increment for each build
    }
  }
}
```

3. **Build for iOS**
```bash
# Production build
eas build --platform ios --profile production

# Wait for build to complete (15-30 minutes)
# Download IPA file when ready
```

4. **Submit to App Store**
```bash
# Submit to TestFlight first
eas submit --platform ios

# Or manually upload via Xcode/Transporter
```

5. **TestFlight Testing**
- Add internal testers
- Test all features
- Fix any issues
- Submit for App Store review

### Android Deployment (Google Play)

#### Prerequisites
- Google Play Developer Account ($25 one-time)
- EAS CLI installed

#### Steps

1. **Build for Android**
```bash
# Production build
eas build --platform android --profile production

# Wait for build to complete (15-30 minutes)
# Download AAB file when ready
```

2. **Update app.json**
```json
{
  "expo": {
    "android": {
      "package": "app.rork.motivational-speech-app",
      "versionCode": 18  // Increment for each build
    }
  }
}
```

3. **Submit to Google Play**
```bash
# Submit to Google Play
eas submit --platform android

# Or manually upload via Google Play Console
```

4. **Internal Testing**
- Create internal testing track
- Add testers
- Test all features
- Promote to production

## 🌐 Web Deployment

### Option 1: Vercel (Recommended)
```bash
# Deploy web version to Vercel
vercel --prod
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Option 3: Custom Server
```bash
# Build for web
npx expo export:web

# Upload dist/ folder to your server
```

## 🔧 Configuration Files

### vercel.json (Backend)
```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "edge"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

### eas.json (Mobile Builds)
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## 📊 Post-Deployment Checklist

### Backend Verification
- [ ] Health endpoint responding: `/api/health`
- [ ] TTS endpoint working: `/api/tts`
- [ ] Chat endpoint working: `/api/chat`
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] Error logging working

### Mobile App Verification
- [ ] App launches successfully
- [ ] Authentication working
- [ ] Audio playback working
- [ ] Voice recording working
- [ ] TTS generation working
- [ ] AI chat working
- [ ] All screens accessible
- [ ] No crashes or errors

### Security Verification
- [ ] API key rotated
- [ ] No secrets in code
- [ ] HTTPS everywhere
- [ ] Permissions working
- [ ] Data encrypted

## 🔍 Monitoring Setup

### 1. Error Tracking (Sentry)
```bash
# Install Sentry
npm install @sentry/react-native

# Configure in app
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

### 2. Analytics (Amplitude)
```bash
# Install Amplitude
npm install @amplitude/analytics-react-native

# Configure in app
import { init, track } from '@amplitude/analytics-react-native';

init('your-api-key');
```

### 3. OpenAI Usage Monitoring
- Set up usage alerts in OpenAI dashboard
- Monitor daily spending
- Set spending limits
- Review usage patterns

### 4. Vercel Monitoring
- Enable Vercel Analytics
- Monitor function execution time
- Track error rates
- Review logs regularly

## 🚨 Rollback Plan

### If Backend Deployment Fails
```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy previous version
git revert HEAD
git push origin main
```

### If Mobile App Has Issues
1. Submit hotfix build to stores
2. Use Expo Updates for JS-only fixes
3. Communicate with users
4. Monitor crash reports

## 📈 Scaling Considerations

### Backend Scaling
- Vercel Edge Functions auto-scale
- Monitor function execution time
- Optimize API calls
- Implement caching

### Database Scaling
- Supabase auto-scales
- Monitor query performance
- Add indexes as needed
- Implement connection pooling

### Cost Optimization
- Monitor OpenAI API usage
- Implement rate limiting
- Cache TTS responses
- Optimize audio streaming

## 🎯 Success Metrics

### Key Performance Indicators
- App launch time < 3s
- API response time < 2s
- TTS generation < 5s
- Crash-free rate > 99%
- User retention > 40% (Day 7)

### Monitoring Dashboards
- Vercel Dashboard: Backend performance
- App Store Connect: iOS metrics
- Google Play Console: Android metrics
- Sentry: Error tracking
- Amplitude: User analytics

## 📞 Support

### Deployment Issues
- Vercel Support: https://vercel.com/support
- Expo Support: https://expo.dev/support
- Apple Developer: https://developer.apple.com/support
- Google Play: https://support.google.com/googleplay

### Emergency Contacts
- Backend issues: Check Vercel logs
- Mobile crashes: Check Sentry
- API issues: Check OpenAI status
- Database issues: Check Supabase status

---

**Deployment Status**: Ready (after security actions)
**Last Updated**: 2025-10-07
**Version**: 1.0.0

## 🎉 You're Ready to Deploy!

After completing the security actions above, your app is production-ready and can be deployed to:
- ✅ Vercel (Backend)
- ✅ iOS App Store
- ✅ Google Play Store
- ✅ Web (Vercel/Netlify)

Good luck with your launch! 🚀
