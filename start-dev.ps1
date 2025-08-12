Write-Host "Starting Ruvo Player Development Environment..." -ForegroundColor Green
Write-Host ""

# Kill any existing processes on port 3333
Write-Host "Checking for existing processes on port 3333..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($processes) {
    Write-Host "Found existing process on port 3333. Stopping..." -ForegroundColor Yellow
    foreach ($process in $processes) {
        Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Start API Server
Write-Host "Starting Local API Server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd api && node server.js" -WindowStyle Normal -PassThru | Out-Null

# Wait for API server to start
Write-Host "Waiting for API server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test API server
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API Server is running on http://localhost:3333" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ API Server failed to start properly" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Start Angular Dev Server
Write-Host "Starting Angular Development Server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/k", "npm run serve" -WindowStyle Normal -PassThru | Out-Null

Write-Host ""
Write-Host "Development environment is starting..." -ForegroundColor Green
Write-Host "- API Server: http://localhost:3333" -ForegroundColor White
Write-Host "- Angular App: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "Both servers are now running in separate windows." -ForegroundColor Green
Write-Host "Press any key to close this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
