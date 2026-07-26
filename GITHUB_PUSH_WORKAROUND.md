# GitHub Push Workaround (Windows Rename Lock Issue)

## If normal `git commit` fails with:
Rename from '.git/...*.lock' failed
fatal: couldn't set 'refs/heads/main'

Use this workaround instead.

### 1. Stage everything

```powershell
git add -A
```

### 2. Create the commit without updating the branch ref

```powershell
$tree = git write-tree
$parent = git rev-parse HEAD
$commit = "YOUR COMMIT MESSAGE" | git commit-tree $tree -p $parent
```

### 3. Update the local branch manually

```powershell
$refPath = Join-Path (Get-Location) ".git\refs\heads\main"

[System.IO.File]::WriteAllText(
    $refPath,
    "$commit`n",
    [System.Text.UTF8Encoding]::new($false)
)
```

### 4. Push

```powershell
git push origin main
```

---

## One-command workaround

Replace `YOUR COMMIT MESSAGE` before running.

```powershell
git add -A; $tree=git write-tree; $parent=git rev-parse HEAD; $commit="YOUR COMMIT MESSAGE" | git commit-tree $tree -p $parent; [System.IO.File]::WriteAllText((Join-Path (Get-Location) ".git\refs\heads\main"),"$commit`n",[System.Text.UTF8Encoding]::new($false)); git push origin main
```

---

## Why this works

Git successfully creates the commit object, but Windows blocks Git from renaming:

- `.git\refs\heads\main.lock`
- `.git\refs\heads\main`

This workaround updates the branch reference directly and then pushes normally.

Current known successful commit:
-
```

This should only be considered a **workaround**, not the long-term fix. If the rename issue continues to occur, it's still worth tracking down the process that's preventing Git from renaming files in `.git`. That would eliminate the need for this special workflow altogether.
