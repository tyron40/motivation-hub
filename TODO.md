# TODO - Fix autoplay + AI chat runtime stability

- [x] Inspect speech and short-clip playback files to identify autoplay failure points
- [x] Verify current speech autoplay behavior in web runtime
- [ ] Route AI APIs permanently to connected Vercel backend (chat/tts/stt)
- [ ] Remove hardcoded toolkit STT URL from app/(tabs)/chat.tsx
- [ ] Harden speeches autoplay behavior in components/AudioOnlyVideoPlayer.tsx
- [ ] Re-run typecheck/lint verification
- [ ] Thorough retest: speeches autoplay, short clips autoplay, AI chat end-to-end
- [ ] Summarize validated behavior and remaining risks
