@echo off
echo ============================================
echo  NMC - Reset PostgreSQL Password (Run as Admin)
echo ============================================
echo.

REM Reload postgres config (pg_hba.conf already set to trust)
echo Reloading PostgreSQL config...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\16\data" 2>nul
timeout /t 2 /nobreak >nul

REM Set the new password
echo Setting postgres password to: nmcadmin2024
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5432 -c "ALTER USER postgres WITH PASSWORD 'nmcadmin2024';"

REM Also make sure nmc_db exists
echo.
echo Creating nmc_db if it doesn't exist...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5432 -c "CREATE DATABASE nmc_db;" 2>nul

REM Restore scram-sha-256 auth (secure)
echo.
echo Restoring secure auth...
copy /Y "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.bak" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf" >nul
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\16\data" 2>nul

echo.
echo ============================================
echo  Done! Password is now: nmcadmin2024
echo  Restart the backend server after this.
echo ============================================
pause
