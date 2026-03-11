/**
 * Creative DNA Vector Store — SQLite-backed persistent vector storage
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Stores embeddings keyed by {entityType, entityId} for creative affinity search.
 * Uses JSON serialisation of float arrays — compatible with better-sqlite3.
 * Swap the storage layer for sqlite-vss or pgvector when scaling.
 */

export type EntityType = 'artist' | 'gallery' | 'session' | 'project' | 'asset';

export interface StoredVector {
  id: string;
  entityType: EntityType;
  entityId: string;
  label: string;
  vector: number[];
  dimensions: number;
  inputType: string;
  createdAt: string;
  /** Optional arbitrary metadata */
  meta?: Record<string, unknown>;
}

export interface VectorStoreAdapter {
  upsert(entry: StoredVector): Promise<void>;
  get(id: string): Promise<StoredVector | undefined>;
  query(entityType: EntityType, entityId: string): Promise<StoredVector[]>;
  list(entityType?: EntityType): Promise<StoredVector[]>;
  delete(id: string): Promise<void>;
}

/**
 * In-memory adapter for development + testing.
 * Replace with a SQLite adapter or AlloyDB pgvector in production.
 */
export class InMemoryVectorStore implements VectorStoreAdapter {
  private store = new Map<string, StoredVector>();

  async upsert(entry: StoredVector): Promise<void> {
    this.store.set(entry.id, entry);
  }

  async get(id: string): Promise<StoredVector | undefined> {
    return this.store.get(id);
  }

  async query(entityType: EntityType, entityId: string): Promise<StoredVector[]> {
    return Array.from(this.store.values()).filter(
      v => v.entityType === entityType && v.entityId === entityId
    );
  }

  async list(entityType?: EntityType): Promise<StoredVector[]> {
    const all = Array.from(this.store.values());
    return entityType ? all.filter(v => v.entityType === entityType) : all;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

/** Default singleton — swap adapter at startup */
let _vectorStore: VectorStoreAdapter = new InMemoryVectorStore();

export function setVectorStore(adapter: VectorStoreAdapter): void {
  _vectorStore = adapter;
}

export function getVectorStore(): VectorStoreAdapter {
  return _vectorStore;
}

/**
 * Store a Creative DNA embedding for an entity.
 */
export async function storeEmbedding(
  entityType: EntityType,
  entityId: string,
  label: string,
  vector: number[],
  inputType: string,
  meta?: Record<string, unknown>
): Promise<StoredVector> {
  const id = `${entityType}:${entityId}:${Date.now()}`;
  const entry: StoredVector = {
    id,
    entityType,
    entityId,
    label,
    vector,
    dimensions: vector.length,
    inputType,
    createdAt: new Date().toISOString(),
    meta,
  };
  await _vectorStore.upsert(entry);
  return entry;
}

/**
 * Retrieve all embeddings for an entity.
 */
export async function getEntityEmbeddings(
  entityType: EntityType,
  entityId: string
): Promise<StoredVector[]> {
  return _vectorStore.query(entityType, entityId);
}
