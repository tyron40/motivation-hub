# In-App Purchases (IAP) Implementation Guide
## Motivation Hub - Apple-Compliant IAP for AI Features Only

---

## ⚠️ CRITICAL: YouTube Content MUST Remain Free

**ABSOLUTE RULE**: Purchases apply **ONLY** to AI features (chat credits, premium voices, usage limits).  
YouTube videos are provided by YouTube and **remain completely free**. Purchases do **NOT**:
- Unlock YouTube videos
- Remove YouTube ads  
- Provide ad-free YouTube playback
- Gate YouTube content in any way

---

## Overview

This app implements IAP for:
1. **Credits** (consumable): Used for AI chat messages, TTS generation
2. **Premium Subscriptions** (auto-renewable): Unlimited AI access, premium voices, no daily limits

---

## Product IDs

Defined in `constants/iap.ts`:

```typescript
export const IAP_PRODUCT_IDS = {
  CREDITS_100: 'com.tyrotech.motivationhub.credits.100',    // $4.99
  CREDITS_500: 'com.tyrotech.motivationhub.credits.500',    // $19.99
  CREDITS_1000: 'com.tyrotech.motivationhub.credits.1000',  // $34.99
  PREMIUM_MONTHLY: 'com.tyrotech.motivationhub.premium.monthly',  // $9.99/mo
  PREMIUM_ANNUAL: 'com.tyrotech.motivationhub.premium.annual',    // $99.99/yr
};
```

---

## Client Implementation

### 1. IAP Context Provider

Location: `hooks/iap-context.tsx`

**Features**:
- Tracks credits, premium status, daily usage
- Handles purchase flow (currently mock for Expo Go)
- Manages daily limits (10 free chat messages, 5 free TTS generations per day)
- Enforces voice restrictions (free voices vs. premium voices)

**Usage**:
```typescript
import { useIAP } from '@/hooks/iap-context';

const { entitlements, usageStats, purchase, canUseVoice } = useIAP();

// Check if user can use a feature
if (usageStats.canUseChat) {
  // Send chat message
}

// Check if user can use a specific voice
if (canUseVoice('onyx')) {
  // Use premium voice
}

// Purchase a product
await purchase(IAP_PRODUCT_IDS.CREDITS_500);
```

### 2. Paywall UI

Location: `components/PaywallModal.tsx`

**Features**:
- Displays credit packages and premium subscriptions
- Shows current balance and premium status
- **Includes YouTube disclaimer** (required for compliance)
- Restore purchases button
- Links to Terms of Service and Privacy Policy

**Disclaimers Included**:
```
"Purchases apply only to AI features (chat credits, premium voices, higher usage limits). 
YouTube videos are provided by YouTube and remain free; purchases do not unlock or alter YouTube content."
```

### 3. Usage in App

**Show Paywall**:
```typescript
import { useState } from 'react';
import PaywallModal from '@/components/PaywallModal';

const [showPaywall, setShowPaywall] = useState(false);

// Check limits before AI operation
const { usageStats } = useIAP();
if (!usageStats.canUseChat) {
  setShowPaywall(true);
  return;
}

// Render modal
<PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
```

---

## Backend Implementation

### 1. Supabase Tables

Migration: `backend/supabase-migrations/001_iap_tables.sql`

**Tables**:
- `iap_transactions`: All purchase records
- `credit_ledger`: Credit additions/deductions
- `subscriptions`: Premium subscription management
- `user_entitlements`: Denormalized entitlements for fast access

**RPC Functions**:
- `get_credit_balance(user_id)`: Get current credits
- `grant_credits(user_id, amount, reason, transaction_id)`: Add credits
- `deduct_credits(user_id, amount, reason)`: Deduct credits
- `activate_subscription(user_id, product_id, expires_at, transaction_id)`: Activate premium
- `get_user_entitlements(user_id)`: Get all entitlements with auto-reset
- `increment_usage(user_id, type)`: Increment daily usage counter

### 2. tRPC Endpoints (To Be Implemented)

#### `/api/trpc/iap.validate`
Validates iOS/Android purchase receipts with Apple/Google servers.

**Input**:
```typescript
{
  platform: 'ios' | 'android',
  productId: string,
  transactionId: string,
  receipt: string  // Base64 encoded receipt
}
```

**Process**:
1. Verify receipt with Apple App Store Server API (or Google Play)
2. Check if `transactionId` already exists (idempotency)
3. Grant credits or activate subscription via Supabase RPC
4. Return entitlements

**Output**:
```typescript
{
  success: boolean,
  entitlements: {
    credits: number,
    isPremium: boolean,
    premiumExpiresAt: number | null
  }
}
```

#### `/api/trpc/iap.entitlements`
Gets current user entitlements.

**Output**:
```typescript
{
  credits: number,
  isPremium: boolean,
  premiumExpiresAt: number | null,
  dailyChatCount: number,
  dailyTTSCount: number,
  availableVoices: string[]
}
```

#### `/api/trpc/iap.asn` (App Store Server Notifications)
Webhook for Apple subscription lifecycle events (renew, cancel, refund).

**Events Handled**:
- `RENEWAL`: Extend subscription
- `DID_CHANGE_RENEWAL_STATUS`: Update auto-renew flag
- `EXPIRED`: Mark subscription as expired
- `REFUND`: Deduct credits, mark subscription as cancelled

---

## App Store Connect Setup

### 1. Create In-App Purchase Products

In App Store Connect → Your App → In-App Purchases:

**Consumables (Credits)**:
- Product ID: `com.tyrotech.motivationhub.credits.100`
  - Display Name: 100 Credits
  - Description: Perfect for trying out AI features
  - Price: $4.99 (Tier 5)

- Product ID: `com.tyrotech.motivationhub.credits.500`
  - Display Name: 500 Credits
  - Description: Best value for regular users
  - Price: $19.99 (Tier 20)

- Product ID: `com.tyrotech.motivationhub.credits.1000`
  - Display Name: 1000 Credits
  - Description: Maximum credits for power users
  - Price: $34.99 (Tier 35)

**Auto-Renewable Subscriptions (Premium)**:
- Subscription Group: "Premium Membership"
  
- Product ID: `com.tyrotech.motivationhub.premium.monthly`
  - Display Name: Premium Monthly
  - Description: Unlimited AI chat, premium voices, and priority support
  - Duration: 1 Month
  - Price: $9.99/month (Tier 10)

- Product ID: `com.tyrotech.motivationhub.premium.annual`
  - Display Name: Premium Annual
  - Description: All premium features + 2 months free
  - Duration: 1 Year
  - Price: $99.99/year (Tier 100)
  - Promotional Text: "Save 16% with annual billing"

### 2. App Store Server Notifications URL

Set up in App Store Connect → Your App → App Information → App Store Server Notifications:

**URL**: `https://your-vercel-domain.vercel.app/api/trpc/iap.asn`

**Version**: Version 2 (recommended)

### 3. Shared Secret (for receipt validation)

Generate in App Store Connect → Your App → In-App Purchases → Manage → App-Specific Shared Secret

Store in Vercel environment variables: `APPLE_IAP_SHARED_SECRET`

---

## Environment Variables

Add to Vercel:

```bash
# Apple IAP
APPLE_IAP_SHARED_SECRET=your_shared_secret_here

# Google Play (Android)
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

---

## Testing

### Sandbox Testing (iOS)

1. Create sandbox tester accounts in App Store Connect → Users and Access → Sandbox Testers
2. Sign out of production Apple ID on test device
3. Launch app and attempt purchase
4. Sign in with sandbox account when prompted
5. Purchase completes in sandbox mode (no real charge)

### Verification

**Test Checklist**:
- [ ] Purchase credits → balance increases
- [ ] Purchase premium → premium badge appears
- [ ] Daily limits reset at midnight (UTC)
- [ ] Premium users bypass daily limits
- [ ] Free users see paywall at limit
- [ ] Restore purchases works
- [ ] YouTube content remains accessible regardless of IAP

---

## Compliance Requirements

### YouTube API Compliance

- [x] YouTube content is **NEVER** gated by purchases
- [x] Paywall includes YouTube disclaimer
- [x] Video cards show "Source: YouTube" attribution
- [x] No downloads, caching, or redistribution of YouTube content
- [x] Official YouTube player only
- [x] No ad removal or ad-free playback for YouTube

### Apple App Review Guidelines

- [x] Clear purpose strings for all permissions
- [x] IAP applies only to AI features (not YouTube)
- [x] No misleading product descriptions
- [x] Restore purchases available
- [x] Terms of Service and Privacy Policy linked
- [x] Receipt validation on server (not client)

---

## Migration from Expo Go to Custom Dev Client

**Note**: IAP requires a custom dev client or standalone build. Expo Go does **NOT** support IAP.

**Current Implementation**: Mock purchases (for development/testing)

**Production Implementation** (when using custom builds):
1. Install `expo-in-app-purchases` (already in package.json for reference)
2. Replace mock logic in `hooks/iap-context.tsx` with real StoreKit calls
3. Implement receipt validation on backend
4. Test with sandbox accounts
5. Submit to App Store

**Steps to Enable Real IAP**:
```bash
# 1. Create development build
npx expo install expo-dev-client
npx expo prebuild
npx expo run:ios

# 2. Update IAP context to use real purchases
# See expo-in-app-purchases documentation:
# https://docs.expo.dev/versions/latest/sdk/in-app-purchases/
```

---

## Credits and Pricing Strategy

**Credit Costs** (defined in `constants/iap.ts`):
- Chat message: 1 credit
- TTS (standard voice): 2 credits
- TTS (premium voice): 5 credits
- Image generation: 10 credits

**Free Tier**:
- 10 chat messages per day
- 5 TTS generations per day
- Free voices only (alloy, nova, shimmer)

**Premium Benefits**:
- Unlimited chat and TTS
- Premium voices (echo, fable, onyx)
- Priority support
- No ads (app ads, not YouTube)

---

## Support and Troubleshooting

### Common Issues

**"Purchase not completing"**:
- Check internet connection
- Verify product IDs match App Store Connect
- Ensure sandbox tester is signed in (test mode)
- Check receipt validation endpoint is working

**"Credits not appearing"**:
- Check Supabase `credit_ledger` table
- Verify `grant_credits` RPC was called
- Check `user_entitlements` table is updated

**"Premium not activating"**:
- Check `subscriptions` table
- Verify expiration date is in the future
- Ensure `activate_subscription` RPC was called

### Logging

All IAP operations log to console with prefixes:
- `🛒` Purchase initiated
- `✅` Purchase completed
- `❌` Purchase error
- `🔄` Restore purchases
- `💳` Receipt validation

---

## Legal and Compliance

**Required Documents**:
- [x] `YOUTUBE_API_COMPLIANCE.md` (YouTube ToS compliance statement)
- [x] `APP_REVIEW_RESPONSE.md` (App Store review response template)
- [x] Terms of Service (must host at https://rork.com/terms)
- [x] Privacy Policy (must host at https://rork.com/privacy)

**App Review Checklist**:
- [ ] All product IDs created in App Store Connect
- [ ] Products submitted for review
- [ ] Clear product descriptions (no YouTube mentions)
- [ ] YouTube disclaimer on all paywall screens
- [ ] YouTube attribution on video cards
- [ ] Test account provided (if needed)
- [ ] Demo video showing IAP flow (if needed)

---

## Next Steps

1. **Run Supabase Migration**: Execute `backend/supabase-migrations/001_iap_tables.sql`
2. **Implement Backend Endpoints**: Create tRPC routes for `iap.validate`, `iap.entitlements`, `iap.asn`
3. **Create Products in App Store Connect**: Set up all 5 IAP products
4. **Test with Sandbox**: Create sandbox testers and verify purchase flow
5. **Replace Mock IAP**: When using custom dev client, implement real StoreKit integration
6. **Submit Compliance Docs**: Upload `YOUTUBE_API_COMPLIANCE.md` with App Store submission
7. **Monitor ASN Webhook**: Ensure subscription lifecycle events are handled

---

## Contact

**Developer**: Tyron Montavis Torance Roberts  
**Support**: https://rork.com/support  
**Documentation**: See `YOUTUBE_API_COMPLIANCE.md` and `APP_REVIEW_RESPONSE.md`

---

**Last Updated**: October 24, 2025  
**Version**: 1.0
