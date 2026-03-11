#!/usr/bin/env pwsh
# log-rotator.ps1 â€” Cap all .agents/ logs at 500 lines
# Runs once at logon. Prevents log bloat across all daemons.

$agentsDir = "C:\\Creative-Liberation-Engine\.agents"
$maxLines = 500

Get-ChildItem $agentsDir -Filter "*.log" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -ErrorAction SilentlyContinue
    if ($content -and $content.Count -gt $maxLines) {
        $kept = $content | Select-Object -Last $maxLines
        $header = "# [rotated $(Get-Date -Format 'yyyy-MM-dd HH:mm') â€” kept last $maxLines lines]"
        @($header) + $kept | Set-Content $file -Encoding UTF8
        Write-Host "Rotated: $($_.Name) ($($content.Count) â†’ $maxLines lines)"
    }
}
Write-Host "Log rotation complete"
