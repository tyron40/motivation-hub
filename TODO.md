# Regression Restoration TODO (Mode A: Full Thorough Restoration + Testing)

## Phase 1: Baseline / Diff Mapping
- [ ] Capture current git status and identify all modified files
- [ ] Compare target behavior against pre-regression commits for:
  - [ ] speech fetch
  - [ ] player play/pause
  - [ ] paywalls/IAP
  - [ ] coach character visibility
  - [ ] Christian-only category filtering
  - [ ] voice coach STT/chat/TTS loop
  - [ ] ads behavior

## Phase 2: Targeted Code Restorations
- [ ] Restore speech fetch behavior parity
- [ ] Restore player play/pause behavior parity
- [ ] Restore paywalls/IAP behavior parity
- [ ] Ensure two black male coach characters visible in list
- [ ] Ensure Christian-only filtering when enabled
- [ ] Restore voice coach mic -> STT -> chat -> TTS loop behavior parity
- [ ] Restore ads behavior parity

## Phase 3: Validation (Critical + Thorough)
- [ ] Validate frontend flows for all impacted screens/components
- [ ] Validate backend/API paths for affected endpoints
- [ ] Run curl tests for happy/error/edge cases:
  - [ ] /api/chat
  - [ ] /api/tts
  - [ ] /api/stt
  - [ ] affected speech/content endpoints
- [ ] Confirm no unrelated regressions introduced

## Phase 4: Finalization
- [ ] Summarize tested vs untested coverage
- [ ] Commit/push changes
- [ ] Prepare final release/build guidance
