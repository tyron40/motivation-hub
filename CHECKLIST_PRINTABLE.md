# App Store Resubmission Checklist
**Motivation Hub v1.1.0 Build 64**

Print this page and check off each item as you complete it.

---

## 📋 PRE-BUILD CHECKLIST

### Code Updates
- [ ] Opened `app.json` in editor
- [ ] Changed `"buildNumber"` from `"59"` to `"64"` (line 19)
- [ ] Changed `versionCode` from `59` to `64` (line 64)
- [ ] Saved `app.json`
- [ ] Verified changes with `git diff` or file compare

---

## 👤 DEMO ACCOUNT CHECKLIST

### Create Account
- [ ] Logged into Supabase: app.supabase.com
- [ ] Navigated to: Authentication → Users
- [ ] Clicked "Add User" or "Invite User"
- [ ] Entered email: `demo@motivationhub.app`
- [ ] Entered password: `DemoTest2025!`
- [ ] Checked "Auto Confirm User"
- [ ] Saved user

### Configure Entitlements
- [ ] Found user in Supabase dashboard
- [ ] Set credits to `1000`
- [ ] Set `isPremium` to `true`
- [ ] Set `premiumExpiresAt` to `2147483647000`
- [ ] Saved entitlements

### Verify Demo Account
- [ ] Tested signing in with demo@motivationhub.app
- [ ] Verified 1000 credits show in app
- [ ] Verified Premium badge shows in profile
- [ ] Tested AI Chat works
- [ ] Tested Voice Coach works

---

## 💳 IAP PRODUCTS CHECKLIST

### Product 1: 100 AI Credits
- [ ] Created in App Store Connect
- [ ] Type: Consumable
- [ ] Product ID: `com.tyrotech.motivationhub.credits.100`
- [ ] Reference Name: "100 AI Credits"
- [ ] Price: Tier 5 ($4.99)
- [ ] Display Name: "100 AI Credits"
- [ ] Description added
- [ ] Screenshot uploaded (1280x1280px)
- [ ] Saved product

### Product 2: 500 AI Credits
- [ ] Created in App Store Connect
- [ ] Type: Consumable
- [ ] Product ID: `com.tyrotech.motivationhub.credits.500`
- [ ] Reference Name: "500 AI Credits"
- [ ] Price: Tier 20 ($19.99)
- [ ] Display Name: "500 AI Credits"
- [ ] Description added
- [ ] Screenshot uploaded (1280x1280px)
- [ ] Saved product

### Product 3: 1000 AI Credits
- [ ] Created in App Store Connect
- [ ] Type: Consumable
- [ ] Product ID: `com.tyrotech.motivationhub.credits.1000`
- [ ] Reference Name: "1000 AI Credits"
- [ ] Price: Tier 35 ($34.99)
- [ ] Display Name: "1000 AI Credits"
- [ ] Description added
- [ ] Screenshot uploaded (1280x1280px)
- [ ] Saved product

### Product 4: Premium Monthly
- [ ] Created in App Store Connect
- [ ] Type: Auto-Renewable Subscription
- [ ] Product ID: `com.tyrotech.motivationhub.premium.monthly`
- [ ] Reference Name: "Premium Monthly"
- [ ] Subscription Group: "Premium"
- [ ] Duration: 1 Month
- [ ] Price: Tier 10 ($9.99/month)
- [ ] Display Name: "Premium Monthly - Ad Free"
- [ ] Description added
- [ ] Screenshot uploaded (1280x1280px)
- [ ] Saved product

### Product 5: Premium Annual
- [ ] Created in App Store Connect
- [ ] Type: Auto-Renewable Subscription
- [ ] Product ID: `com.tyrotech.motivationhub.premium.annual`
- [ ] Reference Name: "Premium Annual"
- [ ] Subscription Group: "Premium"
- [ ] Duration: 1 Year
- [ ] Price: Tier 100 ($99.99/year)
- [ ] Display Name: "Premium Annual"
- [ ] Description added
- [ ] Screenshot uploaded (1280x1280px)
- [ ] Saved product

### Submit IAP Products
- [ ] Selected all 5 IAP products (checkboxes)
- [ ] Clicked "Submit for Review"
- [ ] Confirmed submission
- [ ] All 5 products show "Waiting for Review" or "In Review"

---

## 🍎 APP STORE CONNECT CHECKLIST

### Add Demo Credentials
- [ ] Opened App Store Connect
- [ ] Selected Motivation Hub
- [ ] Clicked on Version 1.1.0
- [ ] Scrolled to "App Review Information"
- [ ] Checked "Sign-in required"
- [ ] Entered Username: `demo@motivationhub.app`
- [ ] Entered Password: `DemoTest2025!`
- [ ] Added notes about demo account features
- [ ] Saved changes

### Prepare Review Notes
- [ ] Copied review notes from APP_STORE_QUICK_ACTION_GUIDE.md
- [ ] Customized notes if needed
- [ ] Have notes ready to paste during submission

---

## 🔨 BUILD CHECKLIST

### Pre-Build
- [ ] All code changes committed (optional)
- [ ] Terminal open in project directory
- [ ] Logged into Expo account
- [ ] Have good internet connection

### Run Build
- [ ] Executed: `eas build --platform ios --clear-cache`
- [ ] Confirmed build configuration
- [ ] Build started successfully
- [ ] Noted build ID: ___________________

### Monitor Build
- [ ] Watched build progress in terminal
- [ ] OR monitored at expo.dev/accounts/[you]/builds
- [ ] Build completed without errors
- [ ] Build time: _____________ (note for reference)

---

## 📱 TESTFLIGHT CHECKLIST

### Upload & Processing
- [ ] Build automatically uploaded to TestFlight
- [ ] Received email: "Build ready to test"
- [ ] Logged into App Store Connect
- [ ] Navigated to TestFlight tab
- [ ] Verified Build 64 appears
- [ ] Status shows: "Ready to Submit"
- [ ] No compliance warnings

### Test Build (Optional but Recommended)
- [ ] Downloaded TestFlight build to device
- [ ] Signed in with demo account
- [ ] Tested key features work
- [ ] Verified no crash or major bugs

---

## 📝 SUBMISSION CHECKLIST

### Before Submitting
- [ ] Build 64 ready in TestFlight
- [ ] Demo account working and tested
- [ ] All 5 IAP products created and submitted
- [ ] Review notes prepared
- [ ] FEATURES_COMPLETE.md ready (optional attachment)

### Submit for Review
- [ ] Clicked "Submit for Review" on Build 64
- [ ] Pasted review notes into text field
- [ ] Attached FEATURES_COMPLETE.md (if applicable)
- [ ] Reviewed all information one last time
- [ ] Clicked final "Submit" button
- [ ] Received confirmation screen
- [ ] Received confirmation email

### Post-Submission
- [ ] Status shows "Waiting for Review"
- [ ] Noted submission date: _____________________
- [ ] Noted submission time: _____________________
- [ ] Set reminder to check in 24 hours

---

## ⏰ TIMELINE TRACKING

Record your times:

| Task | Expected | Actual | Notes |
|------|----------|--------|-------|
| Code updates | 5 min | _____ min | |
| Demo account | 10 min | _____ min | |
| IAP products | 30 min | _____ min | |
| App Store setup | 5 min | _____ min | |
| Build | 45 min | _____ min | |
| TestFlight | 90 min | _____ min | |
| Submit | 5 min | _____ min | |
| **Total** | **3 hours** | **_____ hrs** | |

---

## 📊 STATUS UPDATES

Check and update status daily:

### Day 1 (Submission Day)
- [ ] Submitted: Date _______ Time _______
- [ ] Status: Waiting for Review
- [ ] Notes: _________________________________

### Day 2
- [ ] Checked status: Date _______
- [ ] Current status: _______________________
- [ ] Notes: _________________________________

### Day 3
- [ ] Checked status: Date _______
- [ ] Current status: _______________________
- [ ] Notes: _________________________________

### Day 4+
- [ ] Checked status: Date _______
- [ ] Current status: _______________________
- [ ] Notes: _________________________________

---

## ✅ APPROVAL CHECKLIST

When approved:

- [ ] Received approval email from Apple
- [ ] Status changed to "Pending Developer Release"
- [ ] Verified in App Store Connect
- [ ] Decided release strategy:
  - [ ] Release immediately
  - [ ] Manual release on specific date
- [ ] Clicked "Release This Version" (if immediate)
- [ ] Verified app is live in App Store
- [ ] Tested downloading from App Store
- [ ] Celebrated! 🎉

---

## 🚨 IF REJECTED AGAIN

- [ ] Read rejection email carefully
- [ ] Note specific guideline(s): _______________
- [ ] Review what was tested
- [ ] Check if demo account worked
- [ ] Verify IAP products were seen
- [ ] Consult APP_STORE_REJECTION_FIX.md again
- [ ] Make necessary changes
- [ ] Increment build number to 65
- [ ] Repeat checklist

---

## 📞 CONTACTS & RESOURCES

Emergency contacts:
```
Apple Developer Support: developer.apple.com/support
App Store Connect Help: help.apple.com/app-store-connect
Supabase Support: supabase.com/docs/support

Project ID: 7389ef4c-4537-4e7b-9081-c30a7e9c22bd
Bundle ID: app.rork.motivational-speech-app
```

---

## 📝 NOTES SECTION

Use this space for any additional notes:

```
______________________________________________________________

______________________________________________________________

______________________________________________________________

______________________________________________________________

______________________________________________________________

______________________________________________________________

______________________________________________________________

______________________________________________________________
```

---

## ✨ FINAL CHECK

Before you hit submit, triple-check these:

- [ ] Build number is 64 (not 59, 60, 61, 62, or 63)
- [ ] Demo account: demo@motivationhub.app exists and works
- [ ] Demo account has 1000 credits
- [ ] Demo account has Premium enabled
- [ ] All 5 IAP products submitted for review
- [ ] Demo credentials in App Store Connect
- [ ] Review notes added
- [ ] Everything tested on TestFlight build

---

**YOU'RE READY! 🚀**

Good luck with your submission!

---

_Checklist Version 1.0 - October 28, 2025_
_For Motivation Hub v1.1.0 Build 64_
