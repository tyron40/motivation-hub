# RevenueCat Setup Guide for Motivation Hub

## Overview

This guide will walk you through setting up RevenueCat for in-app purchases in your Motivation Hub app.

---

## Step 1: Create RevenueCat Account

1. Go to [https://app.revenuecat.com/](https://app.revenuecat.com/)
2. Sign up for a free account
3. Create a new project called "Motivation Hub"

---

## Step 2: Configure App in RevenueCat

### iOS Configuration

1. In RevenueCat dashboard, go to **Project Settings** → **Apps**
2. Click **+ New** button
3. Select **iOS** platform
4. Enter your Bundle ID: `app.rork.motivational-speech-app`
5. Enter your App Name: `Motivation Hub`
6. **App Store Connect Configuration:**
   - Go to App Store Connect → Users and Access → Keys
   - Create a new API Key (if you don't have one)
   - Download the key file (.p8)
   - Note the Issuer ID and Key ID
   - Upload these to RevenueCat
7. Click **Save**

### Android Configuration (Optional for future)

1. Click **+ New** button again
2. Select **Android** platform
3. Enter your Package Name: `app.rork.motivational-speech-app`
4. Upload your Google Play service account JSON key
5. Click **Save**

---

## Step 3: Create Products in App Store Connect

Before creating products in RevenueCat, you need to create them in App Store Connect first.

### Create In-App Purchase Products

Go to App Store Connect → Your App → In-App Purchases:

#### Consumables (Credits)

1. **100 Credits**
   - Product ID: `mh_credits_100`
   - Reference Name: 100 AI Credits
   - Price: $4.99 (Tier 5)
   - Description: Get 100 AI credits for chat and voice interactions

2. **500 Credits**
   - Product ID: `mh_credits_500`
   - Reference Name: 500 AI Credits
   - Price: $19.99 (Tier 20)
   - Description: Get 500 AI credits for extended AI conversations

3. **1000 Credits**
   - Product ID: `mh_credits_1000`
   - Reference Name: 1000 AI Credits
   - Price: $34.99 (Tier 35)
   - Description: Maximum credits for unlimited AI interactions

#### Auto-Renewable Subscriptions (Premium)

Create a Subscription Group called "Premium Membership", then add:

1. **Premium Monthly**
   - Product ID: `mh_premium_monthly`
   - Reference Name: Premium Monthly - Ad Free
   - Duration: 1 Month
   - Price: $9.99/month (Tier 10)
   - Description: Remove all ads and enjoy an uninterrupted experience

2. **Premium Annual**
   - Product ID: `mh_premium_annual`
   - Reference Name: Premium Annual - Ad Free
   - Duration: 1 Year
   - Price: $99.99/year (Tier 100)
   - Description: Ad-free for a year. Save 20% compared to monthly

**Important:** Make sure to submit all products for review in App Store Connect!

---

## Step 4: Create Products in RevenueCat

### Create Entitlement

1. Go to **Entitlements** in RevenueCat dashboard
2. Click **+ New**
3. Create an entitlement called **"premium"**
4. This will be used to check if user has active premium subscription

### Create Products

Now create products that match your App Store Connect products:

1. Go to **Products** tab
2. For each product, click **+ New**:

#### Credits Products

- **Product ID:** `mh_credits_100` (must match App Store Connect)
- **Type:** Consumable
- **Entitlement:** None (credits are tracked separately)

- **Product ID:** `mh_credits_500`
- **Type:** Consumable
- **Entitlement:** None

- **Product ID:** `mh_credits_1000`
- **Type:** Consumable
- **Entitlement:** None

#### Premium Products

- **Product ID:** `mh_premium_monthly`
- **Type:** Auto-renewable subscription
- **Entitlement:** premium
- **Duration:** 1 month

- **Product ID:** `mh_premium_annual`
- **Type:** Auto-renewable subscription
- **Entitlement:** premium
- **Duration:** 1 year

### Create Offering

1. Go to **Offerings** tab
2. Create a new offering called **"default"**
3. Add all 5 products to this offering
4. Set it as current offering
5. **Package Configuration:**
   - For each product, create a package:
     - 100 Credits → Package identifier: `credits_100`
     - 500 Credits → Package identifier: `credits_500`
     - 1000 Credits → Package identifier: `credits_1000`
     - Monthly Premium → Package identifier: `premium_monthly`
     - Annual Premium → Package identifier: `premium_annual`

---

## Step 5: Get API Keys

1. In RevenueCat dashboard, go to **Project Settings** → **API Keys**
2. You'll see two keys:
   - **iOS Public SDK Key** (starts with `appl_...`)
   - **Android Public SDK Key** (starts with `goog_...`)
3. Copy these keys

---

## Step 6: Add Keys to Your App

Create a `.env` file in your project root (if you don't have one):

```bash
# Copy from .env.example
cp .env.example .env
```

Then add your RevenueCat keys:

```env
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_YOUR_IOS_KEY_HERE
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YOUR_ANDROID_KEY_HERE
```

**Important:** Never commit `.env` to git! It's already in `.gitignore`.

---

## Step 7: Update Product IDs in Code

The product IDs are already configured in `constants/iap.ts`. Just verify they match:

```typescript
export const IAP_PRODUCT_IDS = {
  CREDITS_100: 'mh_credits_100',
  CREDITS_500: 'mh_credits_500',
  CREDITS_1000: 'mh_credits_1000',
  PREMIUM_MONTHLY: 'mh_premium_monthly',
  PREMIUM_ANNUAL: 'mh_premium_annual',
} as const;
```

---

## Step 8: Testing with Sandbox

### Create Sandbox Tester

1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Create a new sandbox tester account
3. Use a unique email (it doesn't need to be real)
4. Remember the password

### Test on Device

1. Build your app for testing:
   ```bash
   eas build --profile development --platform ios
   ```

2. Install on your device

3. Sign out of your real Apple ID in Settings → App Store

4. Launch Motivation Hub

5. Try to make a purchase

6. When prompted, sign in with your sandbox tester account

7. Complete the purchase (you won't be charged)

### Verify Purchase

Check in RevenueCat dashboard:
1. Go to **Customers**
2. Find your test user
3. You should see the purchase listed

---

## Step 9: Handle Webhooks (Optional but Recommended)

For production, set up webhooks to handle subscription lifecycle events:

1. In RevenueCat, go to **Integrations**
2. Set up a webhook endpoint on your backend
3. URL example: `https://your-backend.vercel.app/api/webhooks/revenuecat`
4. This will notify you of subscription renewals, cancellations, etc.

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to iTunes Store"

**Solution:** Make sure you're signed in with a sandbox account and have internet connection.

### Issue: "Product not found"

**Solutions:**
1. Verify product IDs match exactly between App Store Connect and RevenueCat
2. Make sure products are submitted for review in App Store Connect
3. Wait a few minutes after creating products (can take time to sync)
4. Try calling `Purchases.syncPurchases()` in your app

### Issue: "Purchases not showing in app"

**Solutions:**
1. Check RevenueCat API keys are correct in `.env`
2. Make sure `.env` is being loaded (restart Expo dev server)
3. Check console logs for RevenueCat initialization errors
4. Verify offering is set as "current" in RevenueCat dashboard

### Issue: "Invalid credentials"

**Solution:** Your App Store Connect API key might be incorrect. Re-upload in RevenueCat.

---

## Testing Checklist

Before going to production, test:

- [ ] Purchase 100 credits → balance increases by 100
- [ ] Purchase 500 credits → balance increases by 500
- [ ] Purchase 1000 credits → balance increases by 1000
- [ ] Subscribe to monthly premium → ads removed, premium badge shows
- [ ] Subscribe to annual premium → ads removed, premium badge shows
- [ ] Restore purchases → previous purchases restored
- [ ] Cancel subscription → premium expires at end of period (not immediately)
- [ ] Expired subscription → premium badge removed, ads return
- [ ] Multiple purchases → credits stack correctly

---

## Production Deployment

### Before Submitting to App Store

1. **Test thoroughly** with sandbox accounts
2. **Enable webhooks** for subscription management
3. **Add privacy policy** link (required for subscriptions)
4. **Add terms of service** link
5. **Create app screenshots** showing purchase flow
6. **Prepare demo account** for App Review (if needed)

### App Review Tips

- Be clear that purchases are for **AI features only**
- Include YouTube disclaimer on paywall
- Show restore purchases button prominently
- Provide test account credentials in App Review notes
- Explain what each purchase unlocks

### After App Store Approval

1. Monitor RevenueCat dashboard for purchases
2. Set up alerts for failed payments
3. Monitor subscription metrics (churn rate, MRR, etc.)
4. Consider implementing promotional offers
5. A/B test pricing if needed

---

## Support

- **RevenueCat Docs:** https://docs.revenuecat.com/
- **RevenueCat Support:** support@revenuecat.com
- **Community Forum:** https://community.revenuecat.com/

---

## Cost Estimate

RevenueCat pricing:
- **Free tier:** Up to $2,500/month in tracked revenue
- **Starter:** $60/month for up to $10k in revenue
- **Pro:** Custom pricing for larger apps

For a new app, the free tier should be sufficient initially.

---

**Last Updated:** October 30, 2025  
**Version:** 1.0
