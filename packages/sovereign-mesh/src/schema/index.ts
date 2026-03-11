import { z } from 'zod';

// ─── Sovereign Asset Registry (SAR) — Master Schema ───────────────────────────
// All entities in the mesh are typed here. Redis keys follow:
//   sar:{tier}:{category}:{id}
// Tiers: workstation | nas | gcp | mobile

// ── Tier identifiers ──────────────────────────────────────────────────────────
export const TierSchema = z.enum(['workstation', 'nas', 'gcp', 'mobile']);
export type Tier = z.infer<typeof TierSchema>;

// ── Base entity — every SAR record inherits this ──────────────────────────────
export const BaseEntitySchema = z.object({
  id: z.string(),
  tier: TierSchema,
  category: z.string(),
  label: z.string(),
  status: z.enum(['online', 'offline', 'degraded', 'unknown']),
  last_seen: z.string().datetime(),
  attention_score: z.number().min(0).max(100).default(0),
  metadata: z.record(z.unknown()).optional(),
});
export type BaseEntity = z.infer<typeof BaseEntitySchema>;

// ── Device entity (workstation peripherals, USB, HID) ─────────────────────────
export const DeviceEntitySchema = BaseEntitySchema.extend({
  category: z.literal('device'),
  device_class: z.string(),           // 'Keyboard', 'Mouse', 'Audio', 'USB', etc.
  vendor_id: z.string().optional(),
  product_id: z.string().optional(),
  friendly_name: z.string(),
  connection_type: z.enum(['USB', 'Bluetooth', 'PCIe', 'internal', 'virtual']),
  driver_status: z.enum(['OK', 'Unknown', 'Error', 'Not configured']),
  instance_id: z.string().optional(),
});
export type DeviceEntity = z.infer<typeof DeviceEntitySchema>;

// ── Storage entity ────────────────────────────────────────────────────────────
export const StorageEntitySchema = BaseEntitySchema.extend({
  category: z.literal('storage'),
  mount_point: z.string(),
  total_bytes: z.number(),
  free_bytes: z.number(),
  used_bytes: z.number(),
  filesystem: z.string().optional(),
  drive_type: z.enum(['SSD', 'HDD', 'NVMe', 'USB', 'Network', 'Virtual']),
});
export type StorageEntity = z.infer<typeof StorageEntitySchema>;

// ── Process entity ────────────────────────────────────────────────────────────
export const ProcessEntitySchema = BaseEntitySchema.extend({
  category: z.literal('process'),
  pid: z.number(),
  name: z.string(),
  cpu_percent: z.number(),
  memory_mb: z.number(),
  gpu_percent: z.number().optional(),
  command_line: z.string().optional(),
  uptime_seconds: z.number().optional(),
});
export type ProcessEntity = z.infer<typeof ProcessEntitySchema>;

// ── Display entity ────────────────────────────────────────────────────────────
export const DisplayEntitySchema = BaseEntitySchema.extend({
  category: z.literal('display'),
  manufacturer: z.string().optional(),
  model: z.string(),
  resolution_w: z.number(),
  resolution_h: z.number(),
  refresh_hz: z.number().optional(),
  connection_type: z.string().optional(),
  is_primary: z.boolean().default(false),
});
export type DisplayEntity = z.infer<typeof DisplayEntitySchema>;

// ── Docker container entity (NAS) ─────────────────────────────────────────────
export const ContainerEntitySchema = BaseEntitySchema.extend({
  category: z.literal('container'),
  container_id: z.string(),
  image: z.string(),
  ports: z.array(z.string()).default([]),
  restart_count: z.number().default(0),
  started_at: z.string().optional(),
  health: z.enum(['healthy', 'unhealthy', 'starting', 'none']).default('none'),
});
export type ContainerEntity = z.infer<typeof ContainerEntitySchema>;

// ── NAS volume entity ─────────────────────────────────────────────────────────
export const VolumeEntitySchema = BaseEntitySchema.extend({
  category: z.literal('volume'),
  share_name: z.string(),
  path: z.string(),
  total_bytes: z.number(),
  free_bytes: z.number(),
  file_count: z.number().optional(),
  last_write: z.string().optional(),
});
export type VolumeEntity = z.infer<typeof VolumeEntitySchema>;

// ── GCP service entity ────────────────────────────────────────────────────────
export const GCPServiceEntitySchema = BaseEntitySchema.extend({
  category: z.literal('gcp_service'),
  service_type: z.enum(['cloud_run', 'firebase', 'gcs_bucket', 'firestore', 'cloud_function', 'other']),
  region: z.string().optional(),
  url: z.string().optional(),
  project_id: z.string(),
  last_deploy: z.string().optional(),
  traffic_percent: z.number().optional(),
});
export type GCPServiceEntity = z.infer<typeof GCPServiceEntitySchema>;

// ── Union of all entity types ─────────────────────────────────────────────────
export type SAREntity =
  | DeviceEntity
  | StorageEntity
  | ProcessEntity
  | DisplayEntity
  | ContainerEntity
  | VolumeEntity
  | GCPServiceEntity;

// ── Mesh snapshot — complete picture at a moment in time ─────────────────────
export interface MeshSnapshot {
  captured_at: string;
  workstation: {
    devices: DeviceEntity[];
    storage: StorageEntity[];
    processes: ProcessEntity[];
    displays: DisplayEntity[];
    hostname: string;
    os: string;
    uptime_seconds: number;
  };
  nas: {
    containers: ContainerEntity[];
    volumes: VolumeEntity[];
    hostname: string;
    online: boolean;
  };
  gcp: {
    services: GCPServiceEntity[];
    project_id: string;
    online: boolean;
  };
  attention: AttentionBrief;
}

// ── Attention brief — what matters right now ──────────────────────────────────
export interface AttentionBrief {
  generated_at: string;
  top_entities: Array<{ entity: SAREntity; reason: string; score: number }>;
  anomalies: string[];
  digest: string;           // Human-readable AVERI boot panel block
  new_since_last_boot: string[];
}

// ── SAR Event ─────────────────────────────────────────────────────────────────
export const SAREventSchema = z.object({
  id: z.string(),
  tier: TierSchema,
  event_type: z.enum([
    'entity_added',
    'entity_removed',
    'entity_updated',
    'status_changed',
    'anomaly_detected',
    'boot',
    'shutdown',
  ]),
  entity_id: z.string().optional(),
  entity_category: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type SAREvent = z.infer<typeof SAREventSchema>;

// ── Redis key helpers ─────────────────────────────────────────────────────────
export const SAR_KEYS = {
  entity: (tier: Tier, category: string, id: string) => `sar:${tier}:${category}:${id}`,
  categoryIndex: (tier: Tier, category: string) => `sar:${tier}:${category}:_index`,
  eventStream: (tier: Tier) => `sar:events:${tier}`,
  snapshot: (tier: Tier) => `sar:snapshot:${tier}`,
  attentionBrief: () => 'sar:attention:brief',
  lastBoot: () => 'sar:meta:last_boot',
} as const;
