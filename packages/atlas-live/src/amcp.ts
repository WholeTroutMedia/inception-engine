import { z } from 'zod';

// ─── ATLAS LIVE — Direct AMCP Protocol (Advanced CasparCG Control) ────────────
// Low-level CasparCG AMCP command builder and sender. Provides complete
// access to all AMCP commands for advanced broadcast automation.

import net from 'net';

const ENV_AMCP = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_AMCP.process?.env?.[k];

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const AmcpConfigSchema = z.object({
    host: z.string().default(() => getEnv('CASPAR_HOST') ?? '127.0.0.1'),
    port: z.number().default(5250),
    timeout_ms: z.number().default(5000),
});

export const LoadMediaSchema = z.object({
    channel: z.number().default(1),
    layer: z.number().default(10),
    clip: z.string().describe('Clip name or path relative to CasparCG media folder'),
    loop: z.boolean().default(false),
    auto: z.boolean().default(false).describe('Auto-play when loaded'),
    seek: z.number().optional().describe('Start frame offset'),
    in_point: z.number().optional(),
    out_point: z.number().optional(),
    transition: z.object({ type: z.enum(['CUT', 'MIX', 'PUSH', 'WIPE', 'SLIDE']).default('CUT'), duration: z.number().default(0) }).optional(),
    caspar: AmcpConfigSchema.optional(),
});

export const PlayClipSchema = z.object({
    channel: z.number().default(1),
    layer: z.number().default(10),
    clip: z.string(),
    loop: z.boolean().default(false),
    caspar: AmcpConfigSchema.optional(),
});

export const CgCommandSchema = z.object({
    channel: z.number().default(1),
    layer: z.number().default(20),
    command: z.enum(['ADD', 'PLAY', 'STOP', 'NEXT', 'UPDATE', 'INVOKE', 'REMOVE', 'CLEAR', 'INFO']),
    cg_layer: z.number().default(1),
    template: z.string().optional(),
    play_on_load: z.boolean().default(true),
    data: z.string().optional().describe('XML or JSON data string for template'),
    function_name: z.string().optional().describe('For INVOKE command'),
    caspar: AmcpConfigSchema.optional(),
});

export const MixerCommandSchema = z.object({
    channel: z.number().default(1),
    layer: z.number().default(10),
    command: z.enum(['OPACITY', 'BRIGHTNESS', 'SATURATION', 'CONTRAST', 'FILL', 'CLIP', 'ANCHOR', 'ROTATION', 'BLEND', 'CHROMA', 'KEYER', 'LEVELS', 'VOLUME', 'MASTERVOLUME', 'CLEAR']),
    params: z.array(z.union([z.number(), z.string()])),
    transition_duration: z.number().default(0).describe('Frames for the transition'),
    caspar: AmcpConfigSchema.optional(),
});

export const InfoSchema = z.object({
    target: z.enum(['server', 'channel', 'layer', 'queues', 'paths', 'system', 'template']).default('server'),
    channel: z.number().optional(),
    layer: z.number().optional(),
    caspar: AmcpConfigSchema.optional(),
});

// ─── AMCP TCP client ──────────────────────────────────────────────────────────

export async function sendAmcp(command: string, cfg: z.infer<typeof AmcpConfigSchema>): Promise<string> {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let response = '';

        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error(`AMCP timeout after ${cfg.timeout_ms}ms`));
        }, cfg.timeout_ms);

        client.connect(cfg.port, cfg.host, () => {
            client.write(command + '\r\n');
        });

        client.on('data', (data: Buffer) => {
            response += data.toString('utf-8');
            // AMCP responses end with \r\n on single-line, or specific patterns for multi-line
            if (response.match(/^\d{3}[^\r]*/m)) {
                clearTimeout(timeout);
                client.destroy();
                resolve(response.trim());
            }
        });

        client.on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

// ─── AMCP command builders ────────────────────────────────────────────────────

export function buildPlayCommand(clip: string, channel: number, layer: number, loop: boolean, transition?: { type: string; duration: number }): string {
    let cmd = `PLAY ${channel}-${layer} "${clip}"`;
    if (loop) cmd += ' LOOP';
    if (transition && transition.duration > 0) cmd += ` ${transition.type} ${transition.duration}`;
    return cmd;
}

export function buildLoadCommand(input: z.infer<typeof LoadMediaSchema>): string {
    let cmd = `LOAD ${input.channel}-${input.layer} "${input.clip}"`;
    if (input.loop) cmd += ' LOOP';
    if (input.auto) cmd += ' AUTO';
    if (input.seek !== undefined) cmd += ` SEEK ${input.seek}`;
    if (input.in_point !== undefined) cmd += ` IN ${input.in_point}`;
    if (input.out_point !== undefined) cmd += ` OUT ${input.out_point}`;
    if (input.transition && input.transition.duration > 0) cmd += ` ${input.transition.type} ${input.transition.duration}`;
    return cmd;
}

export function buildCgCommand(input: z.infer<typeof CgCommandSchema>): string {
    const prefix = `CG ${input.channel}-${input.layer} ${input.command} ${input.cg_layer}`;
    switch (input.command) {
        case 'ADD':
            return `${prefix} "${input.template ?? ''}" ${input.play_on_load ? 1 : 0}${input.data ? ` "${input.data.replace(/"/g, '\\"')}"` : ''}`;
        case 'UPDATE':
            return `${prefix} "${input.data?.replace(/"/g, '\\"') ?? ''}"`;
        case 'INVOKE':
            return `${prefix} "${input.function_name ?? ''}"`;
        default:
            return prefix;
    }
}

export function buildMixerCommand(input: z.infer<typeof MixerCommandSchema>): string {
    const params = input.params.join(' ');
    let cmd = `MIXER ${input.channel}-${input.layer} ${input.command} ${params}`;
    if (input.transition_duration > 0) cmd += ` ${input.transition_duration}`;
    return cmd;
}

// ─── High-level actions ───────────────────────────────────────────────────────

export async function playClip(input: z.infer<typeof PlayClipSchema>) {
    const v = PlayClipSchema.parse(input);
    const cfg = v.caspar ?? AmcpConfigSchema.parse({});
    const cmd = buildPlayCommand(v.clip, v.channel, v.layer, v.loop);
    const response = await sendAmcp(cmd, cfg);
    return { command: cmd, response, channel: v.channel, layer: v.layer };
}

export async function stopLayer(channel: number, layer: number, cfg?: z.infer<typeof AmcpConfigSchema>) {
    const c = cfg ?? AmcpConfigSchema.parse({});
    const cmd = `STOP ${channel}-${layer}`;
    const response = await sendAmcp(cmd, c);
    return { command: cmd, response };
}

export async function clearLayer(channel: number, layer: number, cfg?: z.infer<typeof AmcpConfigSchema>) {
    const c = cfg ?? AmcpConfigSchema.parse({});
    const cmd = `CLEAR ${channel}-${layer}`;
    const response = await sendAmcp(cmd, c);
    return { command: cmd, response };
}

export async function executeCgCommand(input: z.infer<typeof CgCommandSchema>) {
    const v = CgCommandSchema.parse(input);
    const cfg = v.caspar ?? AmcpConfigSchema.parse({});
    const cmd = buildCgCommand(v);
    const response = await sendAmcp(cmd, cfg);
    return { command: cmd, response };
}

export async function executeMixerCommand(input: z.infer<typeof MixerCommandSchema>) {
    const v = MixerCommandSchema.parse(input);
    const cfg = v.caspar ?? AmcpConfigSchema.parse({});
    const cmd = buildMixerCommand(v);
    const response = await sendAmcp(cmd, cfg);
    return { command: cmd, response };
}

export async function getServerInfo(input: z.infer<typeof InfoSchema>) {
    const v = InfoSchema.parse(input);
    const cfg = v.caspar ?? AmcpConfigSchema.parse({});
    let cmd = 'INFO';
    if (v.target === 'channel' && v.channel) cmd = `INFO ${v.channel}`;
    if (v.target === 'layer' && v.channel && v.layer) cmd = `INFO ${v.channel}-${v.layer}`;
    if (v.target !== 'server' && v.target !== 'channel' && v.target !== 'layer') cmd = `INFO ${v.target.toUpperCase()}`;
    const response = await sendAmcp(cmd, cfg);
    return { command: cmd, response };
}

// ─── MCP Tools ────────────────────────────────────────────────────────────────

export const AMCP_TOOLS = [
    { name: 'atlas_amcp_play', description: 'Play a media clip on a CasparCG channel/layer via AMCP.', inputSchema: PlayClipSchema, handler: playClip, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_stop', description: 'Stop a CasparCG channel/layer.', inputSchema: z.object({ channel: z.number().default(1), layer: z.number().default(10), caspar: AmcpConfigSchema.optional() }), handler: ({ channel, layer, caspar }: { channel: number; layer: number; caspar?: z.infer<typeof AmcpConfigSchema> }) => stopLayer(channel, layer, caspar), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_clear', description: 'Clear a CasparCG layer.', inputSchema: z.object({ channel: z.number().default(1), layer: z.number().default(10), caspar: AmcpConfigSchema.optional() }), handler: ({ channel, layer, caspar }: { channel: number; layer: number; caspar?: z.infer<typeof AmcpConfigSchema> }) => clearLayer(channel, layer, caspar), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_cg', description: 'Execute a CasparCG CG template command (ADD/PLAY/STOP/UPDATE/INVOKE/REMOVE/CLEAR).', inputSchema: CgCommandSchema, handler: executeCgCommand, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_mixer', description: 'Execute a CasparCG MIXER command (opacity, fill, rotation, chroma key, etc).', inputSchema: MixerCommandSchema, handler: executeMixerCommand, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_send', description: 'Send a raw AMCP command string to CasparCG and return the response.', inputSchema: z.object({ command: z.string(), caspar: AmcpConfigSchema.optional() }), handler: ({ command, caspar }: { command: string; caspar?: z.infer<typeof AmcpConfigSchema> }) => sendAmcp(command, caspar ?? AmcpConfigSchema.parse({})), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_amcp_info', description: 'Query CasparCG server, channel, or layer info via AMCP INFO command.', inputSchema: InfoSchema, handler: getServerInfo, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
];
