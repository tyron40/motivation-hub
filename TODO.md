# TODO - Playback, Playlists/Categories, Ads, Flyers, Audio Quality

- [x] 1. Review current implementations in target files for exact edit points
  - [ ] app/player.tsx
  - [ ] components/AudioOnlyVideoPlayer.tsx
  - [ ] hooks/admob-context.tsx
  - [ ] hooks/scripture-favorites-context.tsx
  - [ ] app/playlists.tsx
  - [ ] app/favorites.tsx

- [ ] 2. Implement playback continuity improvements
  - [ ] Keep playback active when app is backgrounded/minimized
  - [ ] Keep playback active when in-app player UI is minimized/closed
  - [ ] Ensure no unintended pause on navigation transitions

- [ ] 3. Implement playlists + category grouping for favorites
  - [ ] Add/extend category model in context
  - [ ] Add UI for create/manage categories
  - [ ] Allow assigning favorites to playlists/categories
  - [ ] Add browse/filter by category

- [ ] 4. Enforce ad full-play lifecycle behavior
  - [ ] Ensure non-skippable ad flow is respected where configured
  - [ ] Gate resume/continue behavior until ad-complete callback

- [ ] 5. Improve flyers visual proportion
  - [ ] Reduce text overlay dominance
  - [ ] Preserve quote readability while exposing more image area
  - [ ] Tune card and modal typography/gradient balance

- [ ] 6. Improve audio loudness quality
  - [ ] Apply safe high baseline volume defaults
  - [ ] Keep distortion/clipping risk low

- [ ] 7. Run critical-path checks
  - [ ] Playback in background
  - [ ] Playback after minimizing player window
  - [ ] Ad full-cycle behavior
  - [ ] Playlist/category create + assign flow
  - [ ] Flyers readability and image visibility

- [ ] 8. Summarize changes and provide next release steps
