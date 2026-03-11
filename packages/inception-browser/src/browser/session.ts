/**
 * SessionManager — Persistent browser session management backed by SQLite.
 * Saves/restores cookies and localStorage per named session.
 * Action history is logged to the same DB for VERA replay.
 * T20260306-186
 */

import type { BrowserContext } from "playwright";
import {
    upsertSession,
    getSession,
    listSessionRecords,
    deleteSession as dbDeleteSession,
    logAction,
    queryHistory,
    type ActionRecord,
} from "../memory/session-store.js";

export interface SessionData {
    name: string;
    cookies: unknown[];
    origins: Array<{
        origin: string;
        localStorage: Array<{ name: string; value: string }>;
    }>;
    savedAt: string;
}

export class SessionManager {
    constructor() { }

    /** Save current context state to SQLite under a given name. */
    async saveSession(name: string, context: BrowserContext): Promise<void> {
        const state = await context.storageState();
        const localStorage = Object.fromEntries(
            state.origins.flatMap(o =>
                o.localStorage.map(item => [item.name, item.value])
            )
        );
        const domain = state.origins[0]?.origin ?? "";
        upsertSession(name, domain, state.cookies, localStorage);
    }

    /** Restore a named session into the given context from SQLite. */
    async restoreSession(name: string, context: BrowserContext): Promise<SessionData> {
        const record = getSession(name);
        if (!record) throw new Error(`Session "${name}" not found`);

        const cookies = JSON.parse(record.cookies_json) as unknown[];
        const lsEntries = Object.entries(
            JSON.parse(record.localstorage_json) as Record<string, string>
        );

        await context.addCookies(cookies as Parameters<BrowserContext["addCookies"]>[0]);

        if (lsEntries.length > 0 && record.domain) {
            await context.addInitScript(
                ({ origin, items }: { origin: string; items: [string, string][] }) => {
                    if (window.location.origin === origin) {
                        for (const [key, value] of items) {
                            localStorage.setItem(key, value);
                        }
                    }
                },
                { origin: record.domain, items: lsEntries }
            );
        }

        return {
            name: record.name,
            cookies,
            origins: [{
                origin: record.domain,
                localStorage: lsEntries.map(([n, v]) => ({ name: n, value: v })),
            }],
            savedAt: record.updated_at,
        };
    }

    /** List all saved sessions from SQLite. */
    listSessions(): Array<{ name: string; domain: string; savedAt: string }> {
        return listSessionRecords().map(r => ({
            name: r.name,
            domain: r.domain,
            savedAt: r.updated_at,
        }));
    }

    /** Delete a named session from SQLite. */
    deleteSession(name: string): void {
        dbDeleteSession(name);
    }

    /** Log a browser action to SQLite action_history. */
    logAction(action: Omit<ActionRecord, "id" | "timestamp">): void {
        logAction(action);
    }

    /** Get paginated action history from SQLite. */
    getActionHistory(limit = 50, session?: string): ActionRecord[] {
        return queryHistory({ limit, session });
    }
}
