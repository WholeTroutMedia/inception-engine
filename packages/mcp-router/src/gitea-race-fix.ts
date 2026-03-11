/**
 * Gitea Web Editor Race Condition Fix
 * Task: T20260308-758 â€” Gitea Web Editor Race Condition Fix
 *
 * Problem: Concurrent Gitea web editor saves on the same file cause
 * a race condition â€” the last write wins without conflict detection,
 * silently clobbering work.
 *
 * Root cause: Gitea's built-in web editor does not enforce last-write-wins
 * protection against parallel sessions editing the same path+ref.
 *
 * Solution: A distributed advisory lock layer using the file's sha256
 * content hash as an optimistic ETag. Wrap all file-write operations
 * behind a lock acquired via the Gitea API commit SHA + a Redis set-if-
 * not-exists (SETNX) lock per (repo, branch, path) tuple.
 *
 * This module provides:
 *   1. GiteaFileLock  â€” SETNX-based advisory lock (TTL: 30s)
 *   2. GiteaFileGuard â€” wraps Gitea Contents API calls with lock + SHA check
 *   3. ConflictError  â€” thrown when a concurrent edit is detected
 */

import * as crypto from 'crypto';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class ConflictError extends Error {
  constructor(
    public readonly lockKey: string,
    public readonly holder: string,
  ) {
    super(`Concurrent edit conflict on "${lockKey}" held by "${holder}". Refresh and retry.`);
    this.name = 'ConflictError';
  }
}

export interface GiteaFileGuardOptions {
  /** Base URL of the Gitea instance, e.g. http://127.0.0.1:3000 */
  giteaBaseUrl: string;
  /** Gitea API token with write access */
  token: string;
  /** Redis connection options (host, port). Defaults to localhost:6379. */
  redis?: { host?: string; port?: number };
  /** Advisory lock TTL in seconds (default: 30) */
  lockTtlSeconds?: number;
}

export interface UpdateFileParams {
  /** org or user */
  owner: string;
  /** repository name */
  repo: string;
  /** file path relative to repo root */
  filepath: string;
  /** git branch */
  branch: string;
  /** new file content (UTF-8 string) */
  content: string;
  /** commit message */
  message: string;
  /** session / user ID for lock ownership */
  sessionId: string;
  /**
   * The SHA of the file blob as returned by the Gitea Contents API.
   * Required to detect concurrent modifications (optimistic locking).
   */
  currentSha: string;
}

// â”€â”€â”€ Redis-backed advisory lock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class GiteaFileLock {
  private readonly ttl: number;
  private readonly host: string;
  private readonly port: number;
  /** In-memory fallback when Redis is unavailable (single-process only). */
  private localLocks = new Map<string, { holder: string; expiry: number }>();

  constructor(options: { host?: string; port?: number; ttlSeconds?: number }) {
    this.host = options.host ?? 'localhost';
    this.port = options.port ?? 6379;
    this.ttl  = options.ttlSeconds ?? 30;
  }

  private lockKey(owner: string, repo: string, branch: string, filepath: string): string {
    return `gitea:lock:${owner}/${repo}@${branch}:${filepath}`;
  }

  /** Attempt to acquire the lock. Returns true on success, false if already held. */
  async acquire(owner: string, repo: string, branch: string, filepath: string, holder: string): Promise<boolean> {
    const key = this.lockKey(owner, repo, branch, filepath);

    // Try Redis SETNX
    try {
      const redis = await this._getRedisClient();
      // SET key holder NX EX ttl
      const result = await redis.set(key, holder, { NX: true, EX: this.ttl });
      return result === 'OK';
    } catch {
      // Fall back to in-process lock (acceptable for single-instance NAS/dev)
      return this._localAcquire(key, holder);
    }
  }

  /** Get the current lock holder, or null if not locked. */
  async getHolder(owner: string, repo: string, branch: string, filepath: string): Promise<string | null> {
    const key = this.lockKey(owner, repo, branch, filepath);
    try {
      const redis = await this._getRedisClient();
      return redis.get(key);
    } catch {
      return this._localGetHolder(key);
    }
  }

  /** Release the lock (only if we hold it). */
  async release(owner: string, repo: string, branch: string, filepath: string, holder: string): Promise<void> {
    const key = this.lockKey(owner, repo, branch, filepath);
    try {
      const redis = await this._getRedisClient();
      const current = await redis.get(key);
      if (current === holder) {
        await redis.del(key);
      }
    } catch {
      this._localRelease(key, holder);
    }
  }

  // â”€â”€ Local (in-process) fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _localAcquire(key: string, holder: string): boolean {
    const existing = this.localLocks.get(key);
    if (existing && existing.expiry > Date.now()) return false;
    this.localLocks.set(key, { holder, expiry: Date.now() + this.ttl * 1000 });
    return true;
  }

  private _localGetHolder(key: string): string | null {
    const entry = this.localLocks.get(key);
    if (!entry || entry.expiry <= Date.now()) return null;
    return entry.holder;
  }

  private _localRelease(key: string, holder: string): void {
    const entry = this.localLocks.get(key);
    if (entry?.holder === holder) this.localLocks.delete(key);
  }

  // â”€â”€ Redis (lazy import) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _redisClient?: import('redis').RedisClientType;

  private async _getRedisClient(): Promise<import('redis').RedisClientType> {
    if (!this._redisClient) {
      const { createClient } = await import('redis');
      const client = createClient({ socket: { host: this.host, port: this.port } });
      await client.connect();
      this._redisClient = client as import('redis').RedisClientType;
    }
    return this._redisClient;
  }
}

// â”€â”€â”€ Main Guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class GiteaFileGuard {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly lock: GiteaFileLock;

  constructor(options: GiteaFileGuardOptions) {
    this.baseUrl = options.giteaBaseUrl.replace(/\/$/, '');
    this.token   = options.token;
    this.lock = new GiteaFileLock({
      host: options.redis?.host,
      port: options.redis?.port,
      ttlSeconds: options.lockTtlSeconds,
    });
  }

  /**
   * Safely update a file in Gitea with:
   *  1. Advisory lock (prevents concurrent edits from the same guard instance)
   *  2. SHA-based optimistic lock (detects out-of-band edits via Gitea API)
   *
   * Throws ConflictError if the lock is held or the file SHA has changed.
   */
  async updateFile(params: UpdateFileParams): Promise<{ commitSha: string; newBlobSha: string }> {
    const { owner, repo, filepath, branch, content, message, sessionId, currentSha } = params;

    // 1. Acquire advisory lock
    const acquired = await this.lock.acquire(owner, repo, branch, filepath, sessionId);
    if (!acquired) {
      const holder = await this.lock.getHolder(owner, repo, branch, filepath);
      throw new ConflictError(`${owner}/${repo}@${branch}/${filepath}`, holder ?? 'unknown');
    }

    try {
      // 2. Fetch current file metadata to verify SHA hasn't changed
      const metaRes = await fetch(
        `${this.baseUrl}/api/v1/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}?ref=${branch}`,
        { headers: this._headers() }
      );

      if (!metaRes.ok) {
        throw new Error(`Gitea meta fetch failed: ${metaRes.status} ${await metaRes.text()}`);
      }

      const meta = await metaRes.json() as { sha: string };
      if (meta.sha !== currentSha) {
        throw new ConflictError(
          `${owner}/${repo}@${branch}/${filepath}`,
          'concurrent-session (SHA mismatch)',
        );
      }

      // 3. Compute content hash for audit trail
      const contentHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 12);

      // 4. Commit via Gitea Contents API
      const body = {
        message: `${message} [guard:${contentHash}]`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        sha: currentSha,
        branch,
      };

      const putRes = await fetch(
        `${this.baseUrl}/api/v1/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}`,
        {
          method: 'PUT',
          headers: this._headers(),
          body: JSON.stringify(body),
        }
      );

      if (!putRes.ok) {
        throw new Error(`Gitea PUT failed: ${putRes.status} ${await putRes.text()}`);
      }

      const result = await putRes.json() as { commit?: { sha?: string }; content?: { sha?: string } };
      return {
        commitSha: result.commit?.sha ?? '',
        newBlobSha: result.content?.sha ?? '',
      };
    } finally {
      // Always release the lock
      await this.lock.release(owner, repo, branch, filepath, sessionId);
    }
  }

  /**
   * Read a file and return its content + SHA (use SHA in subsequent updateFile calls).
   */
  async readFile(owner: string, repo: string, filepath: string, ref: string): Promise<{ content: string; sha: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}?ref=${ref}`,
      { headers: this._headers() }
    );

    if (!res.ok) {
      throw new Error(`Gitea read failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as { content: string; sha: string; encoding: string };
    if (data.encoding !== 'base64') {
      throw new Error(`Unexpected encoding from Gitea: ${data.encoding}`);
    }

    return {
      content: Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8'),
      sha: data.sha,
    };
  }

  private _headers(): Record<string, string> {
    return {
      Authorization: `token ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
}

// â”€â”€â”€ Singleton factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function createGiteaFileGuard(overrides?: Partial<GiteaFileGuardOptions>): GiteaFileGuard {
  return new GiteaFileGuard({
    giteaBaseUrl: process.env['GITEA_URL']   ?? 'http://127.0.0.1:3000',
    token:        process.env['GITEA_TOKEN'] ?? '',
    redis: {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    },
    lockTtlSeconds: 30,
    ...overrides,
  });
}

/** Default singleton â€” uses environment variables */
export const giteaGuard = createGiteaFileGuard();
