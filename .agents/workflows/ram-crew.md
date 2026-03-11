---
description: RAM CREW activation â€” stall detection, diagnosis, and recovery for any loop or hung process
---

# ðŸ” RAM CREW Protocol

**Agent**: RAM_CREW | **Hive**: MUXD | **Auto-trigger**: loops, stalls, hung terminals, repeated failures

---

## Activation Conditions (Auto-Run These)

- Same command fails or gets cancelled 2+ times in a row
- Terminal process running > 30 minutes with no output
- `run_command` repeatedly returns user-cancelled
- git/npm/pnpm hangs indefinitely

---

## Phase 1: DIAGNOSE

// turbo

1. Check all running terminal PIDs and surface what's hung:

```powershell
Get-Process | Where-Object {$_.CPU -gt 100} | Select-Object Name, Id, CPU, WorkingSet | Sort-Object CPU -Descending | Select-Object -First 10
```

// turbo
2. Check all background command IDs from this session â€” call `command_status` on any that are RUNNING for > 5 min with 0 output.

---

## Phase 2: ISOLATE

// turbo
3. Identify root cause category:

- **Terminal saturation** â†’ too many hung background processes
- **Network timeout** â†’ command waiting on unreachable host
- **Git lock** â†’ `.git/index.lock` present
- **Ghost Port Lock** â†’ `EADDRINUSE` error or frozen port caused by an orphaned background process
- **Process deadlock** â†’ circular dependency in parallel commands

---

## Phase 3: RECOVER

### If terminal saturation

// turbo
4. Kill hung git processes:

```powershell
Get-Process git -ErrorAction SilentlyContinue | Stop-Process -Force
```

// turbo  
5. Kill hung node/npm/pnpm:

```powershell
Get-Process -Name "node","npm","pnpm" -ErrorAction SilentlyContinue | Where-Object {$_.CPU -lt 0.01} | Stop-Process -Force
```

### If git lock

// turbo
6. Remove lock file:

```powershell
Remove-Item "C:\\Creative-Liberation-Engine\.git\index.lock" -ErrorAction SilentlyContinue
```

### If Ghost Port Lock (`EADDRINUSE`)

// turbo
6b. Hunt down the orphaned PID running on the specific blocked port (e.g. 5060, 5050, 3000) and assassinate it:

```powershell
$targetPort = 5060 # ALWAYS replace this with the exact port number from the EADDRINUSE error
$ghost = Get-NetTCPConnection -LocalPort $targetPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ghost) { 
    $pidToKill = $ghost.OwningProcess
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    Write-Output "[SPECTRE HUNTER] Assassinated orphaned PID $pidToKill holding port $targetPort"
} else {
    Write-Output "[SPECTRE HUNTER] No ghost process found on port $targetPort"
}
```

### If network timeout

1. Switch to shorter TimeoutSec values (max 5s per call), break into smaller sequential commands, avoid loops.

---

## Phase 4: VALIDATE & RESUME

// turbo
8. Confirm environment is clear:

```powershell
Get-Process git,node,pnpm -ErrorAction SilentlyContinue | Measure-Object | Select-Object Count
```

1. Re-attempt the blocked operation with clean terminal state.
2. Report recovery to user via `notify_user`.

---

## RAM CREW Quality Gates (auto-check before any command batch)

- [ ] No single command runs > 10s without a `WaitMsBeforeAsync` cap
- [ ] No loop iterates > 5 items without a `Start-Sleep -Milliseconds` throttle
- [ ] All network calls use `-TimeoutSec` â‰¤ 8
- [ ] No `2>&1` piped to a background job (causes powershell shell spawning)

---

*RAM CREW | MUXD hive | Auto-escalate to CORTEX after 3 failed recovery attempts*
