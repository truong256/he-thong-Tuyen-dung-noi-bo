# PowerShell script to reproduce / capture baseline screenshots safely from any git commit
param(
  [string]$Commit = "ba299a3",
  [string]$Password = $env:TEST_USER_PASSWORD,
  [int]$Port = 3000,
  [string]$BackendUrl = "http://localhost:8080",
  [switch]$KeepWorktree
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory=$true)]
    [scriptblock]$Command,
    [Parameter(Mandatory=$true)]
    [string]$ErrorMessage
  )
  & $Command
  if ($LASTEXITCODE -ne 0) {
    Write-Error "$ErrorMessage (exit code: $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
}

function Test-ServiceReadiness {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 30,
    [string]$ServiceName = "Service"
  )
  Write-Host "Waiting for $ServiceName to be ready at $Url (timeout: ${TimeoutSeconds}s)..."
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
      $req = [System.Net.WebRequest]::Create($Url)
      $req.Timeout = 1500
      $resp = $req.GetResponse()
      $code = [int]([System.Net.HttpWebResponse]$resp).StatusCode
      $resp.Close()
      if ($code -ge 200 -and $code -lt 400) {
        Write-Host "$ServiceName is ready! (HTTP $code in $($sw.Elapsed.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Green
        return $true
      }
    } catch [System.Net.WebException] {
      if ($_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
        $_.Exception.Response.Close()
        if ($code -ge 200 -and $code -lt 500) {
          Write-Host "$ServiceName is responding! (HTTP $code in $($sw.Elapsed.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Green
          return $true
        }
      }
    } catch {
      # Port not reachable yet
    }
    Start-Sleep -Milliseconds 500
  }
  Write-Error "$ServiceName failed to respond at $Url within $TimeoutSeconds seconds."
  return $false
}

if (-not $Password) {
  Write-Error "TEST_USER_PASSWORD must be provided via -Password parameter or TEST_USER_PASSWORD environment variable."
  exit 1
}

$repoRoot = (Resolve-Path "$PSScriptRoot/../..").Path
$worktreeDir = "$repoRoot/.baseline-worktree"

# 1. Verify backend server connectivity before starting
Write-Host "==> Verifying backend connectivity ($BackendUrl)..." -ForegroundColor Cyan
if (-not (Test-ServiceReadiness -Url $BackendUrl -TimeoutSeconds 10 -ServiceName "Backend Server")) {
  Write-Error "Backend server is not running or unreachable at $BackendUrl. Please start the backend before generating baselines."
  exit 1
}

Write-Host "==> Establishing baseline from commit $Commit..." -ForegroundColor Cyan

# 2. Clean previous worktree if exists
if (Test-Path $worktreeDir) {
  Write-Host "Cleaning existing worktree at $worktreeDir..."
  git worktree remove --force $worktreeDir 2>$null
  if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir }
}

# 3. Add git worktree with exit code check
Write-Host "Creating worktree at $worktreeDir..."
Invoke-CheckedCommand -Command { git worktree add $worktreeDir $Commit } -ErrorMessage "Failed to create git worktree for commit $Commit"

$baselineVerified = $false
$viteProcess = $null

try {
  # 4. Link node_modules to avoid slow npm install
  if (-not (Test-Path "$worktreeDir/frontend/node_modules")) {
    Write-Host "Linking node_modules..."
    New-Item -ItemType Junction -Path "$worktreeDir/frontend/node_modules" -Target "$repoRoot/frontend/node_modules" | Out-Null
    if (-not (Test-Path "$worktreeDir/frontend/node_modules")) {
      Write-Error "Failed to link node_modules into baseline worktree."
      exit 1
    }
  }

  # 5. Start baseline vite server on specified port (e.g. 3000)
  Write-Host "Starting baseline frontend server on port $Port..."
  $viteProcess = Start-Process npx -ArgumentList "vite", "--port", "$Port" -WorkingDirectory "$worktreeDir/frontend" -PassThru -NoNewWindow

  # 6. Verify baseline frontend server readiness
  $frontendReady = Test-ServiceReadiness -Url "http://localhost:$Port" -TimeoutSeconds 30 -ServiceName "Baseline Frontend Server"
  if (-not $frontendReady) {
    Write-Error "Baseline frontend server failed to become ready on port $Port."
    exit 1
  }

  # 7. Capture baselines
  Write-Host "Capturing baseline screenshots into e2e/screenshots/before/..."
  $env:SNAPSHOT_MODE = "before"
  $env:BASELINE_URL = "http://localhost:$Port"
  $env:TEST_USER_PASSWORD = $Password

  Push-Location "$repoRoot/frontend"
  try {
    Invoke-CheckedCommand -Command { npx playwright test e2e/visual-baselines.spec.ts } -ErrorMessage "Playwright baseline capture failed"
  } finally {
    Pop-Location
  }

  # 8. Verify captured baselines exist and are non-empty
  $capturedImages = Get-ChildItem -Path "$repoRoot/frontend/e2e/screenshots/before" -Filter "*.png" -ErrorAction SilentlyContinue
  if (-not $capturedImages -or $capturedImages.Count -lt 12) {
    Write-Error "Baseline capture verification failed: Expected at least 12 PNG screenshots in e2e/screenshots/before, found $(if ($capturedImages) { $capturedImages.Count } else { 0 })."
    exit 1
  }

  $baselineVerified = $true
  Write-Host "==> All $($capturedImages.Count) baselines captured and verified successfully!" -ForegroundColor Green
} finally {
  # Clean up server process
  if ($viteProcess -and -not $viteProcess.HasExited) {
    Write-Host "Stopping baseline server (PID $($viteProcess.Id))..."
    Stop-Process -Id $viteProcess.Id -Force -ErrorAction SilentlyContinue
  }

  # Preserve worktree if unverified or if -KeepWorktree is specified
  if (-not $baselineVerified) {
    Write-Warning "Baseline generation failed or was unverified. PRESERVING worktree at $worktreeDir for debugging."
  } elseif ($KeepWorktree) {
    Write-Host "Flag -KeepWorktree specified. Preserving worktree at $worktreeDir." -ForegroundColor Cyan
  } else {
    Write-Host "Baseline data verified. Removing temporary worktree at $worktreeDir..."
    git worktree remove --force $worktreeDir 2>$null
    if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir -ErrorAction SilentlyContinue }
  }
}
