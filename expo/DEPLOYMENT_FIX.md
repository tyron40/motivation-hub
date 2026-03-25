# Deployment Fix Required

## Issue
The tRPC procedure `content.trending` is not found on the deployed Vercel backend, even though it exists in the codebase.

## Root Cause
The Vercel deployment is using an older version of the code that doesn't include the `content.trending` procedure.

## Solution
You need to trigger a new deployment on Vercel with the updated code.

### Steps to Fix:

1. **Commit the changes I just made:**
   ```bash
   git add backend/hono.ts
   git commit -m "Add YouTube API support and content.trending procedure"
   git push
   ```

2. **Verify Vercel auto-deploys:**
   - Go to your Vercel dashboard
   - Check if a new deployment is triggered automatically
   - Wait for the deployment to complete

3. **Manual deployment (if auto-deploy doesn't work):**
   - Go to your Vercel project dashboard
   - Click on "Deployments" tab
   - Click "Redeploy" on the latest deployment
   - Or click "Deploy" to create a new deployment

4. **Verify the fix:**
   - After deployment completes, test the health endpoint:
     ```
     https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app/api/health
     ```
   - Check that `hasYouTubeKey: true` in the response
   - Test your app - the trending content should now load

## What I Fixed:
1. Added initialization log to confirm content.trending support
2. Added YouTube API key verification to health check endpoint
3. The `content.trending` procedure was already correctly defined in:
   - `backend/trpc/routes/content/youtube-fetch.ts` (line 204)
   - `backend/trpc/app-router.ts` (line 16)

## Environment Variables to Verify:
Make sure these are set in Vercel:
- `YOUTUBE_API_KEY` - Your YouTube API key
- `OPENAI_API_KEY` - Your OpenAI API key
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

All environment variables are already configured according to your previous message.
