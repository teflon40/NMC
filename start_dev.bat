@echo off
echo ========================================
echo   Starting NMC Admin Dashboard
echo ========================================

echo.
echo Detecting local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "Bluetooth" ^| findstr /v "VMware" ^| findstr /v "VirtualBox"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%

echo Detected IP: %IP%

echo.
echo Writing IP into .env files...

REM Update frontend .env and .env.local (only VITE_API_URL line)
powershell -Command "(Get-Content .env) -replace 'VITE_API_URL=.*', 'VITE_API_URL=http://%IP%:5000/api' | Set-Content .env"
powershell -Command "(Get-Content .env.local) -replace 'VITE_API_URL=.*', 'VITE_API_URL=http://%IP%:5000/api' | Set-Content .env.local"

REM Update backend .env (only FRONTEND_URL line — DATABASE_URL is untouched)
powershell -Command "(Get-Content backend\.env) -replace 'FRONTEND_URL=.*', 'FRONTEND_URL=http://%IP%:3000' | Set-Content backend\.env"

echo .env files updated!

echo.
echo Starting Backend Server on Port 5000...
start "NMC Backend" cmd /k "cd backend && npm run dev"

echo.
echo Starting Frontend Server on Port 3000...
start "NMC Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo  Open on this machine:  http://localhost:3000
echo  Open on other devices: http://%IP%:3000
echo ========================================
echo.
pause
