import { execSync } from 'child_process';
import {
    type DeviceEntity,
    type StorageEntity,
    type ProcessEntity,
    type DisplayEntity,
} from '../schema/index.js';

// ─── CORTEX Workstation Agent — Windows Collector ─────────────────────────────
// Gathers device, storage, process, and display state from the local Windows machine.
// Designed to run on a schedule (cron) or on demand.
// Uses PowerShell for WMI/PnP queries — no admin elevation required for read ops.

function ps(script: string): string {
    try {
        return execSync(
            `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`,
            { encoding: 'utf8', timeout: 10_000 }
        ).trim();
    } catch {
        return '';
    }
}

function psJson<T>(script: string): T[] {
    try {
        const raw = execSync(
            `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')} | ConvertTo-Json -Depth 3 -Compress"`,
            { encoding: 'utf8', timeout: 15_000 }
        ).trim();
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return [];
    }
}

// ── Device collector ──────────────────────────────────────────────────────────
export function collectDevices(): DeviceEntity[] {
    const rows = psJson<{
        FriendlyName: string;
        Class: string;
        Status: string;
        InstanceId: string;
    }>(`Get-PnpDevice | Where-Object { $_.Class -in @('HIDClass','USB','Mouse','Keyboard','AudioEndpoint','Monitor','Bluetooth','Camera','DiskDrive','Printer','Image') } | Select-Object FriendlyName, Class, Status, InstanceId`);

    return rows
        .filter(r => r.FriendlyName)
        .map(r => {
            const vidMatch = r.InstanceId?.match(/VID_([0-9A-F]{4})/i);
            const pidMatch = r.InstanceId?.match(/PID_([0-9A-F]{4})/i);
            const isBT = r.Class?.toLowerCase() === 'bluetooth' ||
                r.InstanceId?.includes('BTHENUM') || r.InstanceId?.includes('BTH');
            const isUSB = r.InstanceId?.includes('USB');

            return {
                id: r.InstanceId ?? `device-${r.FriendlyName}`,
                tier: 'workstation' as const,
                category: 'device' as const,
                label: r.FriendlyName,
                status: r.Status === 'OK' ? 'online' as const :
                    r.Status === 'Unknown' ? 'offline' as const : 'degraded' as const,
                last_seen: new Date().toISOString(),
                attention_score: r.Status === 'OK' ? 10 : 60,
                device_class: r.Class ?? 'Unknown',
                friendly_name: r.FriendlyName,
                connection_type: isBT ? 'Bluetooth' as const : isUSB ? 'USB' as const : 'internal' as const,
                driver_status: (r.Status ?? 'Unknown') as DeviceEntity['driver_status'],
                vendor_id: vidMatch?.[1],
                product_id: pidMatch?.[1],
                instance_id: r.InstanceId,
            } satisfies DeviceEntity;
        });
}

// ── Storage collector ─────────────────────────────────────────────────────────
export function collectStorage(): StorageEntity[] {
    const rows = psJson<{
        DeviceID: string;
        VolumeName: string;
        DriveType: number;
        Size: string;
        FreeSpace: string;
        FileSystem: string;
    }>(`Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, VolumeName, DriveType, Size, FreeSpace, FileSystem`);

    const driveTypeMap: Record<number, StorageEntity['drive_type']> = {
        2: 'USB', 3: 'SSD', 4: 'Network', 5: 'USB', 6: 'Virtual',
    };

    return rows.map(r => {
        const total = parseInt(r.Size ?? '0', 10) || 0;
        const free = parseInt(r.FreeSpace ?? '0', 10) || 0;
        return {
            id: r.DeviceID,
            tier: 'workstation' as const,
            category: 'storage' as const,
            label: r.VolumeName || r.DeviceID,
            status: total > 0 ? 'online' as const : 'unknown' as const,
            last_seen: new Date().toISOString(),
            attention_score: free / total < 0.1 ? 80 : 5,  // high attention if <10% free
            mount_point: r.DeviceID,
            total_bytes: total,
            free_bytes: free,
            used_bytes: total - free,
            filesystem: r.FileSystem,
            drive_type: driveTypeMap[r.DriveType] ?? 'SSD',
        } satisfies StorageEntity;
    });
}

// ── Process collector (top 15 by CPU) ────────────────────────────────────────
export function collectProcesses(): ProcessEntity[] {
    const rows = psJson<{
        Name: string;
        Id: number;
        CPU: number;
        WorkingSet: number;
    }>(`Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name, Id, CPU, WorkingSet`);

    return rows.map(r => ({
        id: String(r.Id),
        tier: 'workstation' as const,
        category: 'process' as const,
        label: r.Name,
        status: 'online' as const,
        last_seen: new Date().toISOString(),
        attention_score: Math.min(100, Math.round((r.CPU ?? 0) / 10)),
        pid: r.Id,
        name: r.Name,
        cpu_percent: r.CPU ?? 0,
        memory_mb: Math.round((r.WorkingSet ?? 0) / 1024 / 1024),
    } satisfies ProcessEntity));
}

// ── Display collector ─────────────────────────────────────────────────────────
export function collectDisplays(): DisplayEntity[] {
    const rows = psJson<{
        Name: string;
        Manufacturer: string;
    }>(`Get-PnpDevice | Where-Object { $_.Class -eq 'Monitor' -and $_.Status -eq 'OK' } | Select-Object FriendlyName, @{N='Manufacturer';E={$_.FriendlyName}}`);

    return rows
        .filter(r => r.Name)
        .map((r, i) => ({
            id: `display-${i}`,
            tier: 'workstation' as const,
            category: 'display' as const,
            label: r.Name,
            status: 'online' as const,
            last_seen: new Date().toISOString(),
            attention_score: 5,
            model: r.Name,
            resolution_w: 0,
            resolution_h: 0,
            is_primary: i === 0,
            manufacturer: r.Manufacturer,
        } satisfies DisplayEntity));
}

// ── System info ───────────────────────────────────────────────────────────────
export function collectSystemInfo(): { hostname: string; os: string; uptime_seconds: number } {
    const hostname = ps('hostname') || 'unknown';
    const os = ps('(Get-WmiObject Win32_OperatingSystem).Caption') || 'Windows';
    const uptimeRaw = ps('(Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime | Select-Object -ExpandProperty TotalSeconds');
    const uptime_seconds = Math.round(parseFloat(uptimeRaw) || 0);
    return { hostname, os, uptime_seconds };
}

// ── Full workstation snapshot ─────────────────────────────────────────────────
export function collectWorkstationSnapshot() {
    const [sys, devices, storage, processes, displays] = [
        collectSystemInfo(),
        collectDevices(),
        collectStorage(),
        collectProcesses(),
        collectDisplays(),
    ];

    return {
        captured_at: new Date().toISOString(),
        tier: 'workstation' as const,
        ...sys,
        devices,
        storage,
        processes,
        displays,
    };
}
