#!/usr/bin/env pwsh
# nas-watchdog.ps1 â€” Monitor NAS + write live state to system-status.json
# Pings NAS every 60s. Updates CORE_FOUNDATION/system-status.json with live metrics.

$log = "C:\\Creative-Liberation-Engine\.agents\nas-watchdog.log"
$statusFile = "D:\Google Creative Liberation Engine\Creative Liberation Engine Brainchild\brainchild-v4\CORE_FOUNDATION\system-status.json"
$nasIp = "127.0.0.1"
$endpoints = @{
    dispatch = "http://$($nasIp):5050/api/status"
    genkit   = "http://$($nasIp):4100/health"
}

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Add-Content -Path $log -Value "[$ts] $m" -ErrorAction SilentlyContinue
}

function Test-Ep($url) {
    try { Invoke-RestMethod -Uri $url -TimeoutSec 3 -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

function Get-DispatchSummary {
    try {
        $r = Invoke-RestMethod -Uri $endpoints.dispatch -TimeoutSec 3 -ErrorAction Stop
        return @{ queued = $r.summary.queued; active = $r.summary.active; done = $r.summary.done; agents = $r.summary.total_agents }
    }
    catch { return @{ queued = 0; active = 0; done = 0; agents = 0 } }
}

WL "=== nas-watchdog START ==="

while ($true) {
    $nasOnline = [bool](Test-Connection -ComputerName $nasIp -Count 1 -Quiet -ErrorAction SilentlyContinue)
    $dispatchOnline = Test-Ep $endpoints.dispatch
    $genkitOnline = Test-Ep $endpoints.genkit
    $dispatch = if ($dispatchOnline) { Get-DispatchSummary } else { @{ queued = 0; active = 0; done = 0; agents = 0 } }

    $status = @{
        timestamp = (Get-Date -Format "o")
        nas       = @{ online = $nasOnline; ip = $nasIp }
        dispatch  = @{ online = $dispatchOnline; queued = $dispatch.queued; active = $dispatch.active; done = $dispatch.done; agents = $dispatch.agents }
        genkit    = @{ online = $genkitOnline; endpoint = "http://$($nasIp):4100" }
        system    = @{ hostname = $env:COMPUTERNAME; user = $env:USERNAME }
        cortex     = @{ STRATA = "active"; LOGD = "active"; PRISM = "active" }
    }

    # Read existing file to preserve fields we don't touch
    $existing = @{}
    if (Test-Path $statusFile) {
        try { $existing = Get-Content $statusFile -Raw | ConvertFrom-Json -AsHashtable } catch {}
    }
    # Merge
    foreach ($k in $status.Keys) { $existing[$k] = $status[$k] }

    # Write back
    $existing | ConvertTo-Json -Depth 6 | Set-Content $statusFile -Encoding UTF8 -ErrorAction SilentlyContinue

    $nasStr = if ($nasOnline) { "âœ…" } else { "âŒ" }
    $dStr = if ($dispatchOnline) { "âœ…" } else { "âŒ" }
    $gStr = if ($genkitOnline) { "âœ…" } else { "âŒ" }
    WL "NAS=$nasStr Dispatch=$dStr Genkit=$gStr | Q=$($dispatch.queued) A=$($dispatch.active) Done=$($dispatch.done)"

    # SELF-HEALING ANOMALY PROPAGATION
    if (-not $genkitOnline -and -not $nasOnline) {
        # Check if local Genkit process exists, kill it, and restart
        WL "ANOMALY DETECTED: Genkit & NAS offline. Initiating self-healing wave..."
        $npxProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "genkit start" }
        if ($npxProcs) {
            WL "-> Killing hung Genkit processes..."
            $npxProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        }
        WL "-> Re-firing genkit-autostart daemon..."
        Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -File `"C:\\Creative-Liberation-Engine\.agents\genkit-autostart.ps1`""
    }

    Start-Sleep -Seconds 60
}
