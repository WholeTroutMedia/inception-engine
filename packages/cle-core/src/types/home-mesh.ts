/**
 * Sovereign Home Mesh — Shared Domain Types
 *
 * Physical intelligence layer for the Creative Liberation Engine.
 * Used by: @cle/sovereign-home-mesh, genkit flows, MCP tools.
 *
 * Constitutional: Article I (Sovereignty) — all data self-hosted, zero cloud deps.
 */

// ─── Device & Guest Identity ──────────────────────────────────────────────────

export interface GuestDevice {
    /** MAC address of the device (primary key) */
    mac: string;
    /** Inferred device class: phone, laptop, tablet, iot, unknown */
    deviceClass: 'phone' | 'laptop' | 'tablet' | 'iot' | 'unknown';
    /** Inferred OS from user-agent or mDNS fingerprint */
    os?: string;
    /** Raw user-agent string from captive portal capture */
    userAgent?: string;
    /** ISO timestamp of first detection */
    firstSeen: string;
    /** ISO timestamp of most recent detection */
    lastSeen: string;
    /** Total number of times this device has been detected */
    visitCount: number;
    /** IP assigned at last detection */
    lastIp?: string;
}

export interface AssociateLink {
    /** GuestProfile ID of the associated known guest */
    guestId: string;
    /** 0–1 confidence score (increases with co-occurrences) */
    confidence: number;
    /** Number of detected co-occurrences (same network, within 15min window) */
    coOccurrences: number;
    /** ISO timestamp of when this link was first established */
    firstLinked: string;
}

export interface GuestProfile {
    /** Stable UUID for this guest */
    id: string;
    /** Optional human-readable name (from portal registration) */
    name?: string;
    /** Optional hosted photo URL */
    photoUrl?: string;
    /** All devices linked to this guest */
    devices: GuestDevice[];
    /** Associate links — other guests/unknowns that frequently co-occur */
    associates: AssociateLink[];
    /** Free-form host notes */
    notes: string;
    /** ISO timestamps of each visit */
    visitHistory: string[];
    /** ISO timestamp of guest profile creation */
    createdAt: string;
    /** ISO timestamp of last update */
    updatedAt: string;
}

// ─── Presence & Events ────────────────────────────────────────────────────────

export type PresenceEventType =
    | 'arrival'
    | 'departure'
    | 'zone-cross'
    | 'detection'
    | 'plate-read'
    | 'bird-sighting'
    | 'anomaly';

export interface PresenceEvent {
    /** Stable UUID for this event */
    id: string;
    /** Event category */
    type: PresenceEventType;
    /** Zone where event occurred */
    zone: string;
    /** ISO timestamp of event */
    timestamp: string;
    /** Linked guest profile ID (if known) */
    guestId?: string;
    /** Device MAC (if from network event) */
    deviceMac?: string;
    /** Camera ID (if from Frigate event) */
    cameraId?: string;
    /** Arbitrary additional payload (Frigate object, HA state, etc.) */
    payload: Record<string, unknown>;
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export type ZoneAlertSensitivity = 'low' | 'medium' | 'high' | 'off';

export interface Zone {
    /** Unique zone identifier (e.g., 'perimeter', 'driveway', 'entry', 'interior') */
    id: string;
    /** Human display name */
    name: string;
    /** Camera IDs with coverage of this zone */
    cameraIds: string[];
    /** Geo-fence polygon as [lat, lng] pairs (for mobile presence) */
    polygon?: ReadonlyArray<readonly [number, number]>;
    /** Alert sensitivity — controls when events surface to dashboard */
    alertSensitivity: ZoneAlertSensitivity;
    /** Frigate zone label used in camera config (may differ from id) */
    frigateZoneLabel?: string;
}

// ─── Vehicle & License Plates ─────────────────────────────────────────────────

export interface PlateRead {
    /** Detected license plate text */
    plate: string;
    /** ISO timestamp of read */
    timestamp: string;
    /** Zone where read occurred */
    zone: string;
    /** Camera that captured the plate */
    cameraId: string;
    /** Detection confidence 0–1 */
    confidence: number;
    /** Linked guest profile (if plate was previously registered) */
    linkedGuestId?: string;
    /** Raw image clip path on NAS (optional) */
    clipPath?: string;
}

// ─── Bird / Wildlife Intelligence ────────────────────────────────────────────

export interface BirdSighting {
    /** ISO timestamp */
    timestamp: string;
    /** Camera that captured the sighting */
    cameraId: string;
    /** Gemini Vision identified species */
    species: string;
    /** Detection confidence 0–1 */
    confidence: number;
    /** Path to clip on NAS */
    clipPath?: string;
    /** Additional naturalist notes from Gemini Vision */
    notes?: string;
    /** Whether this object also triggered a security detection */
    securityFlag: boolean;
}

// ─── Anomaly & Intelligence ───────────────────────────────────────────────────

export type AnomalySeverity = 'info' | 'warning' | 'alert';

export interface AnomalyCard {
    /** UUID */
    id: string;
    /** Severity tier */
    severity: AnomalySeverity;
    /** Short headline */
    title: string;
    /** Full description */
    description: string;
    /** Device MAC or guest ID involved */
    subjectId: string;
    /** ISO timestamp of anomaly detection */
    detectedAt: string;
    /** Supporting evidence events */
    evidenceEventIds: string[];
    /** Whether user has acknowledged/dismissed this alert */
    acknowledged: boolean;
}

// ─── Garage State Machine ─────────────────────────────────────────────────────

export type GarageState = 'OPEN' | 'CLOSED' | 'TRANSITIONING' | 'UNKNOWN';

export interface GarageStatus {
    state: GarageState;
    lastAction: 'open' | 'close' | null;
    lastActionAt: string | null;
    requestedBy: string | null;
    reason: string | null;
}

// ─── Presence Snapshot (MCP tool return type) ─────────────────────────────────

export interface HomePresenceSnapshot {
    /** Known guests currently detected (arrived within last 4h, no departure) */
    knownGuests: GuestProfile[];
    /** Count of devices with no linked guest profile */
    unknownDeviceCount: number;
    /** Garage current state */
    garage: GarageStatus;
    /** Zone occupancy map */
    zoneOccupancy: Record<string, number>;
    /** ISO timestamp of snapshot */
    snapshotAt: string;
}
