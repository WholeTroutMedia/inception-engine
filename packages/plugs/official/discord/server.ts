import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Discord Bot Adapter ──────────────────────────────────────────
// Sends messages, embeds, and file attachments to Discord channels via
// the Discord REST API. Supports webhooks and bot token auth.

const DISCORD_BASE = 'https://discord.com/api/v10';
const ENV_DC = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_DC.process?.env?.[k];

function dcHeaders() {
    const token = getEnv('DISCORD_BOT_TOKEN');
    if (!token) throw new Error('DISCORD_BOT_TOKEN not configured');
    return { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DiscordEmbedSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    color: z.number().optional().describe('Decimal color integer, e.g. 0xb87333 = 12087091'),
    timestamp: z.string().optional().describe('ISO 8601 timestamp'),
    footer: z.object({ text: z.string(), icon_url: z.string().optional() }).optional(),
    image: z.object({ url: z.string() }).optional(),
    thumbnail: z.object({ url: z.string() }).optional(),
    author: z.object({ name: z.string(); url: z.string().optional(); icon_url: z.string().optional() }).optional(),
    fields: z.array(z.object({ name: z.string(); value: z.string(); inline: z.boolean().default(false) })).max(25).optional(),
});

export const SendMessageSchema = z.object({
    channel_id: z.string(),
    content: z.string().optional().describe('Plain text message content'),
    embeds: z.array(DiscordEmbedSchema).max(10).optional(),
    tts: z.boolean().default(false),
    suppress_embeds: z.boolean().default(false),
    reply_to_message_id: z.string().optional(),
});

export const WebhookMessageSchema = z.object({
    webhook_url: z.string().url().describe('Full Discord webhook URL'),
    content: z.string().optional(),
    username: z.string().optional().describe('Override the webhook display name'),
    avatar_url: z.string().optional(),
    embeds: z.array(DiscordEmbedSchema).max(10).optional(),
});

export const GetChannelSchema = z.object({ channel_id: z.string() });

export const GetGuildSchema = z.object({ guild_id: z.string() });

export const ListChannelsSchema = z.object({ guild_id: z.string() });

export const CreateThreadSchema = z.object({
    channel_id: z.string(),
    name: z.string().max(100),
    auto_archive_duration: z.number().refine(n => [60, 1440, 4320, 10080].includes(n), { message: 'Must be 60, 1440, 4320, or 10080 minutes' }).default(1440),
    message: z.object({ content: z.string() }).optional(),
});

export const AlertEmbedSchema = z.object({
    channel_id: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'info']),
    title: z.string(),
    message: z.string(),
    fields: z.array(z.object({ name: z.string(); value: z.string(); inline: z.boolean().default(true) })).optional(),
    source: z.string().optional().describe('Which system triggered the alert'),
});

// ─── Color constants ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, number> = {
    critical: 0xdc3545, high: 0xfd7e14, medium: 0xffc107, info: 0x0dcaf0,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

interface DiscordMessage { id: string; channel_id: string; content?: string }

export async function sendMessage(input: z.infer<typeof SendMessageSchema>) {
    const v = SendMessageSchema.parse(input);
    const payload: Record<string, unknown> = { tts: v.tts };
    if (v.content) payload.content = v.content;
    if (v.embeds?.length) payload.embeds = v.embeds;
    if (v.suppress_embeds) payload.flags = 4;
    if (v.reply_to_message_id) payload.message_reference = { message_id: v.reply_to_message_id };

    const res = await axios.post<DiscordMessage>(`${DISCORD_BASE}/channels/${v.channel_id}/messages`, payload, { headers: dcHeaders() });
    return { message_id: res.data.id, channel_id: res.data.channel_id };
}

export async function sendWebhook(input: z.infer<typeof WebhookMessageSchema>) {
    const v = WebhookMessageSchema.parse(input);
    const payload: Record<string, unknown> = {};
    if (v.content) payload.content = v.content;
    if (v.username) payload.username = v.username;
    if (v.avatar_url) payload.avatar_url = v.avatar_url;
    if (v.embeds?.length) payload.embeds = v.embeds;

    const res = await axios.post<{ id?: string }>(v.webhook_url, payload);
    return { success: true, message_id: res.data?.id };
}

export async function sendAlert(input: z.infer<typeof AlertEmbedSchema>) {
    const v = AlertEmbedSchema.parse(input);
    const icons: Record<string, string> = { critical: '🚨', high: '⚠️', medium: '🔔', info: 'ℹ️' };

    return sendMessage({
        channel_id: v.channel_id,
        tts: false,
        suppress_embeds: false,
        embeds: [{
            title: `${icons[v.severity]} ${v.title}`,
            description: v.message,
            color: SEVERITY_COLORS[v.severity],
            timestamp: new Date().toISOString(),
            footer: v.source ? { text: `Source: ${v.source}` } : undefined,
            fields: v.fields,
        }],
    });
}

export async function getChannel(input: z.infer<typeof GetChannelSchema>) {
    const res = await axios.get<{ id: string; name: string; type: number; guild_id?: string; topic?: string }>(
        `${DISCORD_BASE}/channels/${input.channel_id}`, { headers: dcHeaders() }
    );
    return { id: res.data.id, name: res.data.name, type: res.data.type, guild_id: res.data.guild_id, topic: res.data.topic };
}

export async function listChannels(input: z.infer<typeof ListChannelsSchema>) {
    const res = await axios.get<Array<{ id: string; name: string; type: number; position: number }>>(
        `${DISCORD_BASE}/guilds/${input.guild_id}/channels`, { headers: dcHeaders() }
    );
    return { channels: res.data.sort((a, b) => a.position - b.position).map(c => ({ id: c.id, name: c.name, type: c.type })) };
}

export async function createThread(input: z.infer<typeof CreateThreadSchema>) {
    const v = CreateThreadSchema.parse(input);
    const payload: Record<string, unknown> = { name: v.name, auto_archive_duration: v.auto_archive_duration };
    if (v.message) payload.message = v.message;

    const res = await axios.post<{ id: string; name: string }>(
        `${DISCORD_BASE}/channels/${v.channel_id}/threads`, payload, { headers: dcHeaders() }
    );
    return { thread_id: res.data.id, name: res.data.name };
}

// ─── MCP Tools ────────────────────────────────────────────────────────────────

export const DISCORD_TOOLS = [
    { name: 'discord_send_message', description: 'Send a text message or rich embed to a Discord channel.', inputSchema: SendMessageSchema, handler: sendMessage, agentPermissions: ['GHOST', 'RELAY', 'ORACLE'], estimatedCost: 'Free' },
    { name: 'discord_send_webhook', description: 'Post a message to a Discord channel via webhook URL.', inputSchema: WebhookMessageSchema, handler: sendWebhook, agentPermissions: ['GHOST', 'RELAY', 'ORACLE', 'ZERO_DAY'], estimatedCost: 'Free' },
    { name: 'discord_send_alert', description: 'Send a severity-coloured alert embed to a Discord channel (critical/high/medium/info).', inputSchema: AlertEmbedSchema, handler: sendAlert, agentPermissions: ['GHOST', 'SENTINEL', 'RELAY'], estimatedCost: 'Free' },
    { name: 'discord_get_channel', description: 'Get metadata about a Discord channel.', inputSchema: GetChannelSchema, handler: getChannel, agentPermissions: ['ORACLE', 'RELAY'], estimatedCost: 'Free' },
    { name: 'discord_list_channels', description: 'List all channels in a Discord server.', inputSchema: ListChannelsSchema, handler: listChannels, agentPermissions: ['ORACLE', 'RELAY'], estimatedCost: 'Free' },
    { name: 'discord_create_thread', description: 'Create a thread in a Discord channel, optionally with an initial message.', inputSchema: CreateThreadSchema, handler: createThread, agentPermissions: ['ORACLE', 'RELAY'], estimatedCost: 'Free' },
];
