# Git Safe Workflow (Windows index lock protection)

This repo includes lock-safe wrappers to reduce `.git/index.lock` failures on Windows.

## New scripts

- `npm run git:safe -- "<git args>"`
- `npm run git:acp -- "<commit message>" "<files>"`

## Examples

### 1) Run any git command safely

```bash
npm run git:safe -- "status"
npm run git:safe -- "pull --rebase"
npm run git:safe -- "push"
```

### 2) Add + Commit + Push safely in one command

```bash
npm run git:acp -- "fix(player): play/pause reliability" "components/AudioOnlyVideoPlayer.tsx TODO.md"
```

If you omit files, use `"."` to include all tracked changes.

---

## What `git-safe` does

Before each git command, it:

1. Stops stale git processes.
2. Stops repo-scoped stale node processes.
3. Removes stale lock files:
   - `.git/index.lock`
   - `.git/worktrees/*/index.lock`
4. Clears read-only attribute on index files.
5. Executes exactly one git command.

---

## If lock still appears

1. Close extra terminals in this repo.
2. Close duplicate VS Code windows for this repo.
3. Re-run:

```bash
npm run git:safe -- "status"
```

Then proceed with your command.

---

## Notes

- No project files/folders are renamed by these scripts.
- This does not modify your code; it only stabilizes git command execution.
