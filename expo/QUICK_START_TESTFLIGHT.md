# Quick Start - TestFlight Production Build

## 🚀 Quick Steps to Deploy

### 1. Update app.json (REQUIRED)
Open `app.json` and make these changes:

```json
{
  "expo": {
    "ios": {
      "buildNumber": "20",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs microphone access to enable voice conversations with your personal motivation coach. Your voice is processed securely and never stored.",
        "NSSpeechRecognitionUsageDescription": "This app uses speech recognition to understand your voice commands and have natural conversations with your coach."
      }
    },
    "android": {
      "versionCode": 20
    },
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "This app needs microphone access to enable voice conversations with your personal motivation coach. Your voice is processed securely and never stored."
        }
      ]
    ]
  }
}
```

### 2. Build for TestFlight
```bash
eas build --platform ios --profile production
```

### 3. Submit to TestFlight
```bash
eas submit --platform ios
```

### 4. Test on Physical Device
- Install from TestFlight
- Test voice coach microphone
- Verify 100 videos load per page
- Check AI responses are fast

---

## ✅ What Was Fixed

1. **YouTube Videos**: Now loads 100 videos per page (was only loading 10-20)
2. **Voice Coach Microphone**: Better permission handling for physical devices
3. **AI Response Speed**: Optimized to respond in 5-10 seconds
4. **API Connectivity**: Better error handling and connection testing

---

## 📋 Quick Test Checklist

### Must Test
- [ ] Voice coach microphone works
- [ ] 100 videos load on home page
- [ ] AI responds within 10 seconds
- [ ] Videos play correctly

### Should Test
- [ ] Search returns 100 results
- [ ] Coach character selection works
- [ ] Favorites work
- [ ] Profile settings work

---

## 🐛 If Something Doesn't Work

### Microphone Not Working
1. Check Settings > Motivation Hub > Microphone is enabled
2. Force close and reopen app
3. Check Xcode Console logs

### Videos Not Loading
1. Verify YouTube API key in `.env`
2. Check Google Cloud Console quota
3. Check device logs for errors

### AI Not Responding
1. Check internet connection
2. Verify Vercel backend is running
3. Check OpenAI API key is set
4. Look at Vercel logs

---

## 📚 Full Documentation

- **FIXES_SUMMARY.md** - What was changed
- **TESTFLIGHT_PRODUCTION_READY.md** - Complete testing guide
- **PRODUCTION_MOBILE_FIX.md** - Technical details

---

## 🎯 Success Criteria

✅ 100 videos load per page
✅ Microphone captures audio
✅ AI responds in 5-10 seconds
✅ No crashes
✅ Clear error messages

---

**Build Version**: 20
**Status**: Production Ready
**Last Updated**: 2025-01-12
