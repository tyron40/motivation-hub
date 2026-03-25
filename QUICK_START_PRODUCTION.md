# 🚀 Quick Start - Production Deployment

## ⚡ 5-Minute Production Setup

### Step 1: Secure Your API Keys (2 minutes)

1. **Rotate OpenAI Key**
   - Go to: https://platform.openai.com/api-keys
   - Delete old key: `sk-proj-ektpSVLvLLwnIbJZfI_4GPxVcjntXbcFQPQmNj5f2iaH...`
   - Create new key
   - Copy new key

2. **Rotate YouTube Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Delete old key: `AIzaSyCWeNpvGU8MOh__ED89BicDuEHfi1N_pYs`
   - Create new key
   - Copy new key

### Step 2: Configure Vercel (2 minutes)

1. Go to: https://vercel.com/your-project/settings/environment-variables

2. Add these variables for **Production**:
   ```
   OPENAI_API_KEY = [your new OpenAI key]
   YOUTUBE_API_KEY = [your new YouTube key]
   EXPO_PUBLIC_SUPABASE_URL = https://vncaboqllcykibwdnmwp.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA
   ```

3. Trigger redeploy:
   ```bash
   git commit --allow-empty -m "Update env vars"
   git push
   ```

### Step 3: Update Local .env (1 minute)

Edit your `.env` file to remove real keys:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://vncaboqllcykibwdnmwp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA

# Backend API URL
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app

# DO NOT include real keys here - use placeholders
EXPO_PUBLIC_YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
```

---

## 🧪 Test Your Setup

### 1. Test Backend (30 seconds)

Open in browser:
```
https://motivation-hub-iota.vercel.app/api/health
```

Should show:
```json
{
  "ok": true,
  "status": "healthy",
  "env": {
    "hasOpenAIKey": true,
    "hasYouTubeKey": true
  }
}
```

### 2. Test on Device (2 minutes)

1. Build and install on TestFlight
2. Open app
3. Test these features:
   - ✅ YouTube videos load on home screen
   - ✅ AI Chat responds
   - ✅ Voice Coach works with TTS
   - ✅ Scripture favorites save

---

## 📱 Build for TestFlight

### Quick Build Command

```bash
# Update version in app.json first (increment buildNumber)
# Then run:
eas build --platform ios --profile production
```

### Monitor Build

```bash
# Check build status
eas build:list

# View build logs
eas build:view [build-id]
```

---

## ⚠️ Common Issues & Quick Fixes

### Issue: "JSON Parse error"
**Fix:** Backend is down or returning HTML. Check Vercel deployment status.

### Issue: "Cannot connect to server"
**Fix:** Wrong URL in `.env`. Verify `EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app`

### Issue: YouTube videos not loading
**Fix:** YouTube API key not set in Vercel. Add `YOUTUBE_API_KEY` to Vercel environment variables.

### Issue: TTS not working
**Fix:** OpenAI API key not set in Vercel. Add `OPENAI_API_KEY` to Vercel environment variables.

---

## 🎯 Production Checklist

Before submitting to App Store:

- [ ] API keys rotated and secured
- [ ] Vercel environment variables configured
- [ ] Backend tested and working
- [ ] App tested on physical device
- [ ] Version number incremented in app.json
- [ ] Build number incremented in app.json
- [ ] All features working correctly
- [ ] Screenshots prepared
- [ ] App Store listing complete

---

## 📞 Need Help?

1. **Check logs:**
   - Vercel: https://vercel.com/your-project/logs
   - Expo: https://expo.dev/accounts/[account]/projects/[project]/builds

2. **Test endpoints manually:**
   ```bash
   curl https://motivation-hub-iota.vercel.app/api/health
   ```

3. **Review documentation:**
   - `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full deployment guide
   - `SECURITY_AND_API_SETUP.md` - Security best practices

---

## 🎉 You're Ready!

Your app is now production-ready with:
- ✅ Secure API key management
- ✅ Proper backend configuration
- ✅ All features working
- ✅ Ready for App Store submission

**Next step:** Build with `eas build --platform ios --profile production` and submit to TestFlight!
