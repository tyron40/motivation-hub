# 🚀 AdMob Quick Start - TestFlight Ready

## ✅ What Was Fixed

1. ✅ Added `react-native-google-mobile-ads` dependency
2. ✅ Configured AdMob plugin in app.json with App ID
3. ✅ Created centralized AdMob configuration
4. ✅ Fixed __DEV__ logic that broke TestFlight ads
5. ✅ Created EAS build configuration
6. ✅ Updated all components to use centralized config

## 🎯 Your AdMob IDs (Configured)

**App ID:** `ca-app-pub-7788769813708919~4966903177`
- ✅ Configured in app.json for iOS and Android

**Ad Unit IDs:**
- Rewarded: `ca-app-pub-7788769813708919/3545832687`
- Interstitial: `ca-app-pub-7788769813708919/4053276756`
- Banner: `ca-app-pub-7788769813708919/4858914356`

## 🚀 Run These Commands NOW

### 1. Install Dependencies
```bash
npm install
```

### 2. Regenerate Native Projects
```bash
npx expo prebuild --clean
```

### 3. Build for TestFlight
```bash
eas build --platform ios --profile production
```

### 4. Build for Android
```bash
eas build --platform android --profile production
```

## 📱 Testing in TestFlight

1. Install TestFlight build on device
2. Open app → Navigate to earn credits
3. Tap "Watch Ad"
4. **Real AdMob ad will load and play**
5. Complete ad → Earn 10 credits

## ⚠️ Important Notes

- **Expo Go will NOT show real ads** (shows simulations)
- **TestFlight WILL show real ads** (production build)
- **Web is safe** (no crashes, shows placeholders)
- **Premium users** see "Premium User" message (no ads)

## 🐛 If Ads Don't Show

1. Check AdMob dashboard - app must be approved (24-48 hours)
2. Verify ad units are "Active" in AdMob
3. Confirm you're testing in TestFlight, not Expo Go
4. Check console logs for errors

## 📚 Full Documentation

See `ADMOB_FIX_COMPLETE.md` for detailed information.

---

**Next Step:** Run `npm install` to get started! 🎉
