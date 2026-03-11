#!/usr/bin/env pwsh
# morning-briefing.ps1 â€” Generate daily logon briefing for CORTEX
# Runs once per day at logon. Writes briefing.md to .agents/ and dispatch.

$briefingFile = "C:\\Creative-Liberation-Engine\.agents\briefing.md"
$log = "C:\\Creative-Liberation-Engine\.agents\morning-briefing.log"
$v5 = "C:\\Creative-Liberation-Engine"
$markerFile = "C:\\Creative-Liberation-Engine\.agents\.briefing-date"
$dispatchUrl = "http://127.0.0.1:5050/api/status"
$gitMonLog = "C:\\Creative-Liberation-Engine\.agents\git-monitor.log"

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Add-Content -Path $log -Value "[$ts] $m" -ErrorAction SilentlyContinue
}

# Only run once per calendar day
$today = (Get-Date).ToString("yyyy-MM-dd")
if ((Test-Path $markerFile) -and (Get-Content $markerFile -ErrorAction SilentlyContinue) -eq $today) {
    WL "Briefing already generated today â€” skipping"
    exit 0
}

WL "=== morning-briefing generating ==="

# --- Data gathering ---
# Git log (last 24h)
$since = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd HH:mm")
$commits = git -C $v5 log --oneline --since=`"$since`" 2>&1
$commitCount = ($commits | Where-Object { $_ }).Count

# Git monitor pushes from log
$pushes = @()
if (Test-Path $gitMonLog) {
    $pushes = Get-Content $gitMonLog | Where-Object { $_ -match "PUSHED" } | Select-Object -Last 10
}

# Dispatch state
$queuedTasks = @(); $activeTasks = @(); $doneCount = 0; $agentCount = 0
try {
    $dispatch = Invoke-RestMethod -Uri $dispatchUrl -TimeoutSec 3
    $queuedTasks = $dispatch.queued_tasks | ForEach-Object { "- [$($_.priority.ToUpper())] $($_.title)" }
    $activeTasks = $dispatch.active_tasks | ForEach-Object { "- $($_.title)" }
    $doneCount = $dispatch.summary.done
    $agentCount = $dispatch.summary.total_agents
}
catch { }

# NAS status
$nasOnline = [bool](Test-Connection -ComputerName "127.0.0.1" -Count 1 -Quiet -ErrorAction SilentlyContinue)

# Git status (uncommitted)
$dirty = (git -C $v5 status --porcelain 2>&1) | Where-Object { $_ }

# --- Build briefing ---
$date = (Get-Date).ToString("dddd, MMMM d yyyy â€” h:mm tt")
$lines = @(
    "# ðŸŒ… CORTEX Morning Briefing",
    "_Generated: $date_",
    "",
    "---",
    "",
    "## ðŸ“¡ System Status",
    "| Service | State |",
    "|---------|-------|",
    "| NAS (127.0.0.1) | $(if($nasOnline){'âœ… Online'}else{'âŒ Offline'}) |",
    "| Dispatch | $(if($queuedTasks -or $activeTasks){'âœ… Online'}else{'âš ï¸ No data'}) |",
    "| Active Agents | $agentCount |",
    "| Tasks Done (total) | $doneCount |",
    "",
    "## ðŸ“¬ Task Queue",
    "**Queued:**"
)
if ($queuedTasks) { $lines += $queuedTasks } else { $lines += "_No queued tasks_" }
$lines += ""
$lines += "**Active:**"
if ($activeTasks) { $lines += $activeTasks } else { $lines += "_None_" }
$lines += ""
$lines += "## ðŸ”€ Git Activity (last 24h)"
$lines += "**Commits:** $commitCount"
$lines += ""
if ($pushes) {
    $lines += "**Recent pushes:**"
    $lines += $pushes
}
if ($dirty) {
    $lines += ""
    $lines += "âš ï¸ **Uncommitted changes:** $($dirty.Count) files"
}
else {
    $lines += ""
    $lines += "âœ… Working tree clean"
}
$lines += ""
$lines += "---"
$lines += "_CORTEX is online. Good morning, Justin._"

# Write briefing
$lines -join "`n" | Set-Content $briefingFile -Encoding UTF8
$today | Set-Content $markerFile -Encoding UTF8

WL "Briefing written: $commitCount commits, $($queuedTasks.Count) queued tasks"
WL "File: $briefingFile"
