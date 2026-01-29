# PowerShell script to stop existing ngrok tunnels via API
# Usage: .\stop-ngrok-tunnels.ps1

# Read NGROK_AUTHTOKEN from .env file
$envContent = Get-Content .env | Where-Object { $_ -match "^NGROK_AUTHTOKEN=(.+)$" }
if ($envContent) {
    $authToken = ($envContent -split "=")[1].Trim()
} else {
    Write-Host "ERROR: NGROK_AUTHTOKEN not found in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Fetching active tunnels..." -ForegroundColor Yellow

# Get list of active tunnels
$headers = @{
    "Authorization" = "Bearer $authToken"
    "Ngrok-Version" = "2"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.ngrok.com/tunnels" -Headers $headers -Method Get
    
    if ($response.tunnels.Count -eq 0) {
        Write-Host "No active tunnels found." -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($response.tunnels.Count) active tunnel(s):" -ForegroundColor Yellow
    
    foreach ($tunnel in $response.tunnels) {
        Write-Host "  - ID: $($tunnel.id), Public URL: $($tunnel.public_url)" -ForegroundColor Cyan
        
        # Stop the tunnel
        try {
            Invoke-RestMethod -Uri "https://api.ngrok.com/tunnels/$($tunnel.id)/stop" -Headers $headers -Method Post
            Write-Host "  ✓ Stopped tunnel: $($tunnel.id)" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to stop tunnel: $($tunnel.id)" -ForegroundColor Red
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`nAll tunnels stopped successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to communicate with ngrok API" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

