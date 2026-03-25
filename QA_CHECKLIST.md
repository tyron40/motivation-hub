# QA Checklist for App Store Submission
## Motivation Hub - IAP & YouTube Compliance

**Version:** 1.0 (Build 58)  
**Date:** October 24, 2025  
**Reviewer:** ___________________

---

## ✅ YouTube API Compliance

### YouTube Player & Content Access
- [ ] YouTube videos are embedded using official YouTube iFrame player
- [ ] All YouTube videos play WITHOUT requiring purchase
- [ ] YouTube content is accessible to all users (free and premium)
- [ ] YouTube branding and controls are fully visible
- [ ] No ad blocking or ad removal for YouTube content
- [ ] No offline downloading or caching of YouTube videos
- [ ] No background playback for YouTube content (unless user has YouTube Premium)
- [ ] Video cards display "Source: YouTube" attribution
- [ ] Only YouTube Data API v3 endpoints are used (search.list, videos.list, playlistItems.list)

### YouTube Disclaimers
- [ ] Paywall modal includes YouTube disclaimer:
  > "Purchases apply only to AI features (chat credits, premium voices, higher usage limits). YouTube videos are provided by YouTube and remain free; purchases do not unlock or alter YouTube content."
- [ ] All IAP-related screens clearly state YouTube content is free
- [ ] No marketing copy suggests YouTube content can be purchased

---

## ✅ In-App Purchases (IAP)

### IAP Configuration
- [ ] All 5 product IDs created in App Store Connect:
  - `com.tyrotech.motivationhub.credits.100` ($4.99)
  - `com.tyrotech.motivationhub.credits.500` ($19.99)
  - `com.tyrotech.motivationhub.credits.1000` ($34.99)
  - `com.tyrotech.motivationhub.premium.monthly` ($9.99/mo)
  - `com.tyrotech.motivationhub.premium.annual` ($99.99/yr)
- [ ] Products submitted for review in App Store Connect
- [ ] Product descriptions do NOT mention YouTube
- [ ] Screenshots show paywall with disclaimer

### IAP Functionality
- [ ] Paywall modal displays correctly
- [ ] All 5 products are visible with correct pricing
- [ ] Purchase flow completes successfully (sandbox or production)
- [ ] Credits are added to balance after purchase
- [ ] Premium subscription activates after purchase
- [ ] "Restore Purchases" button works
- [ ] Purchase errors are handled gracefully
- [ ] No purchases required to access YouTube content

### AI Features (Paid)
- [ ] Chat with AI coach requires credits or premium
- [ ] TTS voice generation requires credits or premium
- [ ] Premium voices (echo, fable, onyx) locked for free users
- [ ] Free users limited to 10 chat messages per day
- [ ] Free users limited to 5 TTS generations per day
- [ ] Daily limits reset at midnight (UTC)
- [ ] Premium users bypass all daily limits

---

## ✅ App Store Guidelines

### Guideline 5.2.3 - YouTube Compliance
- [ ] `YOUTUBE_API_COMPLIANCE.md` completed and signed
- [ ] `APP_REVIEW_RESPONSE.md` ready to submit
- [ ] Compliance guard module (`lib/youtube-compliance.ts`) enforces ToS
- [ ] No video download functions exist in codebase
- [ ] YouTube API key stored securely on backend (not in client code)
- [ ] Rate limiting implemented for YouTube API calls

### Guideline 5.1.1 - Privacy
- [ ] `NSMicrophoneUsageDescription` includes use case and example
- [ ] `NSPhotoLibraryUsageDescription` includes use case and example
- [ ] `NSCameraUsageDescription` includes use case and example
- [ ] No photo library access requested on first launch
- [ ] No microphone access requested on first launch

### Guideline 2.5.4 - Background Audio
- [ ] `UIBackgroundModes: ["audio"]` only used for app's native audio player
- [ ] YouTube videos do NOT play in background
- [ ] Background audio playback tested and verified

### General App Review
- [ ] Terms of Service link works (https://rork.com/terms)
- [ ] Privacy Policy link works (https://rork.com/privacy)
- [ ] App does not crash on launch
- [ ] App handles network errors gracefully
- [ ] All screens render correctly on iPhone and iPad
- [ ] Dark mode support (if applicable)
- [ ] Accessibility labels added (testID)

---

## ✅ Technical Implementation

### Frontend
- [ ] `IAPProvider` added to `app/_layout.tsx`
- [ ] `PaywallModal` component tested
- [ ] YouTube attribution visible on all video cards
- [ ] No console errors in production build
- [ ] TypeScript errors resolved
- [ ] Lint errors resolved

### Backend
- [ ] Supabase migration (`001_iap_tables.sql`) executed
- [ ] Tables created: `iap_transactions`, `credit_ledger`, `subscriptions`, `user_entitlements`
- [ ] RPC functions tested: `grant_credits`, `deduct_credits`, `activate_subscription`, `get_user_entitlements`
- [ ] Row Level Security (RLS) policies enabled
- [ ] (Optional) tRPC endpoints implemented: `iap.validate`, `iap.entitlements`, `iap.asn`

### Environment Variables
- [ ] `APPLE_IAP_SHARED_SECRET` set in Vercel (if backend implemented)
- [ ] `YOUTUBE_API_KEY` set in Vercel
- [ ] All secrets NOT exposed in client code

---

## ✅ Compliance Documentation

### Files to Submit
- [ ] `YOUTUBE_API_COMPLIANCE.md` attached to submission
- [ ] `APP_REVIEW_RESPONSE.md` pasted into App Review notes
- [ ] Screenshots of paywall with YouTube disclaimer
- [ ] Screenshots of video cards with YouTube attribution

### Documentation Completeness
- [ ] Developer name and signature in `YOUTUBE_API_COMPLIANCE.md`
- [ ] Contact email in `YOUTUBE_API_COMPLIANCE.md`
- [ ] Google Cloud Project ID in `YOUTUBE_API_COMPLIANCE.md`
- [ ] Date filled in `YOUTUBE_API_COMPLIANCE.md`

---

## ✅ Testing Scenarios

### Test Case 1: Free User Journey
1. [ ] Launch app as new user
2. [ ] Browse YouTube videos → can watch all videos
3. [ ] Try to chat with AI coach → see "10 free messages per day" message
4. [ ] Send 10 chat messages → see paywall after 10th message
5. [ ] Do NOT purchase → can still watch YouTube videos

### Test Case 2: Purchase Credits
1. [ ] Tap "Get Credits" on paywall
2. [ ] Select "500 Credits" product
3. [ ] Complete purchase (sandbox)
4. [ ] Verify balance shows 500 credits
5. [ ] Send chat messages → credits deduct
6. [ ] YouTube videos still free

### Test Case 3: Purchase Premium
1. [ ] Tap "Go Premium" on paywall
2. [ ] Select "Premium Monthly" product
3. [ ] Complete purchase (sandbox)
4. [ ] Verify "Premium Active" badge appears
5. [ ] Send unlimited chat messages → no credit deduction
6. [ ] Use premium voices (echo, fable, onyx)
7. [ ] YouTube videos still free

### Test Case 4: Restore Purchases
1. [ ] Delete and reinstall app
2. [ ] Sign in with same Apple ID
3. [ ] Open paywall → tap "Restore Purchases"
4. [ ] Verify premium status and credits restored

### Test Case 5: YouTube Compliance
1. [ ] Open any YouTube video
2. [ ] Verify video plays in official YouTube player
3. [ ] Verify YouTube branding visible
4. [ ] Try to play in background → does NOT work (unless YouTube Premium)
5. [ ] Turn off internet → video does NOT play (no offline caching)

---

## ✅ Pre-Submission Checklist

### App Store Connect
- [ ] Build number incremented (58 or higher)
- [ ] Version number set (1.0.0)
- [ ] App screenshots uploaded
- [ ] App description does NOT mention YouTube paywalls
- [ ] Keywords do NOT include "YouTube Premium", "ad-free YouTube", etc.
- [ ] All in-app purchases submitted for review
- [ ] Pricing tiers set correctly

### EAS Build
- [ ] iOS build completed: `eas build -p ios --profile production`
- [ ] Build uploaded to App Store Connect
- [ ] TestFlight build available (optional for testing)

### Final Verification
- [ ] No hardcoded API keys or secrets in source code
- [ ] All environment variables set in Vercel/hosting
- [ ] Backend endpoints tested and working
- [ ] Database migrations applied to production
- [ ] Monitoring and error tracking enabled (Sentry, etc.)

---

## ✅ App Review Notes

**Paste this in App Store Connect → Version Information → App Review Information → Notes:**

```
Version 1.0 (Build 58) addresses Guideline 5.2.3 concerns.

YOUTUBE API COMPLIANCE:
- All videos embedded using official YouTube iFrame Player
- No downloads, caching, or offline playback
- YouTube content is FREE and accessible to all users
- Purchases apply ONLY to AI features (chat credits, premium voices)
- Full compliance statement attached (YOUTUBE_API_COMPLIANCE.md)

IAP IMPLEMENTATION:
- 5 products: 3 credit packs + 2 premium subscriptions
- Paywall includes clear YouTube disclaimer
- AI features (chat, TTS, premium voices) are monetized
- YouTube features remain completely free

TESTING:
- Browse videos: All accessible without purchase
- Attempt purchase: Disclaimer clearly states YouTube is free
- Check attribution: Every video shows "Source: YouTube"
```

---

## ✅ Post-Submission

### If Approved
- [ ] Celebrate! 🎉
- [ ] Monitor crash reports and user feedback
- [ ] Track IAP revenue in App Store Connect
- [ ] Respond to user reviews

### If Rejected
- [ ] Review rejection reason carefully
- [ ] Check which guideline was violated
- [ ] Make necessary changes
- [ ] Update `APP_REVIEW_RESPONSE.md` with additional clarification
- [ ] Resubmit with detailed response

---

## Sign-Off

**QA Completed By:** ___________________  
**Date:** ___________________  
**Build Tested:** ___________________  
**Result:** ☐ PASS  ☐ FAIL  ☐ NEEDS REVISION

**Notes:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

**Ready for Submission:** ☐ YES  ☐ NO

**Submitted to App Store Connect:** ☐ YES  ☐ NO  
**Submission Date:** ___________________  
**Submission ID:** ___________________

---

## Additional Resources

- YouTube API Services ToS: https://developers.google.com/youtube/terms/api-services-terms-of-service
- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Expo In-App Purchases Docs: https://docs.expo.dev/versions/latest/sdk/in-app-purchases/
- IAP Implementation Guide: `IAP_IMPLEMENTATION_GUIDE.md`
