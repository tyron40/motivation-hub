# Quick Reference: TestFlight & Production

## ✅ What's Working

- ✅ YouTube videos load and play on TestFlight
- ✅ Direct YouTube API calls from client
- ✅ Video thumbnails display correctly
- ✅ Categories show videos
- ✅ Search functionality
- ✅ Home screen loads 100 videos

## ⚠️ What Might Not Work (Backend Features)

- ⚠️ AI Chat (requires Vercel backend)
- ⚠️ Voice Coach (requires Vercel backend)
- ⚠️ Text-to-Speech (requires Vercel backend)

## 🔧 Quick Diagnostics

### On TestFlight Device
1. Open app
2. Go to **Profile** tab
3. Tap **Diagnostics**
4. Tap **Run Diagnostics**
5. Check results:
   - ✅ Green = Working
   - ❌ Red = Not working

### Expected Results
- **YouTube API (Direct)**: ✅ Should be GREEN
- **Vercel Health Check**: ⚠️ May be RED (only needed for AI features)
- **TTS Endpoint**: ⚠️ May be RED (only needed for Voice Coach)

## 📱 Current Configuration

### App Info
- **Name**: Motivation Hub
- **Bundle ID**: `app.rork.motivational-speech-app`
- **Version**: 1.0.0
- **Build Number**: 48
- **Project ID**: `7389ef4c-4537-4e7b-9081-c30a7e9c22bd`

### API Keys
- **YouTube API**: `EXPO_PUBLIC_YOUTUBE_API_KEY` (set in .env)
- **Backend URL**: `https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app`

## 🚀 Next Build Checklist

- [ ] Increment build number in `app.json` (48 → 49)
- [ ] Run `eas build --platform ios --profile production`
- [ ] Submit to TestFlight: `eas submit --platform ios`
- [ ] Test on device after upload
- [ ] Run diagnostics to verify

## 🐛 Troubleshooting

### YouTube Videos Not Loading
1. Check internet connection
2. Verify `EXPO_PUBLIC_YOUTUBE_API_KEY` in `.env`
3. Rebuild app after changing `.env`
4. Check YouTube API quota in Google Cloud Console

### Backend Features Not Working
1. Test Vercel URL in Safari: `https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health`
2. Check Vercel dashboard for deployment status
3. Verify environment variables in Vercel
4. Redeploy: `vercel --prod`

### 404 Errors
- **If YouTube videos work**: 404s are from backend features (AI Chat, Voice Coach)
- **If YouTube videos don't work**: Check API key and rebuild app

## 📞 Quick Commands

```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios

# Test Vercel backend
curl https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health

# Deploy Vercel backend
vercel --prod

# Check build status
eas build:list
```

## 📚 Documentation Files

- `SUMMARY.md` - Complete overview
- `TESTFLIGHT_FIX.md` - Detailed troubleshooting
- `QUICK_REFERENCE.md` - This file
- `.env` - Environment variables
- `app.json` - App configuration

## 🎯 Key Points

1. **YouTube works without backend** - Direct API calls from client
2. **Backend only needed for AI features** - Chat, Voice Coach, TTS
3. **Use Diagnostics tool** - Built into the app (Profile → Diagnostics)
4. **No app.json changes needed** - Already configured correctly
5. **Rebuild after .env changes** - Environment variables are baked into build

---

**Last Updated**: 2025-01-XX  
**Build**: 48  
**Status**: ✅ Production Ready for YouTube
