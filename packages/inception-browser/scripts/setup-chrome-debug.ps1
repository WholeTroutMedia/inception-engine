# Creative Liberation Engine - Universal Browser Agent Setup
# Sets up Chrome, Edge, and Brave with CDP debug ports so AVERI can attach to them.
#
# Creates desktop shortcuts that launch browsers with:
#   --remote-debugging-port=<port>
#   --user-data-dir=<isolated dir>  (separate profile, main profile untouched)
#
# After running this script:
#   1. Use the "Chrome (Inception)" shortcut on your desktop
#   2. In Creative Liberation Engine, call: browser_attach_cdp({ port: 9222 })
#   3. AVERI can now co-pilot your browser in real-time

$INCEPTION_DIR = "$env:APPDATA\InceptionBrowserProfiles"
New-Item -ItemType Directory -Force -Path $INCEPTION_DIR | Out-Null

$Desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell

Write-Host ""
Write-Host "=== INCEPTION ENGINE - Universal Browser Agent Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Creating browser shortcuts with CDP debug ports..." -ForegroundColor Yellow
Write-Host ""

$Browsers = @(
    @{
        Name       = "Chrome (Inception)"
        Exe        = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        Port       = 9222
        ProfileDir = "$INCEPTION_DIR\Chrome"
        Icon       = "C:\Program Files\Google\Chrome\Application\chrome.exe,0"
    },
    @{
        Name       = "Edge (Inception)"
        Exe        = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        Port       = 9223
        ProfileDir = "$INCEPTION_DIR\Edge"
        Icon       = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe,0"
    },
    @{
        Name       = "Brave (Inception)"
        Exe        = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
        Port       = 9224
        ProfileDir = "$INCEPTION_DIR\Brave"
        Icon       = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe,0"
    },
    @{
        Name       = "Arc (Inception)"
        Exe        = "$env:LOCALAPPDATA\Programs\Arc\Arc.exe"
        Port       = 9225
        ProfileDir = "$INCEPTION_DIR\Arc"
        Icon       = "$env:LOCALAPPDATA\Programs\Arc\Arc.exe,0"
    },
    @{
        Name       = "Firefox (Inception)"
        Exe        = if (Test-Path "C:\Program Files\Mozilla Firefox\firefox.exe") {
            "C:\Program Files\Mozilla Firefox\firefox.exe"
        }
        else {
            "C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
        }
        Port       = 9226
        ProfileDir = "$INCEPTION_DIR\Firefox"
        Icon       = "C:\Program Files\Mozilla Firefox\firefox.exe,0"
    },
    @{
        Name       = "Opera (Inception)"
        Exe        = if (Test-Path "$env:LOCALAPPDATA\Programs\Opera\opera.exe") {
            "$env:LOCALAPPDATA\Programs\Opera\opera.exe"
        }
        else {
            "C:\Program Files\Opera\opera.exe"
        }
        Port       = 9227
        ProfileDir = "$INCEPTION_DIR\Opera"
        Icon       = "$env:LOCALAPPDATA\Programs\Opera\opera.exe,0"
    }
)

$Created = @()
$Skipped = @()

foreach ($B in $Browsers) {
    if (-not (Test-Path $B.Exe)) {
        $Skipped += "  [skip] $($B.Name) not installed at $($B.Exe)"
        continue
    }

    New-Item -ItemType Directory -Force -Path $B.ProfileDir | Out-Null

    $ShortcutPath = Join-Path $Desktop "$($B.Name).lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $B.Exe

    # Firefox uses -profile + --no-remote; Chromium family uses --user-data-dir
    if ($B.Name -like "*Firefox*") {
        $Shortcut.Arguments = "-profile `"$($B.ProfileDir)`" --no-remote --remote-debugging-port=$($B.Port)"
    }
    else {
        $Shortcut.Arguments = "--remote-debugging-port=$($B.Port) --user-data-dir=""$($B.ProfileDir)"""
    }

    $Shortcut.WorkingDirectory = Split-Path $B.Exe -Parent

    $IconExe = $B.Icon.Split(',')[0]
    if (Test-Path $IconExe) {
        $Shortcut.IconLocation = $B.Icon
    }

    $Shortcut.Save()
    $Created += "  [OK] $($B.Name) -> port :$($B.Port)  profile: $($B.ProfileDir)"
}

# Results
Write-Host "Shortcuts created:" -ForegroundColor Green
$Created | ForEach-Object { Write-Host $_ -ForegroundColor Green }

if ($Skipped.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped (not installed):" -ForegroundColor DarkGray
    $Skipped | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Use a shortcut above instead of your normal browser" -ForegroundColor White
Write-Host "  2. In Creative Liberation Engine, call:" -ForegroundColor White
Write-Host "       browser_attach_cdp({ port: 9222 })  <- Chrome" -ForegroundColor Cyan
Write-Host "       browser_attach_cdp({ port: 9223 })  <- Edge" -ForegroundColor Cyan
Write-Host "       browser_attach_cdp({ port: 9224 })  <- Brave" -ForegroundColor Cyan
Write-Host "       browser_attach_cdp({ port: 9226 })  <- Firefox" -ForegroundColor Cyan
Write-Host "       browser_attach_cdp({ port: 9227 })  <- Opera" -ForegroundColor Cyan
Write-Host "  3. AVERI sees your open tabs and can co-pilot the browser" -ForegroundColor White
Write-Host "  4. Call browser_mesh_nodes() to see all connected browser nodes" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Your existing browser shortcuts/profiles are NOT modified." -ForegroundColor DarkGray
Write-Host "CDP profiles are isolated at: $INCEPTION_DIR" -ForegroundColor DarkGray
Write-Host ""
