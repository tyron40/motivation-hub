# TODO - Comprehensive Reliability Remediation (Approved Plan)

## 1) Shared category normalization
- [ ] Create `lib/category-normalization.ts`
- [ ] Add alias map + normalizeCategory + token helpers
- [ ] Integrate helper import points for category/speech matching

## 2) Category screen loading resilience
- [ ] Refactor `app/category/[id].tsx` fetch orchestration to `Promise.allSettled`
- [ ] Reset loading/error/online state on route id/category change
- [ ] Implement tiered source merge (context → category API → trending → fallback)
- [ ] Add progressive relevance threshold relaxation
- [ ] Apply soft duration filtering (avoid over-pruning to empty)
- [ ] Improve dedupe by id/youtubeId/title+speaker normalization
- [ ] Add explicit UI states (loading, retry, offline fallback, empty reason)

## 3) Speech context alignment
- [ ] Update `hooks/speech-context.tsx` to use shared normalization utility
- [ ] Replace strict/exact category dependency with normalized alias/token matching

## 4) Canonical API base URL/config
- [ ] Update `lib/config.ts` env priority to canonical order
- [ ] Sanitize/trailing-slash normalization and production-safe localhost handling
- [ ] Keep safe diagnostics logging of chosen source

## 5) API client error surfacing
- [ ] Update `lib/api-client.ts` to preserve safe server error messages consistently
- [ ] Keep retry/timeout behavior and stable diagnostics structure

## 6) Backend route + diagnostics hardening
- [ ] Update `backend/hono.ts` health payload shape:
- [ ] `{ ok, environment, services: { openaiConfigured, youtubePrimaryConfigured, youtubeSecondaryConfigured } }`
- [ ] Add request-id generation/propagation and response header
- [ ] Standardize safe JSON error envelope for key handlers
- [ ] Support both GET and POST for youtube category/search/trending routes
- [ ] Preserve server-only handling of sensitive env keys

## 7) Vercel routing sanity
- [ ] Validate/update `vercel.json` rewrite behavior for `/api/*`
- [ ] Update `api/index.ts` only if forwarding gaps are found

## 8) Voice Coach deterministic recording state
- [ ] Refactor `app/voice-coach.tsx` phase machine (idle/preparing/recording/stopping/transcribing/thinking/speaking/error)
- [ ] Replace press-and-hold with reliable tap-to-start/tap-to-stop flow
- [ ] Add iOS audio session settle + controlled retry
- [ ] Block recording while greeting/TTS active
- [ ] Surface stage-specific errors (recording/transcription/chat/speech)
- [ ] Remove fallback fake response masking backend failures

## 9) Environment docs alignment
- [ ] Update `env.example` with canonical variables and server/client clarity
- [ ] Keep backward compatibility notes for legacy variable names

## 10) Validation + reporting
- [ ] Run available lint/type checks
- [ ] Run backend endpoint verification (health/chat/tts/stt/youtube)
- [ ] Record command log + outcomes
- [ ] Provide final root-cause summary, changed files, tested endpoints, commit hash
