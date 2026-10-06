# Script khởi chạy toàn bộ hệ thống Tuyển dụng nội bộ (ATS)
$ErrorActionPreference = "Stop"
$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  KHỞI CHẠY HỆ THỐNG TUYỂN DỤNG NỘI BỘ (ATS)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Kiểm tra và khởi động Backend (Spring Boot: http://localhost:8080)..." -ForegroundColor Green
$jarPath = "$projectRoot\backend\auth-service\target\auth-service-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "  Đang đóng gói backend JAR..." -ForegroundColor Yellow
    Push-Location "$projectRoot\backend\auth-service"
    & .\mvnw.cmd package -DskipTests
    Pop-Location
}
Start-Process powershell -WorkingDirectory "$projectRoot\backend\auth-service" -ArgumentList "-NoExit", "-Command", "& '$javaHome\bin\java.exe' -jar target\auth-service-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev"

Write-Host "[2/2] Khởi động Frontend (React Vite: http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$projectRoot\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  Đã mở terminal cho cả Backend và Frontend!" -ForegroundColor Yellow
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Backend:  http://localhost:8080" -ForegroundColor Yellow
Write-Host "`n  Tài khoản đăng nhập kiểm thử (Mật khẩu: Password123@):" -ForegroundColor Cyan
Write-Host "  - Admin:          admin@company.com"
Write-Host "  - Recruiter:      recruiter@company.com"
Write-Host "  - HR Manager:     hr_manager@company.com"
Write-Host "  - Interviewer:    interviewer@company.com"
Write-Host "  - Hiring Manager: hiring_manager@company.com"
Write-Host "  - Approver:       approver@company.com"
Write-Host "  - Candidate:      candidate@company.com"
Write-Host "========================================================`n" -ForegroundColor Cyan
