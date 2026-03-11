#!/usr/bin/env pwsh
# active-window-monitor.ps1 â€” Intent-Stream Edge Prefetching
# Uses C# Win32 API to detect the active foreground window.
# When context switches (e.g. Code -> Figma), pings Dispatch to pre-warm APIs.

$log = "C:\\Creative-Liberation-Engine\.agents\active-window-monitor.log"
$dispatchUrl = "http://127.0.0.1:5050/api/intent"

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

function WL($m) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Add-Content -Path $log -Value "[$ts] $m" -ErrorAction SilentlyContinue
}

WL "=== active-window-monitor START ==="
$lastTitle = ""

while ($true) {
    $hwnd = [Win32]::GetForegroundWindow()
    $sb = New-Object System.Text.StringBuilder 256
    $ret = [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity)
    $title = $sb.ToString()

    if ($title -ne $lastTitle -and $title -ne "") {
        $lastTitle = $title
        
        # Intent classification heuristics
        $intent = "IDLE"
        if ($title -match "Visual Studio Code|Cursor") { $intent = "CODE" }
        elseif ($title -match "Figma") { $intent = "DESIGN" }
        elseif ($title -match "Google Chrome|Firefox|Edge") { $intent = "RESEARCH_OR_TEST" }
        elseif ($title -match "PowerShell|Terminal|cmd") { $intent = "CLI" }

        WL "Focus Shift: [$intent] $title"

        # Fire intent to Dispatch (for pre-warming Cloud Run / Genkit)
        $body = @{ event = "focus_shift"; window = $title; inferred_intent = $intent } | ConvertTo-Json -Compress
        try {
            Invoke-RestMethod -Uri $dispatchUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
        }
        catch {}
    }

    Start-Sleep -Milliseconds 1500
}
