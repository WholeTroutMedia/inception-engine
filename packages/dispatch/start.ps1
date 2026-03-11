# Creative Liberation Engine Dispatch â€” Local Dev Activation Script
# Run this once to stand up the dispatch server locally and verify it works.
# After that, the NAS Docker deploy handles production.

$ROOT = "C:\\Creative-Liberation-Engine"
$DISPATCH = Join-Path $ROOT "packages\dispatch"
$DISPATCH_URL = "http://localhost:5050"

Write-Host "`nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—" -ForegroundColor Cyan
Write-Host "â•‘  INCEPTION DISPATCH â€” ACTIVATION         â•‘" -ForegroundColor Cyan
Write-Host "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`n" -ForegroundColor Cyan

# Step 1: Install deps
Write-Host "[1/3] Installing dependencies..." -ForegroundColor Yellow
npm install --prefix $DISPATCH
if ($LASTEXITCODE -ne 0) { Write-Host "âœ— npm install failed" -ForegroundColor Red; exit 1 }
Write-Host "âœ“ Dependencies installed" -ForegroundColor Green

# Step 2: Start the server in background
Write-Host "`n[2/3] Starting dispatch server on port 5050..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    param($path)
    & npx tsx "$path\src\server.ts"
} -ArgumentList $DISPATCH

Start-Sleep -Seconds 4

# Step 3: Health check
Write-Host "`n[3/3] Health check..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "$DISPATCH_URL/health" -TimeoutSec 5
    Write-Host "âœ“ Dispatch server ONLINE at $DISPATCH_URL" -ForegroundColor Green
    Write-Host "  Status: $($r.status) Â· Service: $($r.service)" -ForegroundColor Gray
} catch {
    Write-Host "âœ— Server not responding â€” check output above" -ForegroundColor Red
    Receive-Job $job
    exit 1
}

# Step 4: Show status board
Write-Host "`n=== DISPATCH STATUS ===" -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "$DISPATCH_URL/api/status" -TimeoutSec 5
    Write-Host "Queued tasks : $($status.summary.queued)"
    Write-Host "Active tasks : $($status.summary.active)"
    Write-Host "Projects     : $($status.summary.total_projects)"
    Write-Host "Agents online: $($status.summary.total_agents)"
} catch {
    Write-Host "Could not reach /api/status" -ForegroundColor Yellow
}

Write-Host "`nâœ… Dispatch is running. Console Dashboard will show it as ONLINE." -ForegroundColor Green
Write-Host "   MCP endpoint: $DISPATCH_URL/sse" -ForegroundColor Gray
Write-Host "   REST API:     $DISPATCH_URL/api/status" -ForegroundColor Gray
Write-Host "`n   Press Ctrl+C to stop or leave it running in the background.`n"

# Keep the job alive in terminal
Receive-Job $job -Wait
