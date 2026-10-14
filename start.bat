@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI CHẠY HỆ THỐNG TUYỂN DỤNG NỘI BỘ (ATS)
echo ========================================================

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

rem Tải biến môi trường từ file .env nếu có
set "SPRING_PROFILES_ACTIVE=dev"
if exist "%~dp0.env" (
    for /f "usebackq eol=# tokens=1* delims==" %%A in ("%~dp0.env") do (
        set "%%A=%%B"
    )
)

echo [1/2] Đang kiểm tra và khởi động Backend (Spring Boot: http://localhost:8080 - Profiles: %SPRING_PROFILES_ACTIVE%)...
if not exist "%~dp0backend\auth-service\target\auth-service-0.0.1-SNAPSHOT.jar" (
    echo Đang đóng gói backend JAR...
    pushd "%~dp0backend\auth-service"
    call mvnw.cmd package -DskipTests
    popd
)
start "ATS Backend - Spring Boot" /d "%~dp0backend\auth-service" cmd /k ""%JAVA_HOME%\bin\java.exe" -jar target\auth-service-0.0.1-SNAPSHOT.jar --spring.profiles.active=%SPRING_PROFILES_ACTIVE%"

echo [2/2] Đang khởi động Frontend (Vite: http://localhost:5173)...
start "ATS Frontend - React Vite" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Hệ thống đang chạy tại:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8080
echo.
echo   Tài khoản mặc định:
echo   - Admin:          admin@company.com / Password123@
echo   - Recruiter:      recruiter@company.com / Password123@
echo   - HR Manager:     hr_manager@company.com / Password123@
echo   - Interviewer:    interviewer@company.com / Password123@
echo   - Hiring Manager: hiring_manager@company.com / Password123@
echo   - Approver:       approver@company.com / Password123@
echo   - Candidate:      candidate@company.com / Password123@
echo ========================================================
pause
