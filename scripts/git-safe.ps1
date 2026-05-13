param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$GitCommand,

  [switch]$NoProcessCleanup
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[git-safe] $msg" -ForegroundColor Cyan }
function Write-WarnMsg($msg) { Write-Host "[git-safe] $msg" -ForegroundColor Yellow }

function Remove-LockIfExists([string]$lockPath) {
  if (Test-Path $lockPath) {
    try {
      Remove-Item $lockPath -Force -ErrorAction Stop
      Write-Info "Removed lock: $lockPath"
    } catch {
      Write-WarnMsg "Could not remove lock: $lockPath"
    }
  }
}

function ClearReadOnlyIfExists([string]$path) {
  if (Test-Path $path) {
    try {
      attrib -R $path | Out-Null
      Write-Info "Cleared read-only: $path"
    } catch {
      Write-WarnMsg "Could not clear read-only: $path"
    }
  }
}

Write-Info "Repo root: $PWD"

if (-not $NoProcessCleanup) {
  Write-Info "Stopping stale git processes..."
  Get-Process git -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  # Optional: terminate only node processes spawned from this repo path
  Write-Info "Stopping stale node processes started from this repo..."
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
    $cmd = $_.CommandLine
    if ($cmd -and $cmd -match [regex]::Escape((Get-Location).Path)) {
      try {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Info "Stopped node PID $($_.ProcessId)"
      } catch {}
    }
  }
}

Start-Sleep -Milliseconds 250

# Root git locks/index
Remove-LockIfExists ".git/index.lock"
ClearReadOnlyIfExists ".git/index"

# Worktree locks/indexes
if (Test-Path ".git/worktrees") {
  Get-ChildItem ".git/worktrees" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $wt = $_.FullName
    Remove-LockIfExists (Join-Path $wt "index.lock")
    ClearReadOnlyIfExists (Join-Path $wt "index")
  }
}

Write-Info "Running git command: $GitCommand"
cmd /c "git $GitCommand"
$code = $LASTEXITCODE

if ($code -ne 0) {
  Write-Error "git command failed with exit code $code"
}

Write-Info "Completed successfully."
