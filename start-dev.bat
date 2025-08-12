@echo off
echo Starting Ruvo Player Development Environment...
echo.

echo Starting Local API Server...
start "API Server" cmd /k "cd api && node server.js"

echo Waiting for API server to start...
timeout /t 3 /nobreak > nul

echo Starting Angular Development Server...
start "Angular Dev Server" cmd /k "npm run serve"

echo.
echo Development environment is starting...
echo - API Server: http://localhost:3333
echo - Angular App: http://localhost:4200
echo.
echo Press any key to close this window...
pause > nul
