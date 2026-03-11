/**
 * Session Recorder — records browser actions as replayable scripts.
 * Listens to Playwright page events and serialises to JSON action sequence.
 */

import type { Page } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const RECORDING_DIR = path.join(os.homedir(), ".inception-browser", "recordings");

export interface RecordedAction {
    type: "navigate" | "click" | "type" | "fill" | "select" | "scroll" | "evaluate" | "wait";
    args: Record<string, unknown>;
    timestamp: string;
    url: string;
}

export interface Recording {
    name: string;
    startUrl: string;
    actions: RecordedAction[];
    recordedAt: string;
    duration_ms: number;
}

export class SessionRecorder {
    private actions: RecordedAction[] = [];
    private startTime = Date.now();
    private startUrl = "";
    private isRecording = false;

    private navigationHandler?: (url: URL) => void;

    /** Start recording on a page. */
    async start(page: Page): Promise<void> {
        this.actions = [];
        this.startTime = Date.now();
        this.startUrl = page.url();
        this.isRecording = true;

        this.navigationHandler = (url: URL) => {
            this.record(page, "navigate", { url: url.toString() });
        };

        page.on("framenavigated", (frame) => {
            if (frame === page.mainFrame() && this.isRecording) {
                this.record(page, "navigate", { url: frame.url() });
            }
        });
    }

    /** Record a manual action. */
    record(page: Page, type: RecordedAction["type"], args: Record<string, unknown>): void {
        if (!this.isRecording) return;
        this.actions.push({
            type,
            args,
            timestamp: new Date().toISOString(),
            url: page.url(),
        });
    }

    /** Stop recording and save to file. */
    async stop(name: string): Promise<string> {
        this.isRecording = false;
        await fs.mkdir(RECORDING_DIR, { recursive: true });

        const recording: Recording = {
            name,
            startUrl: this.startUrl,
            actions: this.actions,
            recordedAt: new Date().toISOString(),
            duration_ms: Date.now() - this.startTime,
        };

        const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filePath = path.join(RECORDING_DIR, `${safe}.json`);
        await fs.writeFile(filePath, JSON.stringify(recording, null, 2), "utf-8");
        return filePath;
    }

    /** Load and return a saved recording for replay. */
    static async load(name: string): Promise<Recording> {
        const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filePath = path.join(RECORDING_DIR, `${safe}.json`);
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw) as Recording;
    }

    /** List saved recordings. */
    static async list(): Promise<Array<{ name: string; recordedAt: string; actionCount: number }>> {
        try {
            const files = await fs.readdir(RECORDING_DIR);
            const results = [];
            for (const f of files.filter(f => f.endsWith(".json"))) {
                try {
                    const raw = await fs.readFile(path.join(RECORDING_DIR, f), "utf-8");
                    const r = JSON.parse(raw) as Recording;
                    results.push({ name: r.name, recordedAt: r.recordedAt, actionCount: r.actions.length });
                } catch { /* skip */ }
            }
            return results;
        } catch { return []; }
    }

    isActive(): boolean { return this.isRecording; }
    getActions(): RecordedAction[] { return [...this.actions]; }
}
