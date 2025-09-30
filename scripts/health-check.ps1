param(
    [string]$Path = $null
)

function Get-ListeningPort {
    param(
        [int[]]$PreferredPorts = @(3000, 3001)
    )

    if ($env:WEATHER_PORT) {
        return [int]$env:WEATHER_PORT
    }

    foreach ($port in $PreferredPorts) {
        try {
            $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connection) {
                return $port
            }
        } catch {
            # Fallback to netstat parsing when Get-NetTCPConnection is unavailable
            try {
                $netstat = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
                if ($netstat) {
                    return $port
                }
            } catch {
                continue
            }
        }
    }

    try {
        $nodeProcesses = Get-Process -Name node -ErrorAction Stop
        foreach ($proc in $nodeProcesses) {
            $connections = Get-NetTCPConnection -OwningProcess $proc.Id -State Listen -ErrorAction SilentlyContinue
            $port = $connections | Where-Object { $_.LocalPort } | Select-Object -First 1 -ExpandProperty LocalPort
            if ($port) {
                return [int]$port
            }
        }
    } catch {
        # Ignore discovery errors
    }

    return 3000
}

function Invoke-HealthCheck {
    param(
        [string]$Url
    )

    Write-Host "[health-check] Probing $Url"
    try {
        $resp = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10 -ErrorAction Stop
        $resp | ConvertTo-Json -Depth 5
        Write-Host "[health-check] OK" -ForegroundColor Green
        return 0
    } catch {
        Write-Warning "[health-check] Request failed: $($_.Exception.Message)"
        return 1
    }
}

$port = Get-ListeningPort
$endpoint = if ($Path) { $Path } else { "http://localhost:$port/api/health" }

$exitCode = Invoke-HealthCheck -Url $endpoint
exit $exitCode
