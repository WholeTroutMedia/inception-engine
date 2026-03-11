#!/usr/bin/env pwsh
# dispatch-heartbeat.ps1 â€” Keep agent registrations alive in dispatch server
# Fires every 60s. Registers this machine as always-on ambient infrastructure.

$log = "C:\\Creative-Liberation-Engine\.agents\dispatch-heartbeat.log"
$hbUrl = "http://127.0.0.1:5050/api/agents/heartbeat"
$statusUrl = "http://127.0.0.1:5050/api/status"

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Add-Content -Path $log -Value "[$ts] $m" -ErrorAction SilentlyContinue
}

function Send-HB($id, $window, $workstream, $task) {
    $body = @{
        agent_id     = $id
        window       = $window
        workstream   = $workstream
        current_task = $task
        tool         = "cle"
        status       = "active"
    } | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri $hbUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 3 | Out-Null
        return $true
    }
    catch { return $false }
}

WL "=== dispatch-heartbeat START ==="
$cycle = 0

while ($true) {
    $cycle++
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

    # Keep git monitor alive in dispatch
    $ok1 = Send-HB "cle-GIT"    "GIT"  "git-stream-monitor"  "autonomous git commit+push â€” cycle $cycle"
    # Keep ambient boot stack alive
    $ok2 = Send-HB "cle-BOOT"   "BOOT" "boot-stack"          "always-on boot stack monitoring"

    if ($ok1 -and $ok2) {
        WL "cycle $cycle â€” heartbeats OK"
    }
    else {
        WL "cycle $cycle â€” dispatch unreachable (NAS offline?)"
    }

    Start-Sleep -Seconds 60
}
