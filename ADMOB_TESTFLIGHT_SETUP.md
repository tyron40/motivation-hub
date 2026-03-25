# AdMob Real Ads Setup for TestFlight

## ✅ What's Been Configured

Your app now uses **real AdMob rewarded ads** instead of simulations.

### 1. **AdMob Context Updated** (`hooks/admob-context.tsx`)
- Dynamically loads `react-native-google-mobile-ads` on native platforms
- Falls back to simulation mode in Rork preview/web
- Initializes AdMob SDK on app launch
- Creates real rewarded and interstitial ad instances
- Handles ad lifecycle events (LOADED, EARNED_REWARD, CLOSED)

### 2. **App Configuration** (`app.json`)
- Added AdMob plugin with your App IDs
- iOS App ID: `ca-app-pub-7788769813708919~3545832687`
- Android App ID: `ca-app-pub-7788769813708919~4858914356`

### 3. **Ad Unit IDs Configured**
```typescript
Rewarded Ad: ca-app-pub-7788769813708919/3545832687
Interstitial Ad: ca-app-pub-7788769813708919/4053276756
Banner Ad: ca-app-pub-7788769813708919/4858914356
```

## 📱 How It Works

### In Rork Preview / Expo Go
- Shows **simulated ads** with Alert dialogs
- Grants 10 credits when user completes simulation
- Message: "This is simulated. Real ads will show in TestFlight/production builds."

### In TestFlight / Production
- Loads and shows **real Google AdMob ads**
- User watches 30-second video ad
- Grants 10 credits when user completes ad
- Automatically reloads next ad after closing

## 🎯 Testing in TestFlight

1. **Build and upload to TestFlight**
   ```bash
   # Rork will build with the AdMob plugin
   # Upload to TestFlight via Rork dashboard
   ```

2. **Install TestFlight build on real device**

3. **Test rewarded ads**:
   - Open app → Credits/Settings screen
   - Tap "Watch Ad" button
   - Real AdMob ad should load and show
   - Complete the ad
   - 10 credits should be added to your account

4. **Check console logs** (if using Xcode/device logs):
   ```
   📺 Initializing AdMob SDK...
   ✅ AdMob SDK initialized
   📺 Creating rewarded ad instance...
   ✅ Rewarded ad loaded
   📺 Showing real rewarded ad...
   🎁 Reward earned: [reward details]
   ```

## 💰 Revenue & Credits

- **Each rewarded ad watched**: +10 credits
- **Credits usage**: 1 credit per AI chat/voice interaction
- **Premium users**: Ads are disabled (isAdFree = true)

## 🔧 AdMob Dashboard Setup Checklist

Make sure these are configured in your AdMob account:

- [ ] App registered in AdMob
- [ ] Ad Units created (Rewarded, Interstitial, Banner)
- [ ] Ad Units activated and serving ads
- [ ] App-ads.txt verified (if required)
- [ ] Payment settings configured
- [ ] Test device registered for testing

## 🚨 Troubleshooting

### "Ad Not Ready" Error
- Ad is still loading
- Wait a few seconds and try again
- Check internet connection

### No Ads Showing
- AdMob account needs approval (can take 24-48 hours)
- Ad Units not activated
- Region/country not supported
- Ad inventory temporarily empty

### Still Seeing Simulations in TestFlight
- Make sure you're using a **production build**, not Expo Go
- Check console logs for initialization errors
- Verify AdMob App IDs match in app.json

## 📊 What Happens Next

1. **First Launch**: AdMob SDK initializes
2. **Ad Loading**: Rewarded ad loads in background
3. **User Taps Button**: Shows loaded ad immediately
4. **Ad Completes**: User earns 10 credits
5. **Auto-Reload**: Next ad loads automatically

## 🎁 Credit System Integration

The rewarded ads are fully integrated with your IAP credit system:

- Credits stored in AsyncStorage (persistent)
- Synced with RevenueCat entitlements
- Protected against duplicate rewards
- Works with guest and authenticated users
- Demo account has unlimited credits

## 🛡️ Premium Ad-Free Experience

Premium subscribers (via RevenueCat):
- `usageStats.isAdFree = true`
- `showRewardedAd()` shows "Premium User" alert
- No ads displayed
- Unlimited AI features (via premium entitlements)

---

**Ready for TestFlight!** 🚀

Your app will show real AdMob ads in production builds while falling back to simulations in dev/preview mode.
