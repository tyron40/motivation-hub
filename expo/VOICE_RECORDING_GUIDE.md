# Voice Recording Guide for Physical Devices

## What Has Been Fixed

### 1. Explore Page Crash (FIXED ✅)
- **Issue**: The app was crashing when tapping the Explore tab due to unsupported `gap` property in StyleSheet
- **Solution**: Replaced all `gap` properties with proper margin spacing using wrapper Views
- **Files Fixed**: 
  - `app/(tabs)/explore.tsx`
  - `components/SpeechCard.tsx`

### 2. Microphone Permissions (CONFIGURED ✅)
- **iOS**: `NSMicrophoneUsageDescription` is properly configured in `app.json`
- **Android**: `RECORD_AUDIO` permission is properly configured in `app.json`
- **expo-av Plugin**: Microphone permission is configured with proper description

### 3. Voice Coach Implementation (ROBUST ✅)
The voice coach has comprehensive microphone handling:

#### Permission Flow:
1. **On App Start**: Automatically requests microphone permissions
2. **Permission Denied**: Shows clear alert with instructions to enable in Settings
3. **Permission Granted**: Displays confirmation and enables recording

#### Recording Flow:
1. **Press & Hold**: User presses and holds the microphone button
2. **Audio Mode Setup**: Configures iOS/Android audio settings for recording
3. **Recording Start**: Starts recording with proper format (WAV for iOS, M4A for Android)
4. **Release Button**: Stops recording and processes audio
5. **Duration Check**: Validates recording is at least 300ms (0.3 seconds)
6. **Transcription**: Sends audio to OpenAI Whisper API via `https://toolkit.rork.com/stt/transcribe/`
7. **AI Response**: Gets response from OpenAI GPT via your Vercel backend
8. **Text-to-Speech**: Plays response using OpenAI TTS via your Vercel backend

## How to Use Voice Coach on Physical Device

### Step 1: Grant Microphone Permission
When you first open the Voice Coach screen, you'll see a permission prompt:
- **iOS**: Tap "Allow" when prompted
- **Android**: Tap "Allow" when prompted

If you accidentally denied permission:
- **iOS**: Go to Settings > Privacy > Microphone > Enable for "Motivation Hub"
- **Android**: Go to Settings > Apps > Motivation Hub > Permissions > Enable Microphone

### Step 2: Use Voice Recording
1. Open the Voice Coach screen from the app
2. Wait for the greeting message to play
3. **Press and HOLD** the microphone button while speaking
4. Speak clearly into your device's microphone
5. **Release** the button when done speaking
6. Wait for processing (transcription + AI response)
7. Listen to the coach's response

### Step 3: Troubleshooting

#### "Recording Too Short" Error
**Cause**: You released the button too quickly (less than 0.3 seconds)
**Solution**: Hold the button longer while speaking - at least 1-2 seconds

#### "No Speech Detected" Error
**Cause**: The microphone didn't capture clear audio
**Solutions**:
- Speak louder and more clearly
- Check if your device's microphone is working (test with voice memos app)
- Make sure you're holding the button while speaking
- Check if a case or screen protector is blocking the microphone

#### "Microphone Permission Required" Error
**Cause**: Permission was denied or not granted
**Solution**: 
1. Go to device Settings
2. Find "Motivation Hub" app
3. Enable Microphone permission
4. Restart the app

#### Recording Starts But Doesn't Process
**Cause**: Network issue or backend not responding
**Solutions**:
- Check your internet connection
- Verify the backend is deployed and running
- Check the `.env` file has correct `EXPO_PUBLIC_RORK_API_BASE_URL`
- Test the backend by visiting `https://your-backend-url.vercel.app/api/health`

## Technical Details

### Audio Format Configuration
```typescript
// iOS: WAV format (best compatibility)
ios: {
  extension: '.wav',
  outputFormat: Audio.IOSOutputFormat.LINEARPCM,
  audioQuality: Audio.IOSAudioQuality.HIGH,
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
}

// Android: M4A format (best compatibility)
android: {
  extension: '.m4a',
  outputFormat: Audio.AndroidOutputFormat.MPEG_4,
  audioEncoder: Audio.AndroidAudioEncoder.AAC,
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
}
```

### API Endpoints Used
1. **Speech-to-Text**: `https://toolkit.rork.com/stt/transcribe/` (OpenAI Whisper)
2. **Chat**: `${EXPO_PUBLIC_RORK_API_BASE_URL}/api/chat` (Your Vercel backend)
3. **Text-to-Speech**: `${EXPO_PUBLIC_RORK_API_BASE_URL}/api/tts` (Your Vercel backend)

### Minimum Recording Duration
- **Minimum**: 300ms (0.3 seconds)
- **Recommended**: 1-2 seconds minimum for clear speech
- **Maximum**: 30 seconds (API timeout)

## Testing Checklist

### On Physical Device:
- [ ] App requests microphone permission on first launch
- [ ] Permission prompt shows correct app name and description
- [ ] Recording button responds to press and hold
- [ ] Recording indicator shows while holding button
- [ ] Recording stops when button is released
- [ ] "Recording Too Short" error shows if released too quickly
- [ ] Audio is successfully transcribed to text
- [ ] AI response is generated and spoken back
- [ ] Voice settings modal allows changing TTS voice
- [ ] App works on both iOS and Android devices

### Common Issues Resolved:
✅ Explore page no longer crashes
✅ Microphone permissions properly requested
✅ Recording duration properly tracked
✅ Audio format compatible with OpenAI Whisper
✅ Proper error messages for all failure cases
✅ Network timeouts handled gracefully
✅ Audio mode properly reset after recording

## Environment Variables Required

Make sure your `.env` file has:
```bash
# Your Vercel backend URL (required for chat and TTS)
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-backend.vercel.app

# Toolkit URL for STT (already configured)
EXPO_PUBLIC_TOOLKIT_URL=https://toolkit.rork.com

# Server-side OpenAI API key (in .env, not EXPO_PUBLIC_)
OPENAI_API_KEY=sk-proj-...
```

## Next Steps

1. **Test on Physical Device**: Install the app on your iPhone or Android device
2. **Grant Permissions**: Allow microphone access when prompted
3. **Test Recording**: Try the voice coach with different speech lengths
4. **Verify Backend**: Ensure your Vercel backend is deployed and accessible
5. **Check Logs**: Use `console.log` statements to debug any issues

## Support

If you continue to have issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the backend endpoints directly in a browser
4. Ensure your device's microphone is working in other apps
5. Try rebuilding the app with `eas build` if using Expo Go
