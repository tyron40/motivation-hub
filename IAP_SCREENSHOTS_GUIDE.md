# IAP Screenshots Guide
**How to Create 1280x1280px Screenshots for Each IAP Product**

---

## 📸 What You Need

Apple requires a screenshot (1280x1280px) for each In-App Purchase product showing what the user is buying.

---

## 🎯 Quick Method (Fastest)

### Step 1: Run Your App
```bash
# On simulator
npm run ios

# Or on real device via Expo Go
npm start
```

### Step 2: Open Paywall Modal
1. Launch app
2. Sign in (or continue as guest)
3. Go to **Profile** tab
4. Tap **"Upgrade"** or any "Get Credits" button
5. Paywall modal should open showing all IAP products

### Step 3: Take Screenshots

**On iOS Simulator:**
- Press `Cmd + S` to save screenshot
- Screenshots save to Desktop

**On Real iPhone:**
- Press `Side button + Volume Up` simultaneously
- Screenshots save to Photos app

### Step 4: Crop to 1280x1280px

**Option A - Using Preview (Mac):**
1. Open screenshot in Preview
2. Tools → Adjust Size
3. Set Width: 1280px, Height: 1280px
4. Make sure "Scale proportionally" is UNCHECKED if needed
5. Crop to square focusing on the IAP product card
6. Save

**Option B - Using Online Tool:**
1. Go to https://www.iloveimg.com/crop-image
2. Upload screenshot
3. Set custom size: 1280 x 1280 pixels
4. Crop around the IAP product
5. Download

**Option C - Using Photoshop/Figma:**
1. Create 1280x1280px canvas
2. Import screenshot
3. Crop/center around IAP product
4. Export as PNG or JPG

---

## 📐 What to Show in Each Screenshot

### Screenshot 1: 100 AI Credits ($4.99)
**Focus on:**
- The "100 AI Credits" card/button
- Price clearly visible ($4.99)
- Description text visible
- Lightning/Zap icon visible

**Example composition:**
```
┌─────────────────────────┐
│                         │
│   [⚡ Icon]             │
│                         │
│   100 AI Credits        │
│   $4.99                 │
│                         │
│   Get 100 AI credits    │
│   for chat and voice    │
│   interactions          │
│                         │
└─────────────────────────┘
```

### Screenshot 2: 500 AI Credits ($19.99)
**Focus on:**
- The "500 AI Credits" card/button
- "BEST VALUE" badge if visible
- Price: $19.99
- Description

### Screenshot 3: 1000 AI Credits ($34.99)
**Focus on:**
- The "1000 AI Credits" card/button
- Price: $34.99
- Description

### Screenshot 4: Premium Monthly ($9.99/month)
**Focus on:**
- The "Premium Monthly" card/button
- Shield icon or Premium badge
- Price: $9.99/month
- "Ad-Free" mention
- Description

### Screenshot 5: Premium Annual ($99.99/year)
**Focus on:**
- The "Premium Annual" card/button
- "SAVE 20%" badge if visible
- Price: $99.99/year
- Description

---

## 🎨 Alternative: Create Marketing Screenshots

If the app screenshots don't look good enough, create custom marketing graphics:

### Using Figma (Recommended):

**Template:**
```
Canvas: 1280x1280px
Background: Dark gradient (matching app theme)

Elements:
1. Large icon/emoji (top center)
   - 💎 for premium
   - ⚡ for credits
   
2. Product name (center, large font)
   "100 AI Credits"
   
3. Price (below name, medium font)
   "$4.99"
   
4. Description (bottom, smaller font)
   "Get 100 AI credits for chat and voice interactions"
   
5. Optional: App logo in corner
```

**Example for 100 Credits:**
```
┌─────────────────────────────────┐
│                                 │
│            ⚡⚡⚡                │
│                                 │
│       100 AI Credits            │
│                                 │
│           $4.99                 │
│                                 │
│   Get 100 AI credits for        │
│   chat and voice interactions   │
│   with your AI coach            │
│                                 │
│                                 │
│  [App Logo]                     │
└─────────────────────────────────┘
```

### Using Canva:

1. Go to https://www.canva.com
2. Create custom size: 1280 x 1280 px
3. Choose dark background
4. Add text and icons
5. Download as PNG

### Colors to Use (Match App Theme):
```
Background: #0F0F23 to #1A1A2E (dark gradient)
Primary: #6C5CE7 (purple/blue for credits)
Accent: #10B981 (green for premium)
Text: #FFFFFF (white)
Secondary text: #B0B0B0 (gray)
```

---

## 📤 Upload to App Store Connect

For each IAP product:

1. Go to App Store Connect
2. Navigate to: Motivation Hub → In-App Purchases
3. Click on the IAP product (e.g., "100 AI Credits")
4. Scroll to "Review Information"
5. Under "App Store Promotion" or "Review Screenshot"
6. Click "Add Screenshot"
7. Upload your 1280x1280px image
8. Save

**Repeat for all 5 products.**

---

## ✅ Screenshot Checklist

Before uploading, verify each screenshot:

- [ ] Size is exactly 1280x1280px
- [ ] Product name is clearly visible
- [ ] Price is clearly visible
- [ ] Description is readable
- [ ] Image is not blurry or pixelated
- [ ] Background matches app theme
- [ ] Icon/badge visible (if applicable)
- [ ] No personal information visible
- [ ] No placeholder text
- [ ] Professional appearance

---

## 🎯 Quick Automated Approach (Advanced)

If you want to automate this, you can:

1. Use React Native's `react-native-view-shot` to programmatically capture each product card
2. Export at 2x or 3x resolution
3. Crop to 1280x1280px in post-processing

**Example code:**
```javascript
import ViewShot from 'react-native-view-shot';

<ViewShot 
  ref={viewShotRef}
  options={{ format: 'png', quality: 1.0 }}
>
  {/* Your IAP product card */}
</ViewShot>

// Then capture:
const uri = await viewShotRef.current.capture();
```

But manual screenshots are usually faster for 5 products.

---

## 📝 Filename Convention

When saving locally, use clear names:
```
iap_100_credits_screenshot.png
iap_500_credits_screenshot.png
iap_1000_credits_screenshot.png
iap_premium_monthly_screenshot.png
iap_premium_annual_screenshot.png
```

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Screenshot shows entire screen → ✅ Focus on IAP product
2. ❌ Text too small to read → ✅ Make text large and clear
3. ❌ Wrong aspect ratio → ✅ Must be square 1:1
4. ❌ Blurry/low quality → ✅ Use high resolution
5. ❌ Shows wrong price → ✅ Double-check prices match
6. ❌ Generic placeholder → ✅ Show actual product details

---

## 🆘 If You're Stuck

**Option 1:** Use the Paywall screenshots from your app (easiest)
- Already has all the info
- Just crop and resize

**Option 2:** Create simple text-based graphics in Canva (5 min per product)

**Option 3:** Hire a designer on Fiverr ($5-20 for all 5 screenshots)

---

## ⏱️ Time Estimate

| Method | Time |
|--------|------|
| App screenshots + crop | 15 min |
| Custom Figma/Canva design | 30-45 min |
| Automated with code | 1 hour (first time) |

---

**Recommended:** Take app screenshots from Paywall modal, crop to 1280x1280px focusing on each product. Upload to App Store Connect. Done in 15 minutes!
