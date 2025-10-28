# Credit System Implementation Summary

## Demo Account Setup

The demo account (`demo@motivationhub.app`) is configured with:
- **1000 credits** for testing all AI features
- **Premium status** (never expires)
- Full access to all voices and features

## Credit Costs

According to `constants/credits.ts`:

| Feature | Cost | Description |
|---------|------|-------------|
| AI Chat Message | 1 credit | Each message sent to the AI coach |
| Voice Generation (TTS) | 1 credit | Converting AI responses to speech audio |
| Voice Analysis | 2 credits | Analyzing voice recording for feedback |
| Speech Transcription | 1 credit | Converting voice recording to text |

## Current Implementation Status

### ✅ Working
- Demo account detection in `hooks/auth-context.tsx`
- Demo account gets 1000 credits in `hooks/iap-context.tsx`
- Credit costs defined in `constants/credits.ts`
- `useCredit()` function available to deduct credits

### ⚠️ Needs Implementation
Credits are NOT currently being deducted when AI features are used. The following locations need credit deduction:

1. **Voice Coach** (`app/voice-coach.tsx`):
   - Line ~1067: After sending chat message (1 credit)
   - Line ~93: After generating TTS (1 credit)
   - Speech-to-text calls (1 credit) - currently uses external API

2. **Chat Screen** (`app/(tabs)/chat.tsx`):
   - Line ~337: After sending chat message (1 credit)
   - Line ~162: After generating TTS (1 credit)
   - Speech-to-text calls (1 credit) - currently uses external API

## How to Properly Deduct Credits

The `useCredit()` hook should be called AFTER successful API calls:

```typescript
// Example:
const result = await sendChatMessage({ messages });
const completion = result.message;

// Deduct 1 credit for chat
const creditUsed = await useCredit();
if (creditUsed) {
  console.log('💳 1 credit used for AI Chat Message. Remaining:', usageStats.credits - 1);
} else {
  console.warn('⚠️ Failed to deduct credit');
}
```

## Testing the Credit System

To verify credits are being deducted:

1. Sign in with demo account:
   - Email: `demo@motivationhub.app`
   - Password: `Demo2025!`

2. Check initial credits (should be 1000)

3. Use AI features:
   - Send a chat message → should deduct 1 credit
   - Enable voice and let AI speak → should deduct 1 credit
   - Use voice input → should deduct 1 credit for transcription

4. Verify credits decrease after each use

5. Check console logs for credit deduction messages

## Notes

- The demo account credit rules apply just like regular users
- Credits should persist in AsyncStorage
- When credits reach 0, users should see a purchase prompt
- The demo account for App Review should showcase that features work but also that the credit system is functional
