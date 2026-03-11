import { z } from 'zod';
import { EventEmitter } from 'events';

// ─── ATLAS LIVE — CasparCG Graphics Engine ────────────────────────────────────
// Controls a CasparCG server via AMCP protocol over TCP.
// ATLAS and CONTROL_ROOM's primary interface for live broadcast graphics.

const net = await import('net');

// ─── CasparCG AMCP Client ─────────────────────────────────────────────────────

export class CasparCGClient extends EventEmitter {
    private socket: ReturnType<typeof net.createConnection> | null = null;
    private host: string;
    private port: number;
    private connected: boolean = false;
    private buffer: string = '';

    constructor(host = process.env.CASPAR_HOST || 'localhost', port = 5250) {
        super();
        this.host = host;
        this.port = port;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection({ host: this.host, port: this.port });

            this.socket.on('connect', () => {
                this.connected = true;
                console.log(`[ATLAS LIVE] Connected to CasparCG at ${this.host}:${this.port}`);
                resolve();
            });

            this.socket.on('data', (data: Buffer) => {
                this.buffer += data.toString();
                this.processBuffer();
            });

            this.socket.on('error', (err: Error) => {
                console.error(`[ATLAS LIVE] CasparCG connection error: ${err.message}`);
                this.connected = false;
                reject(err);
            });

            this.socket.on('close', () => {
                this.connected = false;
                this.emit('disconnected');
            });
        });
    }

    private processBuffer(): void {
        const lines = this.buffer.split('\r\n');
        for (const line of lines.slice(0, -1)) {
            if (line.trim()) this.emit('response', line);
        }
        this.buffer = lines[lines.length - 1];
    }

    async sendCommand(command: string): Promise<string> {
        if (!this.connected || !this.socket) throw new Error('Not connected to CasparCG');

        return new Promise((resolve) => {
            const handler = (response: string) => {
                this.removeListener('response', handler);
                resolve(response);
            };
            this.on('response', handler);
            this.socket!.write(`${command}\r\n`);
        });
    }

    async disconnect(): Promise<void> {
        this.socket?.destroy();
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }
}

// ─── Graphics Commands ────────────────────────────────────────────────────────

export interface GraphicLayer {
    channel: number;  // CasparCG video channel (1-indexed)
    layer: number;    // Layer within channel
}

export class AtlasGraphicsEngine {
    private caspar: CasparCGClient;

    constructor(caspar?: CasparCGClient) {
        this.caspar = caspar ?? new CasparCGClient();
    }

    async connect(): Promise<void> {
        await this.caspar.connect();
    }

    // ── Template Commands ────────────────────────────────────────────────────

    async playTemplate(
        layer: GraphicLayer,
        templateName: string,
        data: Record<string, unknown>,
        autoPlay = true
    ): Promise<void> {
        const dataJson = JSON.stringify({ templateData: data });
        const dataB64 = Buffer.from(dataJson).toString('base64');
        const cmd = `CG ${layer.channel}-${layer.layer} ADD 1 "${templateName}" ${autoPlay ? 1 : 0} "${dataB64}"`;
        console.log(`[ATLAS LIVE] 🎬 Play template: ${templateName}`);
        await this.caspar.sendCommand(cmd);
    }

    async updateTemplate(layer: GraphicLayer, data: Record<string, unknown>): Promise<void> {
        const dataJson = JSON.stringify({ templateData: data });
        const dataB64 = Buffer.from(dataJson).toString('base64');
        const cmd = `CG ${layer.channel}-${layer.layer} UPDATE 1 "${dataB64}"`;
        await this.caspar.sendCommand(cmd);
    }

    async stopTemplate(layer: GraphicLayer, transitionFrames = 25): Promise<void> {
        await this.caspar.sendCommand(`CG ${layer.channel}-${layer.layer} STOP 1`);
        console.log(`[ATLAS LIVE] ⏹ Template stopped on ${layer.channel}-${layer.layer}`);
    }

    async clearLayer(layer: GraphicLayer): Promise<void> {
        await this.caspar.sendCommand(`CLEAR ${layer.channel}-${layer.layer}`);
    }

    // ── Video Commands ───────────────────────────────────────────────────────

    async playVideo(layer: GraphicLayer, clipName: string, loop = false): Promise<void> {
        const loopStr = loop ? ' LOOP' : '';
        await this.caspar.sendCommand(`PLAY ${layer.channel}-${layer.layer} "${clipName}"${loopStr}`);
        console.log(`[ATLAS LIVE] ▶️ Playing video: ${clipName}`);
    }

    async stopVideo(layer: GraphicLayer): Promise<void> {
        await this.caspar.sendCommand(`STOP ${layer.channel}-${layer.layer}`);
    }

    // ── Common Graphics Operations ───────────────────────────────────────────

    async showLowerThird(
        name: string,
        title: string,
        subtitle?: string,
        layer: GraphicLayer = { channel: 1, layer: 10 },
        durationMs = 8000
    ): Promise<void> {
        await this.playTemplate(layer, 'inception/lower-third', { name, title, subtitle: subtitle ?? '' });

        if (durationMs > 0) {
            setTimeout(() => this.stopTemplate(layer), durationMs);
        }
    }

    async showFullscreenSlate(
        headline: string,
        subtext?: string,
        backgroundStyle: 'dark' | 'brand' | 'white' = 'dark',
        layer: GraphicLayer = { channel: 1, layer: 20 }
    ): Promise<void> {
        await this.playTemplate(layer, 'inception/fullscreen-slate', {
            headline,
            subtext: subtext ?? '',
            style: backgroundStyle,
        });
    }

    async updateScoreboard(
        homeTeam: string, homeScore: number,
        awayTeam: string, awayScore: number,
        period: string,
        layer: GraphicLayer = { channel: 1, layer: 5 }
    ): Promise<void> {
        const data = { homeTeam, homeScore, awayTeam, awayScore, period };

        // Check if scoreboard is already up; update if so
        try {
            await this.updateTemplate(layer, data);
        } catch {
            await this.playTemplate(layer, 'inception/scoreboard', data, true);
        }
        console.log(`[ATLAS LIVE] 🏆 Scoreboard: ${homeTeam} ${homeScore} — ${awayTeam} ${awayScore} (${period})`);
    }

    async showSocialPost(
        platform: 'twitter' | 'instagram' | 'tiktok',
        username: string,
        content: string,
        avatarUrl?: string,
        layer: GraphicLayer = { channel: 1, layer: 15 },
        durationMs = 10000
    ): Promise<void> {
        await this.playTemplate(layer, 'inception/social-pull-quote', {
            platform,
            username,
            content: content.substring(0, 280),
            avatar_url: avatarUrl ?? '',
        });
        if (durationMs > 0) setTimeout(() => this.stopTemplate(layer), durationMs);
    }

    async showCountdown(
        targetTime: Date,
        label: string,
        layer: GraphicLayer = { channel: 1, layer: 8 }
    ): Promise<void> {
        const updateCountdown = async () => {
            const remaining = targetTime.getTime() - Date.now();
            if (remaining <= 0) {
                await this.stopTemplate(layer);
                return;
            }

            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            await this.updateTemplate(layer, { label, hours, minutes, seconds });
        };

        await this.playTemplate(layer, 'inception/countdown', { label, hours: 0, minutes: 0, seconds: 0 });
        const interval = setInterval(updateCountdown, 1000);

        targetTime.getTime() - Date.now() > 0
            ? setTimeout(() => clearInterval(interval), targetTime.getTime() - Date.now() + 1000)
            : clearInterval(interval);
    }
}

// ─── Mock Engine (for environments without CasparCG) ─────────────────────────

export class MockAtlasEngine extends AtlasGraphicsEngine {
    private log: Array<{ ts: string; action: string; data: unknown }> = [];

    async connect(): Promise<void> {
        console.log('[ATLAS LIVE] Running in MOCK mode — no CasparCG connection');
    }

    async playTemplate(layer: GraphicLayer, templateName: string, data: Record<string, unknown>): Promise<void> {
        const entry = { ts: new Date().toISOString(), action: `PLAY ${templateName}`, data };
        this.log.push(entry);
        console.log(`[ATLAS LIVE MOCK] ${entry.ts} → ${entry.action}`, JSON.stringify(data));
    }

    async stopTemplate(layer: GraphicLayer): Promise<void> {
        const entry = { ts: new Date().toISOString(), action: `STOP ${layer.channel}-${layer.layer}`, data: null };
        this.log.push(entry);
        console.log(`[ATLAS LIVE MOCK] ${entry.ts} → ${entry.action}`);
    }

    getLog() { return this.log; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAtlasEngine(mock = false): AtlasGraphicsEngine {
    return mock || !process.env.CASPAR_HOST
        ? new MockAtlasEngine()
        : new AtlasGraphicsEngine();
}
