param(
    [string]$Endpoint
)

function Resolve-WeatherPort {
    if ($env:WEATHER_PORT -and $env:WEATHER_PORT -as [int]) {
        return [int]$env:WEATHER_PORT
    }

    try {
        $nodes = Get-Process node -ErrorAction Stop
        foreach ($proc in $nodes) {
            $connections = Get-NetTCPConnection -OwningProcess $proc.Id -State Listen -ErrorAction Stop
            $candidate = $connections | Where-Object { $_.LocalPort -in 3000, 3001 } | Select-Object -First 1
            if ($candidate) { return $candidate.LocalPort }
            $first = $connections | Select-Object -First 1
            if ($first) { return $first.LocalPort }
        }
    } catch {
        try {
            $netstat = netstat -ano | Select-String 'LISTENING'
            foreach ($line in $netstat) {
                if ($line -match ':(\d+)\s+.*LISTENING\s+(\d+)$') {
                    $port = [int]$Matches[1]
                    $pid = [int]$Matches[2]
                    try {
                        $process = Get-Process -Id $pid -ErrorAction Stop
                        if ($process.ProcessName -eq 'node') {
                            return $port
                        }
                    } catch {}
                }
            }
        } catch {}
    }

    return 3000
}

$port = Resolve-WeatherPort
if (-not $Endpoint) {
    $Endpoint = "http://localhost:$port/api/health"
}

Write-Host "[health-check] Target: $Endpoint" -ForegroundColor Cyan

try {
    $resp = Invoke-RestMethod -Uri $Endpoint -Method Get -TimeoutSec 5
    $json = $resp | ConvertTo-Json -Depth 5
    Write-Host "[health-check] Success" -ForegroundColor Green
    Write-Output $json
    exit 0
} catch {
    Write-Host "[health-check] Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
