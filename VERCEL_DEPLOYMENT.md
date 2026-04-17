# Vercel Deployment Guide

This guide will help you deploy your backend to Vercel using GitHub.

## Prerequisites

1. GitHub account with your repository
2. Vercel account (sign up at https://vercel.com)

## Deployment Steps

### 1. Push Your Code to GitHub

Make sure all your changes are committed and pushed to GitHub:

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

### 3. Configure Environment Variables

In Vercel project settings, add these environment variables:

**Required:**
- `EXPO_PUBLIC_SUPABASE_URL` = `https://vncaboqllcykibwdnmwp.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA`
- `OPENAI_API_KEY` = `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`

### 4. Deploy

Click "Deploy" and wait for the deployment to complete.

### 5. Update Your App Configuration

After deployment, you'll get a URL like `https://your-project.vercel.app`

Update your `.env` file:

```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-project.vercel.app
```

Then rebuild your app for TestFlight.

## Testing Your Backend

Test your deployed backend:

```bash
curl https://your-project.vercel.app/
curl https://your-project.vercel.app/api
```

Both should return JSON responses indicating the API is running.

## Troubleshooting

### Build Fails

- Check Vercel logs for errors
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### API Not Working

- Check that `EXPO_PUBLIC_RORK_API_BASE_URL` is set correctly in your app
- Verify CORS is enabled (already configured in `backend/hono.ts`)
- Check Vercel function logs for errors

### TTS Not Working

- Verify `OPENAI_API_KEY` is set in Vercel environment variables
- Check that the key is valid and has credits
- Review function logs for OpenAI API errors

## Automatic Deployments

Once connected, Vercel will automatically deploy:
- Every push to your main branch
- Every pull request (preview deployments)

## Custom Domain (Optional)

You can add a custom domain in Vercel project settings under "Domains".
