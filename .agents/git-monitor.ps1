#!/usr/bin/env pwsh
# git-monitor.ps1 ? Autonomous git stream monitor for brainchild-v5
# Runs as background job. Polls every 30s, commits and pushes any dirty state.
# No human input required.

$v5 = "C:\\Creative-Liberation-Engine"
$remote = "origin"
$branch = "main"
$hbUrl = "http://127.0.0.1:5050/api/agents/heartbeat"
$logFile = "$v5\.agents\git-monitor.log"
$cycle = 0

function Write-Log($msg) {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

function Send-Heartbeat($task) {
    $body = @{
        agent_id     = "cle-GIT"
        window       = "GIT"
        workstream   = "git-stream-monitor"
        current_task = $task
        tool         = "cle"
        status       = "active"
    } | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri $hbUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
    }
    catch {}
}

function Get-CommitGroup($files) {
    # Group files by domain for clean commit separation
    $groups = @{}
    foreach ($f in $files) {
        $domain = switch -Wildcard ($f) {
            "*ecosystem/*" { "ecosystem" }
            "*zero-day*" { "zero-day" }
            "*ie-engine-photo*" { "photography" }
            "*console*" { "console" }
            "*sensor-mesh*" { "sensor-mesh" }
            "*genkit*" { "genkit" }
            "*dispatch*" { "dispatch" }
            "*pnpm-lock*" { "deps" }
            "*.agents/dispatch/registry*" { "registry" }
            "*AGENTS.md*" { "agents-config" }
            "*gitea*" { "ci" }
            default { "misc" }
        }
        if (-not $groups[$domain]) { $groups[$domain] = @() }
        $groups[$domain] += $f
    }
    return $groups
}

function Get-CommitMessage($domain, $files) {
    $fileList = ($files | ForEach-Object { "- $_" }) -join "`n"
    switch ($domain) {
        "photography" { return "feat(photography): Wave 13 updates`n`n$fileList" }
        "zero-day" { return "feat(zero-day): GTM intake + analytics updates`n`n$fileList" }
        "console" { return "feat(console): DIRA + console UI updates`n`n$fileList" }
        "genkit" { return "feat(genkit): AI flow updates`n`n$fileList" }
        "sensor-mesh" { return "feat(sensor-mesh): bridge + mesh updates`n`n$fileList" }
        "dispatch" { return "feat(dispatch): server + task routing updates`n`n$fileList" }
        "ecosystem" { return "chore(ecosystem): submodule refs advanced`n`n$fileList" }
        "deps" { return "chore(deps): pnpm lockfile sync`n`n$fileList" }
        "registry" { return "chore(registry): agent dispatch registry update`n`n$fileList" }
        "agents-config" { return "chore(agents): AGENTS.md updates`n`n$fileList" }
        "ci" { return "ci: Forgejo workflow updates`n`n$fileList" }
        default { return "chore: miscellaneous updates`n`n$fileList" }
    }
}

Write-Log "=== git-monitor started ==="

while ($true) {
    $cycle++
    Send-Heartbeat "cycle $cycle ? polling git status"

    # Clear stale lock
    $lockPath = "$v5\.git\index.lock"
    if (Test-Path $lockPath) {
        Remove-Item $lockPath -Force
        Write-Log "LOCK: cleared stale index.lock"
    }

    # Clean up junk untracked files
    @("$v5\askpass.bat", "$v5\build_output.txt") | ForEach-Object {
        if (Test-Path $_) { Remove-Item $_ -Force; Write-Log "CLEAN: removed $_" }
    }

    # Get dirty status
    $status = git -C $v5 status --porcelain 2>&1
    $dirty = $status | Where-Object { $_ -match "^\S" -or $_ -match "^ M " -or $_ -match "^\?\?" }

    if (-not $dirty -or $dirty.Count -eq 0) {
        Write-Log "cycle $cycle ? clean, nothing to commit"
        Send-Heartbeat "cycle $cycle ? clean"
        Start-Sleep -Seconds 30
        continue
    }

    Write-Log "cycle $cycle ? $($dirty.Count) dirty entries found"

    # Parse filenames from porcelain output
    $files = $dirty | ForEach-Object {
        if ($_ -match "^.{2} (.+)$") { $matches[1].Trim().Trim('"') }
    } | Where-Object { $_ }

    # Group into domains
    $groups = Get-CommitGroup $files

    $pushed = $false
    foreach ($domain in $groups.Keys) {
        $domainFiles = $groups[$domain]
        Write-Log "  staging [$domain]: $($domainFiles -join ', ')"

        foreach ($f in $domainFiles) {
            git -C $v5 add $f 2>&1 | Out-Null
        }

        $staged = git -C $v5 diff --cached --name-only 2>&1
        if (-not $staged) {
            Write-Log "  [$domain] nothing staged, skipping"
            continue
        }

        $msg = Get-CommitMessage $domain $domainFiles
        $result = git -C $v5 commit -m $msg 2>&1
        if ($LASTEXITCODE -eq 0) {
            $sha = (git -C $v5 rev-parse --short HEAD 2>&1).Trim()
            Write-Log "  [$domain] committed $sha"
            $pushed = $true
        }
        else {
            Write-Log "  [$domain] commit failed: $result"
        }
    }

    if ($pushed) {
        Write-Log "pushing to $remote/$branch..."
        $pushResult = git -C $v5 push $remote $branch 2>&1
        $finalSha = (git -C $v5 rev-parse --short HEAD 2>&1).Trim()
        Write-Log "pushed -> $finalSha"
        Send-Heartbeat "cycle $cycle ? pushed $finalSha"
    }

    Start-Sleep -Seconds 30
}

