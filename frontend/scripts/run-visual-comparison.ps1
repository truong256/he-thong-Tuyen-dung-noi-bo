# PowerShell script to run visual regression comparison against recorded baselines
param(
  [string]$Password = $env:TEST_USER_PASSWORD,
  [string]$Project = "", # optional: "desktop-1440", "tablet-768", "mobile-390"
  [int]$Workers = 2,
  [string]$FrontendUrl = "http://localhost:5173",
  [string]$BackendUrl = "http://localhost:8080"
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
    [int]$TimeoutSeconds = 15,
    [string]$ServiceName = "Service"
  )
  Write-Host "Checking readiness for $ServiceName at $Url..."
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
      $req = [System.Net.WebRequest]::Create($Url)
      $req.Timeout = 1500
      $resp = $req.GetResponse()
      $code = [int]([System.Net.HttpWebResponse]$resp).StatusCode
      $resp.Close()
      if ($code -ge 200 -and $code -lt 400) {
        Write-Host "$ServiceName is ready! (HTTP $code)" -ForegroundColor Green
        return $true
      }
    } catch [System.Net.WebException] {
      if ($_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
        $_.Exception.Response.Close()
        if ($code -ge 200 -and $code -lt 500) {
          Write-Host "$ServiceName responded with HTTP $code." -ForegroundColor Green
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

# 1. Verify backend server connectivity
Write-Host "==> Verifying backend server connectivity ($BackendUrl)..." -ForegroundColor Cyan
if (-not (Test-ServiceReadiness -Url $BackendUrl -TimeoutSeconds 10 -ServiceName "Backend Server")) {
  Write-Error "Backend server is not running or unreachable at $BackendUrl. Visual regression requires active backend."
  exit 1
}

# 2. Verify frontend server connectivity
Write-Host "==> Verifying frontend dev server ($FrontendUrl)..." -ForegroundColor Cyan
if (-not (Test-ServiceReadiness -Url $FrontendUrl -TimeoutSeconds 10 -ServiceName "Frontend Dev Server")) {
  Write-Error "Frontend server is not running or unreachable at $FrontendUrl. Please start 'npm run dev' first."
  exit 1
}

# 3. Check baseline screenshots exist
$beforeDir = "$repoRoot/frontend/e2e/screenshots/before"
if (-not (Test-Path $beforeDir) -or (Get-ChildItem -Path $beforeDir -Filter "*.png").Count -eq 0) {
  Write-Error "No baseline screenshots found in $beforeDir. Run generate-baselines.ps1 first to capture baselines."
  exit 1
}

$env:SNAPSHOT_MODE = "after"
$env:TEST_USER_PASSWORD = $Password

$cmdArgs = @("playwright", "test", "e2e/visual-baselines.spec.ts")
if ($Project) {
  $cmdArgs += @("--project", $Project)
}
if ($Workers -gt 0) {
  $cmdArgs += @("--workers", "$Workers")
}

Write-Host "==> Running visual comparison against baseline..." -ForegroundColor Cyan
Push-Location "$repoRoot/frontend"
try {
  Invoke-CheckedCommand -Command { npx @cmdArgs } -ErrorMessage "Playwright visual comparison tests failed"
  Write-Host "==> All visual tests passed!" -ForegroundColor Green

  # Print summary table and check exit code
  Invoke-CheckedCommand -Command {
    node -e "const r = require('./e2e/screenshots/diff-report.json'); console.table(r.map(x => ({ page: x.page, viewport: x.viewport, diffPixels: x.diffPixels, diffPercent: x.diffPercent + '%', passed: x.passed })));"
  } -ErrorMessage "Failed to render visual diff report summary"
} finally {
  Pop-Location
}
