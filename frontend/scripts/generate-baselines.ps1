# PowerShell script to reproduce / capture baseline screenshots safely from any git commit
param(
  [string]$Commit = "920a9abd",
  [string]$Password = $env:TEST_USER_PASSWORD,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

if (-not $Password) {
  Write-Error "TEST_USER_PASSWORD must be provided via -Password parameter or TEST_USER_PASSWORD environment variable."
  exit 1
}

$repoRoot = (Resolve-Path "$PSScriptRoot/../..").Path
$worktreeDir = "$repoRoot/.baseline-worktree"

Write-Host "==> Establishing baseline from commit $Commit..." -ForegroundColor Cyan

# 1. Clean previous worktree if exists
if (Test-Path $worktreeDir) {
  Write-Host "Cleaning existing worktree at $worktreeDir..."
  git worktree remove --force $worktreeDir 2>$null
  if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir }
}

# 2. Add git worktree
Write-Host "Creating worktree at $worktreeDir..."
git worktree add $worktreeDir $Commit

try {
  # 3. Link node_modules to avoid npm install
  if (-not (Test-Path "$worktreeDir/frontend/node_modules")) {
    Write-Host "Linking node_modules..."
    New-Item -ItemType Junction -Path "$worktreeDir/frontend/node_modules" -Target "$repoRoot/frontend/node_modules" | Out-Null
  }

  # 4. Start baseline vite server on specified port (e.g. 3000)
  Write-Host "Starting baseline frontend server on port $Port..."
  $viteProcess = Start-Process npx -ArgumentList "vite", "--port", "$Port" -WorkingDirectory "$worktreeDir/frontend" -PassThru -NoNewWindow
  Start-Sleep -Seconds 4

  # 5. Capture baselines
  Write-Host "Capturing baseline screenshots into e2e/screenshots/before/..."
  $env:SNAPSHOT_MODE = "before"
  $env:BASELINE_URL = "http://localhost:$Port"
  $env:TEST_USER_PASSWORD = $Password

  Push-Location "$repoRoot/frontend"
  try {
    npx playwright test e2e/visual-baselines.spec.ts
  } finally {
    Pop-Location
  }

  Write-Host "==> Baselines captured successfully!" -ForegroundColor Green
} finally {
  # Clean up server process and worktree
  if ($viteProcess -and -not $viteProcess.HasExited) {
    Write-Host "Stopping baseline server..."
    Stop-Process -Id $viteProcess.Id -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Removing baseline worktree..."
  git worktree remove --force $worktreeDir 2>$null
  if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir -ErrorAction SilentlyContinue }
}
