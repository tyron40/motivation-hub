# Podcast Route Deployment Fix

## Problem
The podcast RSS proxy route exists in the code but Vercel is returning 404 errors. This happens when Vercel hasn't deployed the latest code changes.

## Solution Steps

### 1. Verify Local Code is Correct
Your code is already correctly set up:
- ✅ Route exists at `backend/trpc/routes/podcast/rss-proxy.ts`
- ✅ Route is registered in `backend/trpc/app-router.ts` under `podcast.rssFeed`
- ✅ Service calls the route at `trpcClient.podcast.rssFeed.query({ url })`
- ✅ vercel.json has the correct rewrites for `/api/trpc/:path*`

### 2. Force Vercel Redeploy

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Option B: Using Git (if connected to Git)**
```bash
# Make a small change to force rebuild
git add .
git commit -m "Force redeploy for podcast route"
git push
```

**Option C: Manual Redeploy via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Find your project
3. Go to Deployments tab
4. Click the three dots menu on the latest deployment
5. Select "Redeploy"
6. Make sure "Use existing Build Cache" is **UNCHECKED**
7. Click "Redeploy"

### 3. Test After Deployment

Run this test in your browser console or in a test file:
```typescript
// Test the route
const result = await trpcClient.podcast.rssFeed.query({ 
  url: 'https://feeds.megaphone.fm/motiversity' 
});
console.log('✅ Podcast route working:', result);
```

Or test directly with curl:
```bash
curl -X POST https://your-domain.vercel.app/api/trpc/podcast.rssFeed \
  -H "Content-Type: application/json" \
  -d '{"url":"https://feeds.megaphone.fm/motiversity"}'
```

## Why This Happened
When you create new tRPC routes, Vercel needs to rebuild the serverless function that handles tRPC requests. If you just added the podcast route files without triggering a deployment, Vercel is still running the old code that doesn't have the podcast router.

## Verification
After redeployment, you should see:
- ✅ No more "No procedure found on path 'trpc/podcast.rssFeed'" errors
- ✅ Podcast episodes loading in your app
- ✅ Console logs showing successful RSS feed fetches
