# App Store Rejection - Quick Action Guide
**Immediate Steps to Fix and Resubmit**

---

## ⚡ CRITICAL ACTIONS (Do These First)

### 1️⃣ Update Version in app.json (REQUIRED)
**File:** `app.json`

Change lines 5 and 19:
```json
{
  "expo": {
    "version": "1.1.0",
    "ios": {
      "buildNumber": "64"
    },
    "android": {
      "versionCode": 64
    }
  }
}
```

**Why:** Build 59-63 failed. We need build 64 with version 1.1.0.

---

### 2️⃣ Create Demo Account in Supabase (REQUIRED)

**Go to:** https://app.supabase.com → Your Project → Authentication → Users

**Click:** "Add User" or "Invite User"

**Create this EXACT account:**
```
Email: demo@motivationhub.app
Password: DemoTest2025!
```

**Important:** 
- ✅ Check "Auto Confirm User"
- ✅ Verify email is confirmed

**Add 1000 Credits to Demo Account:**

Option A - Via Supabase Dashboard:
1. Find the user in Users table
2. Click on the user
3. Update their metadata or create an entitlements record

Option B - Via SQL Editor in Supabase:
```sql
-- If you have an entitlements table
INSERT INTO entitlements (user_id, credits, is_premium, premium_expires_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'demo@motivationhub.app'),
  1000,
  true,
  2147483647000
);

-- Or update if exists
UPDATE entitlements 
SET credits = 1000, is_premium = true, premium_expires_at = 2147483647000
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@motivationhub.app');
```

Option C - Manual Login & Test:
1. Build and install app on your device
2. Sign in with demo@motivationhub.app
3. Go to Profile settings
4. Manually add credits via admin function (if you have one)

**Verify:** Sign in with demo account and check that you have 1000 credits.

---

### 3️⃣ Create IAP Products in App Store Connect (REQUIRED)

**Go to:** https://appstoreconnect.apple.com → Motivation Hub → In-App Purchases

**Create 5 Products:**

#### Product 1: 100 AI Credits
```
Type: Consumable
Product ID: com.tyrotech.motivationhub.credits.100
Reference Name: 100 AI Credits
Price: Tier 5 ($4.99 USD)
Display Name: 100 AI Credits
Description: Get 100 AI credits for chat and voice interactions with your motivational coach.
```
**Screenshot Required:** 1280x1280px showing the 100 credits package in your app

#### Product 2: 500 AI Credits
```
Type: Consumable
Product ID: com.tyrotech.motivationhub.credits.500
Reference Name: 500 AI Credits
Price: Tier 20 ($19.99 USD)
Display Name: 500 AI Credits
Description: Get 500 AI credits for extended AI conversations and voice coaching sessions.
```
**Screenshot Required:** 1280x1280px showing the 500 credits package in your app

#### Product 3: 1000 AI Credits
```
Type: Consumable
Product ID: com.tyrotech.motivationhub.credits.1000
Reference Name: 1000 AI Credits
Price: Tier 35 ($34.99 USD)
Display Name: 1000 AI Credits
Description: Maximum credits for unlimited AI interactions and voice coaching.
```
**Screenshot Required:** 1280x1280px showing the 1000 credits package in your app

#### Product 4: Premium Monthly
```
Type: Auto-Renewable Subscription
Product ID: com.tyrotech.motivationhub.premium.monthly
Reference Name: Premium Monthly
Subscription Group: Premium (create new group if needed)
Duration: 1 Month
Price: Tier 10 ($9.99 USD)
Display Name: Premium Monthly - Ad Free
Description: Remove all ads and enjoy an uninterrupted motivational experience.
```
**Screenshot Required:** 1280x1280px showing the premium monthly subscription in your app

#### Product 5: Premium Annual
```
Type: Auto-Renewable Subscription
Product ID: com.tyrotech.motivationhub.premium.annual
Reference Name: Premium Annual
Subscription Group: Premium (same as monthly)
Duration: 1 Year
Price: Tier 100 ($99.99 USD)
Display Name: Premium Annual
Description: Ad-free for a full year. Save 20% compared to monthly subscription.
```
**Screenshot Required:** 1280x1280px showing the premium annual subscription in your app

**After creating all 5 products:**
1. Select all 5 checkboxes
2. Click "Submit for Review"
3. Confirm submission

**IMPORTANT:** You need screenshots for each IAP. To get them:
1. Run app on device or simulator
2. Open Paywall modal (Profile → Upgrade or tap any "Get Credits" button)
3. Take screenshots of each product card
4. Crop to 1280x1280px if needed
5. Upload to each IAP product in App Store Connect

---

### 4️⃣ Add Demo Credentials to App Store Connect (REQUIRED)

**Go to:** App Store Connect → Motivation Hub → Version 1.1.0

**Scroll to:** "App Review Information" section

**Under "Sign-in Information":**
- ✅ Check "Sign-in required"
- Username: `demo@motivationhub.app`
- Password: `DemoTest2025!`

**Notes field:**
```
Demo account has:
- 1000 AI credits (for testing chat and voice features)
- Premium subscription enabled (for ad-free experience)
- Full access to all app features

Test Instructions:
1. Sign in with provided credentials
2. Browse speeches, scripture, and YouTube videos (all free)
3. Test AI Chat in "Chat" tab (uses credits)
4. Test Voice Coach in Profile > Voice Coach (uses credits)
5. Verify Premium status in Profile > Settings
```

**Save changes.**

---

## 🔨 BUILD & SUBMIT

### Step 5: Clean Build

**Terminal command:**
```bash
eas build --platform ios --profile production --clear-cache
```

**Wait for build to complete** (30-60 minutes)

### Step 6: Submit to TestFlight

**Automatic:** Build should auto-submit to TestFlight after completion

**OR Manual:** Download IPA and upload via Transporter app

**Wait for TestFlight processing** (1-2 hours)

### Step 7: Submit for Review

**Go to:** App Store Connect → Motivation Hub → TestFlight → Build 64

**Click:** "Submit for Review"

**Add these notes:**
```
Dear App Review Team,

Thank you for your feedback. This updated submission (v1.1.0 build 64) addresses ALL issues raised:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DEMO ACCOUNT PROVIDED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: demo@motivationhub.app
Password: DemoTest2025!

This account includes:
• 1000 AI credits (test chat and voice features)
• Premium subscription (ad-free experience)
• Full access to all app features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. IN-APP PURCHASES SUBMITTED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All 5 IAP products have been created and submitted for review:
• 100 AI Credits ($4.99)
• 500 AI Credits ($19.99)
• 1000 AI Credits ($34.99)
• Premium Monthly ($9.99/mo)
• Premium Annual ($99.99/yr)

Screenshots included for each product.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PRODUCTION-READY APP ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• All features fully functional
• No test/trial/demo limitations
• Complete and polished
• See attached FEATURES_COMPLETE.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. YOUTUBE COMPLIANCE ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Uses official YouTube player only
• No downloads or caching
• Full attribution included
• Purchases do NOT unlock YouTube content
• All YouTube videos remain FREE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Sign in with demo@motivationhub.app / DemoTest2025!
2. Browse content (Home, Scripture, Videos tabs) - ALL FREE
3. Test AI Chat (Chat tab) - uses credits
4. Test Voice Coach (Profile > Voice Coach) - uses credits
5. Check Premium status (Profile > Settings)
6. Verify no test/trial messages appear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONETIZATION CLARIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREE FOREVER:
• All motivational speeches
• All scripture content
• All YouTube videos
• Account creation
• Favorites & playlists

PREMIUM PURCHASES:
• AI Credits (for chat/voice AI features ONLY)
• Ad-Free Subscription (removes ads ONLY)

Content browsing and playback = 100% FREE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your time and consideration. All issues have been resolved.

Best regards,
Tyron Roberts
TyroTech
```

**Submit.**

---

## 📋 CHECKLIST

Before you click submit, verify:

- [ ] app.json version = 1.1.0, buildNumber = 64
- [ ] Demo account created: demo@motivationhub.app
- [ ] Demo account has 1000 credits
- [ ] Demo account has Premium enabled
- [ ] Demo credentials added to App Store Connect
- [ ] All 5 IAP products created
- [ ] All 5 IAP screenshots uploaded
- [ ] All 5 IAP products submitted for review
- [ ] Tested demo account login works
- [ ] Tested AI chat with demo account
- [ ] Tested Voice Coach with demo account
- [ ] Build 64 created successfully
- [ ] Build 64 uploaded to TestFlight
- [ ] Build 64 processed by TestFlight
- [ ] App review notes added
- [ ] Submitted for review

---

## ⏱️ TIMELINE

| Task | Time | Status |
|------|------|--------|
| Update app.json | 2 min | ⏳ |
| Create demo account | 5 min | ⏳ |
| Add credits to demo | 5 min | ⏳ |
| Create 5 IAP products | 30 min | ⏳ |
| Add demo to App Store Connect | 5 min | ⏳ |
| Run EAS build | 45 min | ⏳ |
| TestFlight processing | 90 min | ⏳ |
| Submit for review | 5 min | ⏳ |
| **Total** | **~3 hours** | |
| Apple review | 24-48 hrs | ⏳ |

---

## 🆘 TROUBLESHOOTING

### "Build failed"
- Check app.json syntax
- Verify all dependencies are installed
- Try `--clear-cache` flag

### "Can't find demo account"
- Verify email exactly: demo@motivationhub.app
- Check it's confirmed in Supabase
- Try signing in manually first

### "IAP products not showing"
- Wait 2-4 hours after creation
- Check they're in "Ready to Submit" status
- Verify Product IDs match exactly

### "TestFlight stuck"
- Wait up to 2 hours
- Check for email from Apple
- Look for compliance issues

### "Version 1.1.0 already exists"
- Use version 1.1.1 instead
- Update in app.json
- Rebuild

---

## ✅ SUCCESS INDICATORS

You'll know everything worked when:
1. ✅ Build 64 shows in TestFlight
2. ✅ All 5 IAP products show "In Review" status
3. ✅ Demo account credentials show in App Review Info
4. ✅ Build submitted for review successfully
5. ✅ You receive "Your submission is now in review" email

---

## 📧 NEED HELP?

- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **IAP Guide:** https://developer.apple.com/in-app-purchase/
- **EAS Build:** https://docs.expo.dev/build/setup/
- **App Store Connect:** https://developer.apple.com/support/app-store-connect/

---

**Good luck! 🍀 You've got this!**
