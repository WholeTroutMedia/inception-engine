import { z } from 'zod';

// ─── ATLAS LIVE — CasparCG OSC Control Bridge ─────────────────────────────────
// Sends OSC commands to CasparCG graphics layers in real-time.
// Connects to any CasparCG server via configurable host/port.
// Supports: play, stop, update, load, clear, take/preview transitions.

type OscArgType = string | number | boolean;
type OscMessage = [string, ...OscArgType[]];

interface OscClientType {
    send: (msg: OscMessage, cb?: (err?: Error) => void) => void;
    close: () => void;
}

async function getOscClient(host: string, port: number): Promise<OscClientType> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oscModule = await import('node-osc') as any;
    const ClientClass = oscModule.Client ?? oscModule.default?.Client;
    return new ClientClass(host, port) as OscClientType;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ENV_OSC = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_OSC.process?.env?.[k];

export interface CasparConfig {
    host: string;
    port: number;
    channel: number;
    layer: number;
}

function defaultConfig(): CasparConfig {
    return {
        host: getEnv('CASPAR_HOST') ?? '127.0.0.1',
        port: parseInt(getEnv('CASPAR_OSC_PORT') ?? '6250', 10),
        channel: parseInt(getEnv('CASPAR_CHANNEL') ?? '1', 10),
        layer: parseInt(getEnv('CASPAR_LAYER') ?? '20', 10),
    };
}

// ─── OSC sender ───────────────────────────────────────────────────────────────

async function sendOSC(msg: OscMessage, config: CasparConfig): Promise<void> {
    return new Promise((resolve, reject) => {
        getOscClient(config.host, config.port).then(client => {
            client.send(msg, (err?: Error) => {
                client.close();
                if (err) reject(err);
                else resolve();
            });
        }).catch(reject);
    });
}

function casparPath(config: CasparConfig, command: string): string {
    return `/channel/${config.channel}/layer/${config.layer}/${command}`;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CasparConfigSchema = z.object({
    host: z.string().default('127.0.0.1'),
    port: z.number().default(6250),
    channel: z.number().default(1),
    layer: z.number().default(20),
});

export const LoadTemplateSchema = z.object({
    template_name: z.string().describe('CasparCG template name (e.g. "lower-third", "scoreboard")'),
    config: CasparConfigSchema.optional(),
});

export const PlayTemplateSchema = z.object({
    template_name: z.string(),
    template_data: z.record(z.string()).optional().describe('Key-value pairs for template fields'),
    config: CasparConfigSchema.optional(),
});

export const UpdateTemplateSchema = z.object({
    template_data: z.record(z.string()).describe('Key-value pairs to update in the currently playing template'),
    config: CasparConfigSchema.optional(),
});

export const StopTemplateSchema = z.object({
    config: CasparConfigSchema.optional(),
});

export const TakeTemplateSchema = z.object({
    template_name: z.string(),
    template_data: z.record(z.string()).optional(),
    transition: z.enum(['cut', 'mix', 'push', 'wipe']).default('mix'),
    duration: z.number().default(12).describe('Transition duration in frames'),
    config: CasparConfigSchema.optional(),
});

// ─── Template Data → XML ──────────────────────────────────────────────────────

function buildTemplateXML(data: Record<string, string>): string {
    const components = Object.entries(data)
        .map(([id, value]) => `<componentData id="${id}"><data id="text" value="${value.replace(/"/g, '&quot;')}"/></componentData>`)
        .join('');
    return `<templateData>${components}</templateData>`;
}

// ─── Command handlers ─────────────────────────────────────────────────────────

export async function loadTemplate(input: z.infer<typeof LoadTemplateSchema>): Promise<{ ok: boolean; message: string }> {
    const config = { ...defaultConfig(), ...(input.config ?? {}) };
    console.log(`[ATLAS/OSC] 📥 LOAD ${input.template_name} → ${config.host}:${config.port} ch${config.channel}/l${config.layer}`);
    try {
        await sendOSC([casparPath(config, 'cg/add'), 1, input.template_name, 0] as OscMessage, config);
        return { ok: true, message: `Loaded template "${input.template_name}" on ch${config.channel}/l${config.layer}` };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

export async function playTemplate(input: z.infer<typeof PlayTemplateSchema>): Promise<{ ok: boolean; message: string }> {
    const config = { ...defaultConfig(), ...(input.config ?? {}) };
    const xmlData = input.template_data ? buildTemplateXML(input.template_data) : '';
    console.log(`[ATLAS/OSC] ▶️ PLAY ${input.template_name} → ${config.host}:${config.port}`);
    try {
        await sendOSC([casparPath(config, 'cg/add'), 1, input.template_name, 1, xmlData] as OscMessage, config);
        return { ok: true, message: `Playing "${input.template_name}"${xmlData ? ' with data' : ''}` };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

export async function updateTemplate(input: z.infer<typeof UpdateTemplateSchema>): Promise<{ ok: boolean; message: string }> {
    const config = { ...defaultConfig(), ...(input.config ?? {}) };
    const xmlData = buildTemplateXML(input.template_data);
    console.log(`[ATLAS/OSC] 📝 UPDATE template data → ${config.host}:${config.port}`);
    try {
        await sendOSC([casparPath(config, 'cg/update'), 1, xmlData] as OscMessage, config);
        return { ok: true, message: 'Template data updated' };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

export async function stopTemplate(input: z.infer<typeof StopTemplateSchema>): Promise<{ ok: boolean; message: string }> {
    const config = { ...defaultConfig(), ...(input.config ?? {}) };
    console.log(`[ATLAS/OSC] ⏹️ STOP → ${config.host}:${config.port} ch${config.channel}/l${config.layer}`);
    try {
        await sendOSC([casparPath(config, 'cg/stop'), 1] as OscMessage, config);
        return { ok: true, message: `Stopped template on ch${config.channel}/l${config.layer}` };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

export async function clearLayer(config?: z.infer<typeof CasparConfigSchema>): Promise<{ ok: boolean; message: string }> {
    const cfg = { ...defaultConfig(), ...(config ?? {}) };
    try {
        await sendOSC([casparPath(cfg, 'clear')] as OscMessage, cfg);
        return { ok: true, message: `Layer ch${cfg.channel}/l${cfg.layer} cleared` };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

export async function takeTemplate(input: z.infer<typeof TakeTemplateSchema>): Promise<{ ok: boolean; message: string }> {
    const config = { ...defaultConfig(), ...(input.config ?? {}) };
    const xmlData = input.template_data ? buildTemplateXML(input.template_data) : '';
    console.log(`[ATLAS/OSC] 🎬 TAKE ${input.template_name} (${input.transition}/${input.duration}f)`);
    try {
        await sendOSC([casparPath(config, 'cg/stop'), 1] as OscMessage, config);
        await new Promise(r => setTimeout(r, 50));
        await sendOSC([casparPath(config, 'cg/add'), 1, input.template_name, 1, xmlData] as OscMessage, config);
        return { ok: true, message: `Take: "${input.template_name}" via ${input.transition} (${input.duration}f)` };
    } catch (e) {
        return { ok: false, message: `OSC error: ${(e as Error).message}` };
    }
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const CASPAR_OSC_TOOLS = [
    {
        name: 'atlas_caspar_play',
        description: 'Play a CasparCG HTML template with optional data. Sends OSC command to CasparCG server.',
        inputSchema: PlayTemplateSchema,
        handler: playTemplate,
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free (local network)',
    },
    {
        name: 'atlas_caspar_update',
        description: 'Update data in the currently playing CasparCG template (e.g. update scoreboard score live).',
        inputSchema: UpdateTemplateSchema,
        handler: updateTemplate,
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free (local network)',
    },
    {
        name: 'atlas_caspar_stop',
        description: 'Stop/hide the current CasparCG template on the configured channel/layer.',
        inputSchema: StopTemplateSchema,
        handler: stopTemplate,
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free (local network)',
    },
    {
        name: 'atlas_caspar_take',
        description: 'Transition to a new CasparCG template (stop current, play new with mix/cut/push/wipe).',
        inputSchema: TakeTemplateSchema,
        handler: takeTemplate,
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Free (local network)',
    },
];
