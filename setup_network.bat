@echo off
:: ============================================================
::  LOCAL SERVER SETUP SCRIPT
::  Run as Administrator!
::  Sets up firewall rules + local server access for your laptop
:: ============================================================

:: Check for Admin privileges
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please run this script as Administrator!
    echo Right-click the file and choose "Run as administrator"
    pause
    exit /b
)

echo.
echo ============================================================
echo   SETTING UP YOUR LAPTOP AS A LOCAL SERVER
echo ============================================================
echo.

:: ============================================================
:: STEP 1 - Enable network discovery and file sharing
:: ============================================================
echo [1/7] Enabling Network Discovery and File Sharing...
netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes
netsh advfirewall firewall set rule group="File and Printer Sharing" new enable=Yes
echo      Done.

:: ============================================================
:: STEP 2 - Allow common dev server ports through the firewall
:: ============================================================
echo [2/7] Opening common development server ports...

:: HTTP
netsh advfirewall firewall add rule name="Local Server - HTTP (80)" protocol=TCP dir=in localport=80 action=allow
:: HTTPS
netsh advfirewall firewall add rule name="Local Server - HTTPS (443)" protocol=TCP dir=in localport=443 action=allow
:: Node.js / Vite / React default ports
netsh advfirewall firewall add rule name="Local Server - Node 3000" protocol=TCP dir=in localport=3000 action=allow
netsh advfirewall firewall add rule name="Local Server - Node 4000" protocol=TCP dir=in localport=4000 action=allow
netsh advfirewall firewall add rule name="Local Server - Vite 5173" protocol=TCP dir=in localport=5173 action=allow
:: Python / Django / Flask
netsh advfirewall firewall add rule name="Local Server - Python 8000" protocol=TCP dir=in localport=8000 action=allow
netsh advfirewall firewall add rule name="Local Server - Flask 5000" protocol=TCP dir=in localport=5000 action=allow
:: PHP / XAMPP / Laravel
netsh advfirewall firewall add rule name="Local Server - PHP 8080" protocol=TCP dir=in localport=8080 action=allow
netsh advfirewall firewall add rule name="Local Server - PHP 8888" protocol=TCP dir=in localport=8888 action=allow
:: Live Server (VS Code extension)
netsh advfirewall firewall add rule name="Local Server - Live Server 5500" protocol=TCP dir=in localport=5500 action=allow
:: MySQL
netsh advfirewall firewall add rule name="Local Server - MySQL 3306" protocol=TCP dir=in localport=3306 action=allow
:: MongoDB
netsh advfirewall firewall add rule name="Local Server - MongoDB 27017" protocol=TCP dir=in localport=27017 action=allow
:: PostgreSQL
netsh advfirewall firewall add rule name="Local Server - PostgreSQL 5432" protocol=TCP dir=in localport=5432 action=allow
echo      Done.

:: ============================================================
:: STEP 3 - Allow inbound pings (so devices can find you)
:: ============================================================
echo [3/7] Allowing inbound ping (ICMP)...
netsh advfirewall firewall add rule name="Allow ICMPv4 Inbound" protocol=icmpv4:8,any dir=in action=allow
echo      Done.

:: ============================================================
:: STEP 4 - Set network profile to Private (required for sharing)
:: ============================================================
echo [4/7] Setting active network profile to Private...
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo      Done.

:: ============================================================
:: STEP 5 - Enable and start required Windows services
:: ============================================================
echo [5/7] Starting required services...
sc config "FDResPub" start=auto && net start "FDResPub" >nul 2>&1
sc config "SSDPSRV" start=auto && net start "SSDPSRV" >nul 2>&1
sc config "upnphost" start=auto && net start "upnphost" >nul 2>&1
sc config "lmhosts" start=auto && net start "lmhosts" >nul 2>&1
echo      Done.

:: ============================================================
:: STEP 6 - Show your local IP address
:: ============================================================
echo [6/7] Fetching your local IP address...
echo.
echo ---- YOUR LOCAL IP ADDRESS(ES) ----
ipconfig | findstr /i "IPv4"
echo -----------------------------------
echo.
echo  Other devices on your network should use one of these IPs
echo  to access your projects. Example: http://192.168.x.x:3000
echo.

:: ============================================================
:: STEP 7 - Optional: Share a specific folder
:: ============================================================
echo [7/7] Optional folder sharing setup...
echo.
set /p SHARE_FOLDER="Enter full path of folder to share (or press Enter to skip): "
if not "%SHARE_FOLDER%"=="" (
    set /p SHARE_NAME="Enter a share name for that folder (e.g. Projects): "
    net share "%SHARE_NAME%"="%SHARE_FOLDER%" /GRANT:Everyone,READ
    echo      Folder shared as \\%COMPUTERNAME%\%SHARE_NAME%
) else (
    echo      Skipped folder sharing.
)

:: ============================================================
:: DONE
:: ============================================================
echo.
echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo   WHAT WAS DONE:
echo   - Network Discovery turned ON
echo   - File Sharing turned ON
echo   - Dev ports opened: 80, 443, 3000, 4000, 5000, 5173,
echo     5432, 5500, 8000, 8080, 8888, 27017, 3306
echo   - Ping (ICMP) allowed from other devices
echo   - Network profile set to Private
echo   - Required Windows services started
echo.
echo   HOW OTHER DEVICES ACCESS YOUR PROJECTS:
echo   1. Connect them to the same WiFi/network as your laptop
echo   2. Start your dev server (e.g. npm run dev, python manage.py runserver 0.0.0.0:8000)
echo   3. On their browser: http://YOUR_IP:PORT
echo      e.g. http://192.168.1.5:3000
echo.
echo   TIP: For servers to be reachable, bind them to 0.0.0.0
echo   instead of localhost/127.0.0.1 when starting them.
echo.
pause
