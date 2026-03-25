# 🔐 Security & API Configuration Guide

## ⚠️ CRITICAL SECURITY NOTICE

**Your API keys are currently exposed in the codebase!**

This document explains how to properly secure your application for production deployment.

---

## 🚨 Immediate Actions Required

### 1. Rotate Exposed API Keys

Your OpenAI and YouTube API keys have been committed to version control. You MUST rotate them immediately:

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Delete the exposed key: `sk-proj-ektpSVLvLLwnIbJZfI_4GPxVcjntXbcFQPQmNj5f2iaH...`
3. Create a new API key
4. Add the new key ONLY to Vercel environment variables

#### YouTube API Key
1. Go to https://console.cloud.google.com/apis/credentials
2. Delete or restrict the exposed key: `AIzaSyCWeNpvGU8MOh__ED89BicDuEHfi1N_pYs`
3. Create a new API key
4. Add the new key ONLY to Vercel environment variables

### 2. Update .env File

Your `.env` file should NEVER contain real API keys. Use placeholders:

```bash
# ❌ WRONG - Never do this:
OPENAI_API_KEY=sk-proj-actual-key-here

# ✅ CORRECT - Use placeholders:
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
```

### 3. Add .env to .gitignore

Ensure `.env` is in your `.gitignore` file:

```
# Environment variables
.env
.env.local
.env.production
```

---

## 🏗️ Proper Architecture

### Client-Side vs Server-Side

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (Client)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  EXPO_PUBLIC_* variables only                      │ │
│  │  - EXPO_PUBLIC_SUPABASE_URL                        │ │
│  │  - EXPO_PUBLIC_SUPABASE_ANON_KEY                   │ │
│  │  - EXPO_PUBLIC_RORK_API_BASE_URL                   │ │
│  │  - EXPO_PUBLIC_TOOLKIT_URL                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS Requests
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel Backend (Server)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Server-side variables (NOT exposed to client)     │ │
│  │  - OPENAI_API_KEY                                  │ │
│  │  - YOUTUBE_API_KEY                                 │ │
│  │  - Other sensitive keys                            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Environment Variables Explained

### Client-Side Variables (EXPO_PUBLIC_*)

These are **embedded in your app bundle** and visible to users:

```bash
# ✅ Safe to expose (public endpoints)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-iota.vercel.app
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com

# ❌ NEVER expose these with EXPO_PUBLIC_ prefix:
# EXPO_PUBLIC_OPENAI_API_KEY (costs you money!)
# EXPO_PUBLIC_YOUTUBE_API_KEY (can be abused)
```

### Server-Side Variables (NO PREFIX)

These are **only accessible on your backend**:

```bash
# ✅ Safe - only on Vercel backend
OPENAI_API_KEY=sk-proj-...
YOUTUBE_API_KEY=AIzaSy...
```

---

## 🔧 Vercel Environment Variables Setup

### Step-by-Step Configuration

1. **Access Vercel Dashboard**
   ```
   https://vercel.com/your-username/motivation-hub/settings/environment-variables
   ```

2. **Add Each Variable**
   
   For each variable, click "Add New" and enter:
   
   **Variable 1: OPENAI_API_KEY**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-YOUR-NEW-KEY-HERE`
   - Environment: ✅ Production, ✅ Preview, ✅ Development
   
   **Variable 2: YOUTUBE_API_KEY**
   - Name: `YOUTUBE_API_KEY`
   - Value: `AIzaSy-YOUR-NEW-KEY-HERE`
   - Environment: ✅ Production, ✅ Preview, ✅ Development
   
   **Variable 3: EXPO_PUBLIC_SUPABASE_URL**
   - Name: `EXPO_PUBLIC_SUPABASE_URL`
   - Value: `https://vncaboqllcykibwdnmwp.supabase.co`
   - Environment: ✅ Production, ✅ Preview, ✅ Development
   
   **Variable 4: EXPO_PUBLIC_SUPABASE_ANON_KEY**
   - Name: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

3. **Redeploy**
   
   After adding variables, trigger a new deployment:
   ```bash
   git commit --allow-empty -m "Trigger redeploy with new env vars"
   git push
   ```

---

## 🧪 Testing Your Configuration

### 1. Test Backend Health

```bash
curl https://motivation-hub-iota.vercel.app/api/health
```

Expected response:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-14T...",
  "env": {
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "hasOpenAIKey": true,
    "hasYouTubeKey": true
  }
}
```

### 2. Test YouTube API

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/youtube/trending \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

### 3. Test TTS API

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "alloy"}'
```

### 4. Test Chat API

```bash
curl -X POST https://motivation-hub-iota.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

---

## 🛡️ Security Best Practices

### 1. API Key Rotation Schedule

- **OpenAI API Key**: Rotate every 90 days
- **YouTube API Key**: Rotate every 90 days
- **Supabase Keys**: Rotate if compromised

### 2. API Key Restrictions

#### YouTube API Key Restrictions
1. Go to Google Cloud Console
2. Select your API key
3. Add restrictions:
   - **Application restrictions**: HTTP referrers
   - **Allowed referrers**: 
     - `https://motivation-hub-iota.vercel.app/*`
     - `https://*.vercel.app/*` (for preview deployments)
   - **API restrictions**: YouTube Data API v3 only

#### OpenAI API Key Restrictions
1. Go to OpenAI Dashboard
2. Set usage limits:
   - Monthly budget cap
   - Rate limits per minute
3. Monitor usage regularly

### 3. Monitoring & Alerts

#### Set Up Vercel Alerts
1. Go to Vercel Dashboard → Settings → Notifications
2. Enable alerts for:
   - Deployment failures
   - High error rates
   - Unusual traffic patterns

#### Set Up OpenAI Alerts
1. Go to OpenAI Dashboard → Usage
2. Set up email alerts for:
   - 80% of monthly budget
   - 100% of monthly budget

#### Set Up YouTube API Alerts
1. Go to Google Cloud Console → APIs & Services → Dashboard
2. Monitor quota usage
3. Set up billing alerts

---

## 🚫 Common Security Mistakes

### ❌ Mistake 1: Exposing API Keys in Client

```typescript
// ❌ WRONG - Key is exposed in app bundle
const OPENAI_KEY = 'sk-proj-...';
fetch('https://api.openai.com/v1/...', {
  headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }
});
```

```typescript
// ✅ CORRECT - Call your backend instead
fetch('https://motivation-hub-iota.vercel.app/api/tts', {
  method: 'POST',
  body: JSON.stringify({ text: 'Hello' })
});
```

### ❌ Mistake 2: Using EXPO_PUBLIC_ for Secrets

```bash
# ❌ WRONG - Exposed to client
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...

# ✅ CORRECT - Server-side only
OPENAI_API_KEY=sk-proj-...
```

### ❌ Mistake 3: Committing .env to Git

```bash
# ❌ WRONG - Keys in version control
git add .env
git commit -m "Add environment variables"

# ✅ CORRECT - Never commit .env
echo ".env" >> .gitignore
git add .gitignore
```

---

## 📊 Cost Management

### OpenAI API Costs

**TTS (Text-to-Speech)**
- Model: `tts-1`
- Cost: $0.015 per 1,000 characters
- Example: 100 TTS requests × 200 chars = $0.30

**Chat Completions**
- Model: `gpt-4o-mini`
- Cost: $0.150 per 1M input tokens, $0.600 per 1M output tokens
- Example: 1,000 chat messages = ~$0.50

**Monthly Budget Recommendation**: $50-100 for moderate usage

### YouTube API Costs

**Free Tier**
- 10,000 quota units per day
- Search: 100 units per request
- Videos.list: 1 unit per request
- **Daily limit**: ~100 searches or 10,000 video details

**Paid Tier**
- Additional quota: $0.50 per 1,000 units
- Monitor usage in Google Cloud Console

---

## 🔍 Debugging Production Issues

### Issue: "API key not configured"

**Check:**
1. Vercel environment variables are set
2. Variable names match exactly (case-sensitive)
3. Deployment was triggered after adding variables

**Fix:**
```bash
# Trigger new deployment
vercel --prod
```

### Issue: "Unauthorized" or "403 Forbidden"

**Check:**
1. API key is valid and not expired
2. API key has correct permissions
3. API key restrictions allow your domain

**Fix:**
1. Test API key with curl
2. Check API key restrictions in console
3. Rotate key if necessary

### Issue: "Quota exceeded"

**Check:**
1. YouTube API quota in Google Cloud Console
2. OpenAI usage in OpenAI Dashboard

**Fix:**
1. Wait for quota reset (YouTube: daily, OpenAI: monthly)
2. Implement caching to reduce API calls
3. Upgrade to paid tier if needed

---

## ✅ Production Readiness Checklist

- [ ] All API keys rotated (new keys generated)
- [ ] Old API keys deleted from provider dashboards
- [ ] `.env` file contains only placeholders
- [ ] `.env` is in `.gitignore`
- [ ] Vercel environment variables configured
- [ ] API key restrictions configured
- [ ] Usage monitoring and alerts set up
- [ ] Monthly budget caps configured
- [ ] Backend endpoints tested
- [ ] Error handling implemented
- [ ] Rate limiting implemented (if needed)
- [ ] Logging configured for debugging

---

## 📞 Emergency Response

### If API Keys Are Compromised

1. **Immediately rotate all keys**
   - OpenAI: https://platform.openai.com/api-keys
   - YouTube: https://console.cloud.google.com/apis/credentials

2. **Check for unauthorized usage**
   - OpenAI: Check usage dashboard
   - YouTube: Check quota usage
   - Vercel: Check logs for unusual traffic

3. **Update Vercel environment variables**
   - Add new keys
   - Trigger new deployment

4. **Monitor for 24-48 hours**
   - Watch for unusual API usage
   - Check billing for unexpected charges

---

## 📚 Additional Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [YouTube API Quota Management](https://developers.google.com/youtube/v3/getting-started#quota)

---

**Remember: Security is not a one-time setup. Regularly review and update your security practices!** 🔐
