# 해양 운항 서비스 헬스 체크. Marine operations service health check.

Write-Host "=== Marine Operations Health Check ===" -ForegroundColor Green
Write-Host "Checking services on ports 3000-3005..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002, 3003, 3004, 3005)
$results = @()

foreach ($port in $ports) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 5 -ErrorAction Stop
        $status = "✅ RUNNING"
        $color = "Green"
    }
    catch {
        $status = "❌ DOWN"
        $color = "Red"
    }
    
    $results += [PSCustomObject]@{
        Port = $port
        Status = $status
        Color = $color
    }
    
    Write-Host "Port $port`: $status" -ForegroundColor $color
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
$running = ($results | Where-Object { $_.Status -like "✅*" }).Count
$total = $results.Count

Write-Host "Running: $running/$total services" -ForegroundColor Yellow

if ($running -eq 0) {
    Write-Host "⚠️  No services are running. Start the development server with 'npm run dev'" -ForegroundColor Red
} elseif ($running -lt $total) {
    Write-Host "⚠️  Some services are down. Check the logs for errors." -ForegroundColor Yellow
} else {
    Write-Host "🎉 All services are running!" -ForegroundColor Green
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Check the Marine Operations Intelligence dashboard" -ForegroundColor White
Write-Host "3. Test the API endpoints:" -ForegroundColor White
Write-Host "   - GET /api/marine-weather" -ForegroundColor Gray
Write-Host "   - POST /api/marine-ops" -ForegroundColor Gray
Write-Host "4. Run Python tests: pytest tests/" -ForegroundColor White
