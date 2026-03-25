# BoltAI Setup Guide - Motivation Speech App

Complete guide to clone, setup, and run this React Native Expo app in VS Code using BoltAI.

## 🚀 Quick Start Prompt for BoltAI

Copy and paste this entire prompt into BoltAI:

```
I need to clone and run a React Native Expo app from GitHub. Here's what I need you to do:

1. Clone this repository: [PASTE_YOUR_GITHUB_REPO_URL_HERE]

2. Install dependencies using Bun:
   bun install

3. Create a .env file in the root directory with these variables:
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com
   EXPO_PUBLIC_RORK_API_BASE_URL=
   OPENAI_API_KEY=

4. Start the development server:
   bun start

Please guide me through any additional setup needed.
```

---

## 📋 Prerequisites Checklist

Before using BoltAI, ensure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **Bun** package manager (`npm install -g bun`)
- [ ] **Git** installed
- [ ] **VS Code** installed
- [ ] **GitHub account** with your repo
- [ ] **Vercel account** ([Sign up](https://vercel.com/signup))
- [ ] **Supabase account** ([Sign up](https://supabase.com))
- [ ] **OpenAI API key** ([Get one](https://platform.openai.com/api-keys))

---

## 🔧 Step-by-Step Setup

### Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **Project URL** → This is your `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Setup Supabase Database

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Paste and run this SQL:

```sql
-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New chat',
  created_at timestamptz default now()
);

-- Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- Favorites table
create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  source text not null,
  title text,
  thumb text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  primary key (user_id, item_id)
);

-- Enable Row Level Security
alter table conversations enable row level security;
alter table messages enable row level security;
alter table favorites enable row level security;

-- RLS Policies
create policy "users can manage own conversations"
on conversations for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can see own messages"
on messages for select
using (auth.uid() = user_id);

create policy "users can insert messages only in their convos"
on messages for insert
with check (
  auth.uid() = user_id and
  conversation_id in (select id from conversations where user_id = auth.uid())
);

create policy "users can manage own favorites"
on favorites for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Step 3: Deploy Backend to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy** (run from project root):
   ```bash
   vercel --prod
   ```

4. **Copy your deployment URL** (e.g., `https://your-app.vercel.app`)

5. **Set Environment Variables in Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add these variables:

   | Variable Name | Value |
   |--------------|-------|
   | `OPENAI_API_KEY` | Your OpenAI API key |
   | `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase URL |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

6. **Redeploy** after adding env vars:
   ```bash
   vercel --prod
   ```

### Step 4: Create Local .env File

Create a `.env` file in your project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here

# Backend API URL (Your Vercel deployment)
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-app.vercel.app

# Toolkit URL (for AI features)
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com

# OpenAI API Key (SERVER-SIDE ONLY)
OPENAI_API_KEY=sk-proj-...your-key-here
```

**Replace the placeholder values with your actual credentials!**

### Step 5: Run the App

```bash
# Install dependencies
bun install

# Start development server
bun start
```

After starting, you'll see options:
- Press **`w`** → Open in web browser
- Press **`i`** → Open in iOS simulator (Mac only)
- Press **`a`** → Open in Android emulator
- **Scan QR code** → Open in Expo Go app on your phone

---

## 📱 Testing on Your Phone

1. Install **Expo Go** app:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run `bun start` in your project

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

---

## 🔍 Verification Checklist

After setup, verify everything works:

- [ ] App starts without errors (`bun start`)
- [ ] Web version loads (press `w`)
- [ ] Can create an account (Auth tab)
- [ ] Can browse speeches (Home tab)
- [ ] Chat feature works (Chat tab)
- [ ] Voice coach loads (Voice Coach screen)
- [ ] No tRPC 404 errors in console

---

## 🐛 Common Issues & Solutions

### Issue: "No procedure found on path 'trpc/tts'"

**Solution:**
1. Verify backend is deployed: Visit `https://your-app.vercel.app/api/health`
2. Check `.env` has correct `EXPO_PUBLIC_RORK_API_BASE_URL`
3. Ensure Vercel env vars are set
4. Redeploy: `vercel --prod`

### Issue: Supabase connection errors

**Solution:**
1. Verify Supabase URL and key in `.env`
2. Check tables exist in Supabase dashboard
3. Verify RLS policies are enabled
4. Try creating a test user in Supabase Auth

### Issue: OpenAI API errors

**Solution:**
1. Verify API key is valid at [platform.openai.com](https://platform.openai.com)
2. Check you have credits in your OpenAI account
3. Ensure key is set in Vercel env vars (not just local `.env`)
4. Redeploy after adding env var

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm bun.lock
bun install
bun start --clear
```

---

## 📂 Project Structure

```
motivation-app/
├── app/                      # Expo Router pages
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx        # Home (speeches)
│   │   ├── explore.tsx      # Explore
│   │   ├── chat.tsx         # AI Chat
│   │   ├── scripture.tsx    # Scripture
│   │   └── profile.tsx      # Profile
│   ├── auth.tsx             # Login/Signup
│   ├── player.tsx           # Audio player
│   ├── video-player.tsx     # Video player
│   └── voice-coach.tsx      # Voice coaching
├── backend/                 # Backend API
│   ├── hono.ts             # Main server
│   └── trpc/               # tRPC routes
│       ├── routes/
│       │   ├── chat/       # Chat endpoint
│       │   └── tts/        # Text-to-speech
│       └── app-router.ts   # Route definitions
├── components/             # UI components
├── hooks/                  # React hooks & contexts
├── lib/                    # Utilities
│   ├── supabase.ts        # Supabase client
│   └── trpc.ts            # tRPC client
├── .env                    # Environment variables
└── vercel.json            # Vercel config
```

---

## 🎯 What This App Does

- **🎤 Speech Library**: Browse motivational speeches from various sources
- **📺 Video Content**: Watch speech videos from YouTube
- **💬 AI Chat**: Chat with an AI assistant about motivation
- **🎙️ Voice Coach**: Practice speaking with AI-powered feedback
- **📖 Scripture**: Read inspirational texts
- **👤 User Profiles**: Create account and save favorites

---

## 🔐 Security Notes

- ⚠️ **Never commit `.env` file** to Git (it's in `.gitignore`)
- ⚠️ **Never use `EXPO_PUBLIC_` prefix** for sensitive keys like `OPENAI_API_KEY`
- ✅ **Always set server-side keys** in Vercel dashboard only
- ✅ **Use Supabase RLS** to protect user data

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

## 💡 BoltAI Tips

When working with BoltAI on this project:

1. **Be specific**: "Add a new speech category called 'Leadership'"
2. **Reference files**: "Update the SpeechCard component to show duration"
3. **Ask for explanations**: "Explain how the tRPC chat route works"
4. **Request features**: "Add a favorites button to each speech card"

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] `.env` file created with all variables
- [ ] Supabase project created and tables setup
- [ ] Backend deployed to Vercel
- [ ] Vercel environment variables configured
- [ ] App runs locally without errors
- [ ] Can create account and login
- [ ] All features work (chat, voice coach, etc.)

---

**Need Help?** Check the troubleshooting section or review error logs in:
- **Vercel Dashboard**: Function logs
- **Supabase Dashboard**: Database logs
- **VS Code Terminal**: App console logs

Good luck! 🚀
