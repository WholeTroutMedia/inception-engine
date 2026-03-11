/**
 * SQLite Session Store — persistent cookies, localStorage, auth per domain.
 * Database: ~/.inception-browser/memory.db
 */

import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import { mkdirSync } from "node:fs";

const DB_DIR = path.join(os.homedir(), ".inception-browser");
const DB_PATH = path.join(DB_DIR, "memory.db");

export interface SessionRecord {
    id: number;
    name: string;
    domain: string;
    cookies_json: string;
    localstorage_json: string;
    created_at: string;
    updated_at: string;
}

export interface ActionRecord {
    id: number;
    session_name: string;
    type: string;
    selector: string | null;
    value: string | null;
    url: string;
    screenshot_path: string | null;
    timestamp: string;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (db) return db;
    mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);

    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL DEFAULT '',
      cookies_json TEXT NOT NULL DEFAULT '[]',
      localstorage_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_name TEXT NOT NULL DEFAULT 'default',
      type TEXT NOT NULL,
      selector TEXT,
      value TEXT,
      url TEXT NOT NULL DEFAULT '',
      screenshot_path TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS domain_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      policy TEXT NOT NULL CHECK(policy IN ('allow', 'block')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_id, domain)
    );
  `);

    return db;
}

// ─── Session CRUD ───────────────────────────────────────────────────────────

export function upsertSession(name: string, domain: string, cookies: unknown[], localStorage: Record<string, string>): void {
    const d = getDb();
    d.prepare(`
    INSERT INTO sessions (name, domain, cookies_json, localstorage_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      domain=excluded.domain,
      cookies_json=excluded.cookies_json,
      localstorage_json=excluded.localstorage_json,
      updated_at=datetime('now')
  `).run(name, domain, JSON.stringify(cookies), JSON.stringify(localStorage));
}

export function getSession(name: string): SessionRecord | null {
    return getDb().prepare("SELECT * FROM sessions WHERE name = ?").get(name) as SessionRecord | null;
}

export function listSessionRecords(): SessionRecord[] {
    return getDb().prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all() as SessionRecord[];
}

export function deleteSession(name: string): void {
    getDb().prepare("DELETE FROM sessions WHERE name = ?").run(name);
}

// ─── Action History ─────────────────────────────────────────────────────────

export function logAction(action: Omit<ActionRecord, "id" | "timestamp">): void {
    getDb().prepare(`
    INSERT INTO action_history (session_name, type, selector, value, url, screenshot_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        action.session_name,
        action.type,
        action.selector,
        action.value,
        action.url,
        action.screenshot_path
    );
}

export function queryHistory(filter?: { session?: string; type?: string; limit?: number }): ActionRecord[] {
    const limit = filter?.limit ?? 50;
    if (filter?.session && filter?.type) {
        return getDb().prepare("SELECT * FROM action_history WHERE session_name=? AND type=? ORDER BY timestamp DESC LIMIT ?")
            .all(filter.session, filter.type, limit) as ActionRecord[];
    }
    if (filter?.session) {
        return getDb().prepare("SELECT * FROM action_history WHERE session_name=? ORDER BY timestamp DESC LIMIT ?")
            .all(filter.session, limit) as ActionRecord[];
    }
    return getDb().prepare("SELECT * FROM action_history ORDER BY timestamp DESC LIMIT ?").all(limit) as ActionRecord[];
}

// ─── Domain Policies ────────────────────────────────────────────────────────

export function setDomainPolicy(agentId: string, domain: string, policy: "allow" | "block"): void {
    getDb().prepare(`
    INSERT INTO domain_policies (agent_id, domain, policy)
    VALUES (?, ?, ?)
    ON CONFLICT(agent_id, domain) DO UPDATE SET policy=excluded.policy
  `).run(agentId, domain, policy);
}

export function checkDomainPolicy(agentId: string, url: string): "allow" | "block" | "unset" {
    try {
        const domain = new URL(url).hostname;
        const row = getDb().prepare("SELECT policy FROM domain_policies WHERE agent_id=? AND domain=?")
            .get(agentId, domain) as { policy: string } | null;
        return (row?.policy as "allow" | "block") ?? "unset";
    } catch {
        return "unset";
    }
}
