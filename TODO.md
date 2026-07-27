# TODO - AI Chat + Voice Coach Reliability Hotfix

- [ ] Update backend base URL config fallback chain in `lib/config.ts`
  - [ ] Support `EXPO_PUBLIC_VERCEL_API_BASE_URL`
  - [ ] Support `EXPO_PUBLIC_RORK_API_BASE_URL`
  - [ ] Keep safe default fallback URL
  - [ ] Log selected source for diagnostics

- [ ] Fix Voice Coach credit handling in `app/voice-coach.tsx`
  - [ ] Remove duplicate credit charge in TTS path
  - [ ] Keep one credit charge per successful chat turn

- [ ] Run critical-path API verification against deployed backend
  - [ ] GET `/api/health`
  - [ ] POST `/api/chat`
  - [ ] POST `/api/tts`
  - [ ] POST `/api/stt` validation behavior

- [ ] Summarize findings and next steps for fast rebuild/release
