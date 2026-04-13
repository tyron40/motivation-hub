# TODO - Per-account data isolation hard-fix

- [x] Audit all account-sensitive storage keys and contexts
- [ ] Scope storage keys by authenticated user id (with guest fallback)
- [ ] Reload/reset context state on user switch/sign-out
- [ ] Apply fixes in hooks/iap-context.tsx
- [ ] Apply fixes in hooks/chat-sessions-context.tsx
- [ ] Apply fixes in hooks/scripture-favorites-context.tsx
- [ ] Apply fixes in hooks/user-profile-context.tsx
- [ ] Run targeted lint/typecheck verification
- [ ] Commit and push fixes for next production build
