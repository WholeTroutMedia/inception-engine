#!/usr/bin/env pwsh
# genkit-autostart.ps1 â€” Boot Genkit engine on logon
# Probes NAS first, then local. Starts local if both unreachable.

$log = "C:\\Creative-Liberation-Engine\.agents\genkit-autostart.log"
$nasUrl = "http://127.0.0.1:4100/health"
$localUrl = "http://localhost:4100/health"
$engineDir = "C:\\Creative-Liberation-Engine\packages\genkit"

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    $line = "[$ts] $m"
    Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue
}

function Test-Endpoint($url) {
    try {
        $r = Invoke-RestMethod -Uri $url -TimeoutSec 3 -ErrorAction Stop
        return $r.status -eq "operational" -or $r.status -eq "ok" -or $null -ne $r
    }
    catch { return $false }
}

WL "=== genkit-autostart ==="

# 1. Check NAS Genkit
if (Test-Endpoint $nasUrl) {
    WL "NAS Genkit online â€” no action needed"
    exit 0
}

WL "NAS Genkit offline"

# 2. Check local
if (Test-Endpoint $localUrl) {
    WL "Local Genkit already running â€” no action needed"
    exit 0
}

WL "Local Genkit offline â€” starting..."

# 3. Start local Genkit
$proc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "cd /d `"$engineDir`" && npx genkit start -- npx ts-node src/server.ts >> `"$log`" 2>&1" `
    -WindowStyle Hidden `
    -PassThru

WL "Genkit start launched (PID=$($proc.Id))"

# 4. Wait up to 30s for it to come online
$attempts = 0
while ($attempts -lt 10) {
    Start-Sleep -Seconds 3
    if (Test-Endpoint $localUrl) {
        WL "Genkit online at localhost:4100"
        exit 0
    }
    $attempts++
}

WL "WARNING: Genkit did not respond after 30s"
