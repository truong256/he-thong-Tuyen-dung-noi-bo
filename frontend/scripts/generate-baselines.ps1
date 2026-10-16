# PowerShell script to reproduce / capture baseline screenshots safely from any git commit
param(
  [string]$Commit = "ba299a3",
  [string]$Password = $env:TEST_USER_PASSWORD,
  [int]$Port = 3000,
  [string]$BackendUrl = "http://localhost:8080",
  [int]$Workers = 2,
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
  Write-Host "Waiting for $ServiceName at $Url to be ready (timeout: ${TimeoutSeconds}s)..."
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
      # Connection refused or port not open yet
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

# 2. Check and safely handle existing worktree
if (Test-Path $worktreeDir) {
  Write-Host "Existing worktree detected at $worktreeDir. Checking integrity..." -ForegroundColor Yellow
  $dirtyStatus = git -C $worktreeDir status --porcelain 2>$null
  if ($dirtyStatus) {
    Write-Error "CRITICAL: Existing worktree at $worktreeDir contains uncommitted or unverified changes! Refusing to delete or overwrite. Please inspect or stash changes manually."
    exit 1
  }

  $existingCommit = (git -C $worktreeDir rev-parse --short HEAD 2>$null)
  if ($existingCommit -and ($Commit.StartsWith($existingCommit) -or $existingCommit.StartsWith($Commit))) {
    Write-Host "Existing worktree is already at target commit $Commit and clean. Reusing worktree..." -ForegroundColor Green
  } else {
    Write-Host "Existing worktree is at commit $existingCommit (requested: $Commit). Safely removing clean worktree..."
    Invoke-CheckedCommand -Command { git worktree remove $worktreeDir } -ErrorMessage "Failed to safely remove existing worktree"
    if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir }
  }
}

# 3. Add git worktree if not present
if (-not (Test-Path $worktreeDir)) {
  Write-Host "Creating isolated worktree at $worktreeDir for commit $Commit..."
  Invoke-CheckedCommand -Command { git worktree add $worktreeDir $Commit } -ErrorMessage "Failed to create git worktree for commit $Commit"
}

# Verify worktree commit
$verifiedCommit = (git -C $worktreeDir rev-parse --short HEAD)
Write-Host "Worktree verified at commit: $verifiedCommit (expected: $Commit)" -ForegroundColor Green

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

  # 5. Start baseline vite server on specified port with --strictPort
  Write-Host "Starting baseline frontend server on port $Port with --strictPort..."
  $viteProcess = Start-Process "cmd.exe" -ArgumentList "/c", "npx", "vite", "--port", "$Port", "--strictPort" -WorkingDirectory "$worktreeDir/frontend" -PassThru -NoNewWindow

  # 6. Verify baseline frontend server readiness
  $frontendReady = Test-ServiceReadiness -Url "http://localhost:$Port" -TimeoutSeconds 30 -ServiceName "Baseline Frontend Server"
  if (-not $frontendReady) {
    Write-Error "Baseline frontend server failed to become ready on port $Port."
    exit 1
  }

  # 7. Capture baselines
  Write-Host "Capturing baseline screenshots into e2e/screenshots/baselines/$Commit/..."
  $env:SNAPSHOT_MODE = "before"
  $env:BASELINE_COMMIT = $Commit
  $env:BASELINE_URL = "http://localhost:$Port"
  $env:TEST_USER_PASSWORD = $Password

  $cmdArgs = @("playwright", "test", "e2e/visual-baselines.spec.ts")
  if ($Workers -gt 0) {
    $cmdArgs += @("--workers", "$Workers")
  }

  Push-Location "$repoRoot/frontend"
  try {
    Invoke-CheckedCommand -Command { npx @cmdArgs } -ErrorMessage "Playwright baseline capture failed"
  } finally {
    Pop-Location
  }

  # 8. Verify captured baselines exist and are non-empty
  $baselineDir = "$repoRoot/frontend/e2e/screenshots/baselines/$Commit"
  $capturedImages = Get-ChildItem -Path $baselineDir -Filter "*.png" -ErrorAction SilentlyContinue
  $metaPath = "$baselineDir/metadata.json"

  if (-not $capturedImages -or $capturedImages.Count -lt 12) {
    Write-Error "Baseline capture verification failed: Expected at least 12 PNG screenshots in $baselineDir, found $(if ($capturedImages) { $capturedImages.Count } else { 0 })."
    exit 1
  }

  if (-not (Test-Path $metaPath)) {
    Write-Error "Baseline verification failed: metadata.json was not created in $baselineDir."
    exit 1
  }

  $baselineVerified = $true
  Write-Host "==> All $($capturedImages.Count) baselines for commit $Commit captured and verified with metadata!" -ForegroundColor Green
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
    Write-Host "Baseline data verified. Safely removing temporary worktree at $worktreeDir..."
    git worktree remove $worktreeDir
    if (Test-Path $worktreeDir) { Remove-Item -Recurse -Force $worktreeDir -ErrorAction SilentlyContinue }
  }
}
