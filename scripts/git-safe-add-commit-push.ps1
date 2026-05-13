param(
  [Parameter(Mandatory = $true)]
  [string]$CommitMessage,

  [string]$Files = "."
)

$ErrorActionPreference = "Stop"

Write-Host "[git-safe-acp] Staging files: $Files" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File ".\scripts\git-safe.ps1" -GitCommand "add $Files"

Write-Host "[git-safe-acp] Creating commit..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File ".\scripts\git-safe.ps1" -GitCommand "commit -m `"$CommitMessage`""

Write-Host "[git-safe-acp] Pushing..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File ".\scripts\git-safe.ps1" -GitCommand "push"

Write-Host "[git-safe-acp] Done." -ForegroundColor Green
