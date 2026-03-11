import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — Slack MCP Adapter ────────────────────────────────────────────
// Connects Creative Liberation Engine agents to Slack for alerts, notifications,
// project status updates, and team communication.

const SLACK_BASE = 'https://slack.com/api';

const ENV = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function getEnv(key: string): string | undefined {
    return ENV.process?.env?.[key];
}

function slackHeaders() {
    const token = getEnv('SLACK_BOT_TOKEN');
    if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const SlackMessageSchema = z.object({
    channel: z.string().describe('Channel ID or name (e.g. #general or C012AB3CD)'),
    text: z.string().describe('Message text (fallback for blocks)'),
    blocks: z.array(z.record(z.unknown())).optional().describe('Slack Block Kit blocks'),
    thread_ts: z.string().optional().describe('Thread timestamp to reply in a thread'),
    unfurl_links: z.boolean().default(false),
});

export const SlackRichAlertSchema = z.object({
    channel: z.string(),
    title: z.string(),
    body: z.string(),
    type: z.enum(['success', 'warning', 'error', 'info']).default('info'),
    cta_text: z.string().optional(),
    cta_url: z.string().url().optional(),
    fields: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export const SlackProjectUpdateSchema = z.object({
    channel: z.string(),
    project_name: z.string(),
    status: z.enum(['kicked_off', 'on_track', 'at_risk', 'delayed', 'complete', 'blocked']),
    details: z.string(),
    client: z.string().optional(),
    portal_url: z.string().url().optional(),
});

export const SlackChannelListSchema = z.object({
    types: z.enum(['public_channel', 'private_channel', 'mpim', 'im']).default('public_channel'),
    limit: z.number().min(1).max(200).default(50),
});

// ─── Slack Block Kit Builders ─────────────────────────────────────────────────

const STATUS_COLORS = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#b87333',
};

const STATUS_ICONS = { success: '✅', warning: '⚠️', error: '🔴', info: '💡' };

function buildRichAlertBlocks(input: z.infer<typeof SlackRichAlertSchema>): Record<string, unknown>[] {
    const icon = STATUS_ICONS[input.type];
    const blocks: Record<string, unknown>[] = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${icon} ${input.title}`, emoji: true },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: input.body },
        },
    ];

    if (input.fields?.length) {
        blocks.push({
            type: 'section',
            fields: input.fields.map(f => ({
                type: 'mrkdwn',
                text: `*${f.label}*\n${f.value}`,
            })),
        });
    }

    if (input.cta_text && input.cta_url) {
        blocks.push({
            type: 'actions',
            elements: [{
                type: 'button',
                text: { type: 'plain_text', text: input.cta_text },
                url: input.cta_url,
                style: input.type === 'success' ? 'primary' : input.type === 'error' ? 'danger' : undefined,
            }],
        });
    }

    blocks.push({ type: 'divider' });
    return blocks;
}

function buildProjectUpdateBlocks(input: z.infer<typeof SlackProjectUpdateSchema>): Record<string, unknown>[] {
    const statusMap = {
        kicked_off: { icon: '🚀', color: '#b87333', label: 'KICKED OFF' },
        on_track: { icon: '✅', color: '#22c55e', label: 'ON TRACK' },
        at_risk: { icon: '⚠️', color: '#f59e0b', label: 'AT RISK' },
        delayed: { icon: '🔶', color: '#f97316', label: 'DELAYED' },
        complete: { icon: '🎉', color: '#22c55e', label: 'COMPLETE' },
        blocked: { icon: '🔴', color: '#ef4444', label: 'BLOCKED' },
    };
    const s = statusMap[input.status];

    const blocks: Record<string, unknown>[] = [
        {
            type: 'section',
            text: { type: 'mrkdwn', text: `${s.icon} *Project Update: ${input.project_name}*` },
            accessory: {
                type: 'button',
                text: { type: 'plain_text', text: `${s.label}` },
                style: input.status === 'complete' ? 'primary' : undefined,
            },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: input.details },
        },
    ];

    if (input.client) {
        blocks.push({
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `Client: *${input.client}*` }],
        });
    }

    if (input.portal_url) {
        blocks.push({
            type: 'actions',
            elements: [{
                type: 'button',
                text: { type: 'plain_text', text: 'View Project Portal' },
                url: input.portal_url,
            }],
        });
    }

    return blocks;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function sendMessage(input: z.infer<typeof SlackMessageSchema>) {
    const v = SlackMessageSchema.parse(input);
    const response = await axios.post(`${SLACK_BASE}/chat.postMessage`, {
        channel: v.channel,
        text: v.text,
        blocks: v.blocks,
        thread_ts: v.thread_ts,
        unfurl_links: v.unfurl_links,
    }, { headers: slackHeaders() });

    const data = response.data as { ok: boolean; ts: string; error?: string };
    if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
    return { message_ts: data.ts, channel: v.channel };
}

export async function sendRichAlert(input: z.infer<typeof SlackRichAlertSchema>) {
    const v = SlackRichAlertSchema.parse(input);
    console.log(`[PLUG/SLACK] 📢 ${v.type.toUpperCase()}: ${v.title} → ${v.channel}`);

    return sendMessage({
        channel: v.channel,
        text: `${STATUS_ICONS[v.type]} ${v.title}: ${v.body}`,
        blocks: buildRichAlertBlocks(v),
        unfurl_links: false,
    });
}

export async function sendProjectUpdate(input: z.infer<typeof SlackProjectUpdateSchema>) {
    const v = SlackProjectUpdateSchema.parse(input);
    console.log(`[PLUG/SLACK] 📋 Project update: ${v.project_name} (${v.status}) → ${v.channel}`);

    return sendMessage({
        channel: v.channel,
        text: `Project Update: ${v.project_name} — ${v.status.toUpperCase()}`,
        blocks: buildProjectUpdateBlocks(v),
        unfurl_links: false,
    });
}

export async function listChannels(input: z.infer<typeof SlackChannelListSchema>) {
    const v = SlackChannelListSchema.parse(input);
    const response = await axios.get(`${SLACK_BASE}/conversations.list`, {
        headers: slackHeaders(),
        params: { types: v.types, limit: v.limit, exclude_archived: true },
    });

    const data = response.data as { ok: boolean; channels: Array<{ id: string; name: string; is_private: boolean; num_members: number }> };
    if (!data.ok) throw new Error('Failed to list Slack channels');

    return {
        channels: data.channels.map(c => ({
            id: c.id,
            name: c.name,
            private: c.is_private,
            members: c.num_members,
        })),
        total: data.channels.length,
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const SLACK_MCP_TOOLS = [
    {
        name: 'slack_send_message',
        description: 'Send a message to a Slack channel, with optional Block Kit blocks and thread support.',
        inputSchema: SlackMessageSchema,
        handler: sendMessage,
        agentPermissions: ['RELAY', 'ORACLE', 'STUDIO'],
        estimatedCost: 'Free',
    },
    {
        name: 'slack_send_alert',
        description: 'Send a rich formatted alert (success/warning/error/info) to Slack with optional CTA button.',
        inputSchema: SlackRichAlertSchema,
        handler: sendRichAlert,
        agentPermissions: ['RELAY', 'ORACLE', 'SENTINEL'],
        estimatedCost: 'Free',
    },
    {
        name: 'slack_project_update',
        description: 'Send a formatted project status update to Slack (kicked off, on track, at risk, complete, etc.).',
        inputSchema: SlackProjectUpdateSchema,
        handler: sendProjectUpdate,
        agentPermissions: ['RELAY', 'STUDIO', 'ORACLE'],
        estimatedCost: 'Free',
    },
    {
        name: 'slack_list_channels',
        description: 'List available Slack channels the bot has access to.',
        inputSchema: SlackChannelListSchema,
        handler: listChannels,
        agentPermissions: ['RELAY', 'ORACLE'],
        estimatedCost: 'Free',
    },
];
