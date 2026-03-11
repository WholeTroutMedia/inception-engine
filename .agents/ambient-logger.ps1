#!/usr/bin/env pwsh
# ambient-logger.ps1 â€” Persistent Ambient Episodic Memory (SCRIBE v3)
# Snapshots active context every 5 minutes and buffers it for vectorization.

$log = "C:\\Creative-Liberation-Engine\.agents\ambient-logger.log"
$bufferFile = "C:\\Creative-Liberation-Engine\.agents\scribe-buffer.json"
$v5 = "C:\\Creative-Liberation-Engine"

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Add-Content -Path $log -Value "[$ts] $m" -ErrorAction SilentlyContinue
}

WL "=== ambient-logger START ==="

while ($true) {
    # 1. Get git branch + status
    $branch = (git -C $v5 branch --show-current 2>&1).Trim()
    $dirty = (git -C $v5 status --porcelain 2>&1).Count

    # 2. Get active window (reuse logic if needed, or just rely on intent-stream)
    # For now, just logging the state.

    # 3. Form episodic memory snapshot
    $snapshot = @{
        timestamp = (Get-Date -Format "o")
        context   = @{
            branch            = $branch
            uncommitted_files = $dirty
            focus_project     = "brainchild-v5"
        }
    }

    $existing = @()
    if (Test-Path $bufferFile) {
        try { $existing = Get-Content $bufferFile -Raw | ConvertFrom-Json } catch {}
    }
    
    # Keep last 50 episodes
    $newStack = @()
    if ($existing) { $newStack += $existing }
    $newStack += $snapshot
    if ($newStack.Count -gt 50) { $newStack = $newStack | Select-Object -Last 50 }

    $newStack | ConvertTo-Json -Depth 5 -Compress | Set-Content $bufferFile -Encoding UTF8
    WL "Episode snapshotted ($branch, $dirty dirty files) -> scribe-buffer.json"

    Start-Sleep -Seconds 300 # 5 minutes
}
