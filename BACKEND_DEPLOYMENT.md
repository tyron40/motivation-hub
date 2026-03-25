# Backend Deployment Guide

## The Problem

Your app has a backend (in `backend/hono.ts`) that needs to be accessible for features like:
- Voice Coach (TTS and Chat)
- Any tRPC endpoints

Currently, you're seeing "Network request failed" errors because the backend URL is not configured.

## Solution Options

### Option 1: Local Development (Already Working)

When you run `bun start`, the Rork CLI should automatically:
1. Start your backend server
2. Create a tunnel URL
3. Set `EXPO_PUBLIC_RORK_API_BASE_URL` automatically

**If this isn't working**, check the console output when you run `bun start` for the backend URL.

### Option 2: Production Deployment (For TestFlight/App Store)

For production builds, you need to deploy your backend separately. Here are the steps:

#### Step 1: Choose a Hosting Provider

Popular options:
- **Fly.io** (Recommended) - Free tier available
- **Railway** - Easy deployment
- **Render** - Free tier available
- **Vercel** - Good for serverless

#### Step 2: Deploy Your Backend

Example for Fly.io:

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login:
```bash
fly auth login
```

3. Create a `fly.toml` in your project root:
```toml
app = "your-app-name"

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["gcr.io/paketo-buildpacks/nodejs"]

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

4. Create a `Procfile`:
```
web: bun run backend/hono.ts
```

5. Deploy:
```bash
fly deploy
```

6. Set environment variables on Fly:
```bash
fly secrets set OPENAI_API_KEY=your-key-here
```

#### Step 3: Configure Your App

1. Get your deployed backend URL (e.g., `https://your-app.fly.dev`)

2. Set it in your Expo environment variables:
   - For local testing: Add to `.env`:
     ```
     EXPO_PUBLIC_RORK_API_BASE_URL=https://your-app.fly.dev
     ```
   
   - For EAS Build: Add to `eas.json` or set in Expo dashboard

3. Rebuild your app

## Verifying It Works

1. Check the console logs when your app starts
2. You should see: `✅ Using backend URL: https://your-backend-url.com`
3. Test the Voice Coach feature

## Current Status

- ✅ Backend code exists in `backend/hono.ts`
- ✅ tRPC routes configured
- ❌ Backend not deployed for production
- ❌ `EXPO_PUBLIC_RORK_API_BASE_URL` not set

## Quick Fix for Testing

If you just want to test locally:

1. Make sure `bun start` is running
2. Check the console for the tunnel URL
3. The backend should be accessible at that URL + `/api/trpc`

## Need Help?

If you're still seeing errors:
1. Check the console logs for the exact error
2. Verify the backend URL is accessible (try opening it in a browser)
3. Make sure environment variables are set correctly
