# TODO - Hidden Video Play/Pause Reliability Fix

- [ ] Add manual-control-priority state handling in `components/AudioOnlyVideoPlayer.tsx`
- [ ] Add forced/manual request path and grace window for contradictory paused events
- [ ] Ensure manual pause cancels recovery/autoplay retries and timers
- [ ] Ensure manual play retries deterministically once when mismatch persists
- [ ] Run focused validation (`lint` and targeted `tsc` check)
- [ ] Commit and push fix branch
- [ ] User runtime verify on device/TestFlight (play, pause, play again, seek)
