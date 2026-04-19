# ⚡ Quick Setup Guide - Payment Methods

## 🚀 5-Step Setup (Total: ~1 hour)

### Step 1: RevenueCat Account (5 min)
1. Go to https://app.revenuecat.com → Sign up
2. Create project "Motivation Hub"
3. Add iOS app: `app.rork.motivational-speech-app`
4. Upload App Store Connect API key
5. Copy iOS API key (starts with `appl_`)

### Step 2: App Store Products (15 min)
Go to App Store Connect → In-App Purchases

**3 Consumables:**
```
mh_credits_100    → $4.99
mh_credits_500    → $19.99  
mh_credits_1000   → $34.99
```

**1 Subscription Group + 2 Subscriptions:**
```
Group: Premium Membership
  ├─ mh_premium_monthly  → $9.99/month
  └─ mh_premium_annual   → $99.99/year
```

Submit all for review!

### Step 3: RevenueCat Products (10 min)
In RevenueCat dashboard:
1. Create entitlement "premium"
2. Add 5 products (match App Store IDs above)
3. Create offering "default"
4. Add all products to offering
5. Set as current

### Step 4: Add API Key (2 min)
Create `.env` in project root:
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_YOUR_KEY_FROM_STEP_1
```

### Step 5: Test (30 min)
1. Create sandbox tester in App Store Connect
2. Build: `eas build --profile development --platform ios`
3. Install, sign out of Apple ID
4. Make test purchase
5. Sign in with sandbox account
6. Verify in RevenueCat dashboard

---

## 📋 Product IDs Quick Copy

```typescript
// Consumables
mh_credits_100
mh_credits_500
mh_credits_1000

// Subscriptions
mh_premium_monthly
mh_premium_annual
```

---

## 🔗 Important Links

- **RevenueCat Dashboard**: https://app.revenuecat.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Create Sandbox Tester**: App Store Connect → Users & Access → Sandbox

---

## 🎯 Testing Checklist

Quick test before submission:
- [ ] Purchase 100 credits → Balance +100
- [ ] Subscribe to Premium → Ads gone
- [ ] Restore Purchases → Works
- [ ] Demo account works (`demo@motivationhub.app` / `Demo2025!`)

---

## 🆘 Quick Fixes

**Products not loading?**
→ Wait 5-10 min, check API key in `.env`, restart app

**Purchase fails?**
→ Verify sandbox account, check product IDs match

**Keys not working?**
→ Make sure `.env` file exists, restart Expo

---

## 📖 Full Guides

- Detailed setup: `REVENUECAT_SETUP.md`
- Complete docs: `READY_FOR_PRODUCTION.md`
- Demo account: `DEMO_LOGIN.md`

---

**Need help?** Check the detailed guides above or contact RevenueCat support.

**Ready?** Follow steps 1-5 above, then you're done! 🎉
