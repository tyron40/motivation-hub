# TODO - Speech Player Play/Pause Fix

- [x] Analyze short-clips playback control behavior
- [x] Analyze AudioOnlyVideoPlayer hidden-player control behavior
- [x] Prepare approved simplification plan
- [x] Refactor `components/AudioOnlyVideoPlayer.tsx` to short-clips-style `shouldPlay` single-source control
- [x] Remove conflicting command/watchdog branches causing hidden-player desync
- [ ] Add manual play recovery nudge + paused-state retry guard in speech player
- [ ] Run critical-path verification steps (speech play, pause, rapid toggle, next/previous)
- [ ] Summarize test findings and final status
