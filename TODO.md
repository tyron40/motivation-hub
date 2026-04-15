# TODO

- [x] Fix play/pause to reliably control active speech playback in player flow
- [x] Harden flyer save-to-device flow for real-device Photos reliability
- [x] Add "Save to Playlist" action for current/selected speech
- [x] Patch flyer save path handling to avoid "No writable directory available"
- [x] Add manual-pause guards to remaining autoplay recovery timers
- [x] Run targeted validation checks (tsc + runtime checks for flyer save/play-pause)
- [x] Commit and push fixes to GitHub main
- [x] Build updated iOS binary (remote build number 236)
- [ ] Fix Expo SDK54 flyer download deprecation (`expo-file-system` -> legacy/new API)
- [ ] Ensure play/pause button is hard-synced to hidden YouTube player state/actions
- [ ] Run tsc after flyer + play/pause sync fixes
- [ ] Commit and push flyer/play-pause sync fixes
- [ ] Trigger next iOS build/submission with latest fixes
