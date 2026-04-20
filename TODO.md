# Ad Trigger Verification TODO

- [x] Verify AdManager is initialized via global provider mount
- [x] Confirm root cause of 0 requests (banner component returns null)
- [x] Implement functional `components/AdBanner.tsx` with production unit ID
- [x] Trace ad trigger callsites in speeches, short videos, and chat screens
- [x] Wire missing trigger calls to `useAdMob()` methods
- [x] Add minimal debug logs/counters for trigger visibility
- [ ] Run critical-path runtime checks (init/load/show/close/reward)
- [ ] Commit and push fixes to `main`
- [ ] Build and submit updated iOS build if requested
