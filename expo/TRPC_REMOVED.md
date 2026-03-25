# tRPC Removed - Direct API Calls

## Summary

Successfully removed tRPC dependency and replaced it with direct fetch calls to your Vercel backend APIs.

## Changes Made

### 1. Created New API Client (`lib/api-client.ts`)
- Direct fetch calls to Vercel backend
- Two main functions:
  - `generateTextToSpeech()` - Calls `/api/tts`
  - `sendChatMessage()` - Calls `/api/chat`
- Uses `EXPO_PUBLIC_RORK_API_BASE_URL` environment variable

### 2. Updated Files

#### `lib/openai.ts`
- Removed tRPC client import
- Now uses `generateTextToSpeech` from `api-client.ts`

#### `app/voice-coach.tsx`
- Removed tRPC mutations
- Direct API calls using `generateTTS` and `sendChatMessage`
- Cleaner error handling

#### `app/_layout.tsx`
- Removed tRPC provider
- Removed tRPC imports
- Simplified provider tree

## API Endpoints

Your Vercel backend should expose these endpoints:

### 1. Text-to-Speech
```
POST /api/tts
Body: { text: string, voice?: string }
Response: { audio: { base64Data: string, mimeType: string } }
```

### 2. Chat
```
POST /api/chat
Body: { messages: Array<{ role: string, content: string }> }
Response: { message: string }
```

## Environment Variables

Make sure `EXPO_PUBLIC_RORK_API_BASE_URL` is set in your `.env` file:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app
```

## Benefits

1. **Simpler**: No tRPC setup or configuration needed
2. **Direct**: Fetch calls directly to your Vercel APIs
3. **Cleaner**: Less boilerplate code
4. **Flexible**: Easy to add new endpoints

## Next Steps

1. Make sure your Vercel backend has `/api/tts` and `/api/chat` endpoints
2. Test the voice coach feature
3. Test the chat feature
4. Remove unused tRPC packages if desired (optional)

## Files That Still Use tRPC (Can be removed if not needed)

- `backend/` folder - Your tRPC backend code
- `lib/trpc.ts` - tRPC client setup (no longer imported)
- tRPC packages in `package.json` (can be removed if you want)
