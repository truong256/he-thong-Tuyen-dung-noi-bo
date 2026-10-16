# PowerShell script to run visual regression comparison against recorded baselines
param(
  [string]$Password = $env:TEST_USER_PASSWORD,
  [string]$Project = "" # optional: "desktop-1440", "tablet-768", "mobile-390"
)

$ErrorActionPreference = "Stop"

if (-not $Password) {
  Write-Error "TEST_USER_PASSWORD must be provided via -Password parameter or TEST_USER_PASSWORD environment variable."
  exit 1
}

$repoRoot = (Resolve-Path "$PSScriptRoot/../..").Path

$env:SNAPSHOT_MODE = "after"
$env:TEST_USER_PASSWORD = $Password

$cmdArgs = @("playwright", "test", "e2e/visual-baselines.spec.ts")
if ($Project) {
  $cmdArgs += @("--project", $Project)
}

Write-Host "==> Running visual comparison against baseline..." -ForegroundColor Cyan
Push-Location "$repoRoot/frontend"
try {
  npx @cmdArgs
  Write-Host "==> All visual tests passed!" -ForegroundColor Green

  # Print summary table
  node -e "const r = require('./e2e/screenshots/diff-report.json'); console.table(r.map(x => ({ page: x.page, viewport: x.viewport, diffPixels: x.diffPixels, diffPercent: x.diffPercent + '%', passed: x.passed })));"
} finally {
  Pop-Location
}
