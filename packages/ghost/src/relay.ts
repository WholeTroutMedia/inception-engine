import { z } from 'zod';
import axios from 'axios';
import nodemailer from 'nodemailer';

// ─── GHOST — RELAY Agent ──────────────────────────────────────────────────────
// Multi-channel alert orchestrator: routes notifications across Slack, Email,
// and SMS based on severity, agent type, and channel preferences.
// Agents: SENTINEL (security), ORACLE (intelligence), STUDIO (ops)

const ENV_RELAY = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_RELAY.process?.env?.[k];

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertChannel = 'slack' | 'email' | 'sms' | 'all';

export interface RelayAlert {
    title: string;
    body: string;
    severity: AlertSeverity;
    source_agent: string;
    metadata?: Record<string, unknown>;
    cta_url?: string;
    project_id?: string;
}

export interface ChannelPreferences {
    slack_channel?: string;
    email_to?: string;
    sms_to?: string;
    channels: AlertChannel[];
}

interface ChannelResults {
    slack?: { ok: boolean; ts?: string; error?: string };
    email?: { ok: boolean; id?: string; error?: string };
    sms?: { ok: boolean; sid?: string; error?: string };
}

interface RelayResult {
    alert: RelayAlert;
    channels_attempted: string[];
    results: ChannelResults;
    routed_at: string;
}

// ─── Severity → Routing rules ─────────────────────────────────────────────────

const SEVERITY_ROUTING: Record<AlertSeverity, AlertChannel[]> = {
    critical: ['slack', 'email', 'sms'],
    high: ['slack', 'email'],
    medium: ['slack'],
    low: ['slack'],
    info: ['slack'],
};

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    info: '💡',
};

// ─── Channel Drivers ──────────────────────────────────────────────────────────

async function sendSlack(alert: RelayAlert, channel: string): Promise<{ ok: boolean; ts?: string; error?: string }> {
    const token = getEnv('SLACK_BOT_TOKEN');
    if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN not configured' };

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${SEVERITY_EMOJI[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}` },
        },
        { type: 'section', text: { type: 'mrkdwn', text: alert.body } },
        {
            type: 'context',
            elements: [
                { type: 'mrkdwn', text: `Agent: *${alert.source_agent}* | ${new Date().toISOString()}` },
                ...(alert.project_id ? [{ type: 'mrkdwn', text: `Project: \`${alert.project_id}\`` }] : []),
            ],
        },
        ...(alert.cta_url ? [{
            type: 'actions',
            elements: [{
                type: 'button', text: { type: 'plain_text', text: 'View Details' }, url: alert.cta_url,
                style: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'danger' : 'primary'
            }],
        }] : []),
    ];

    try {
        const res = await axios.post('https://slack.com/api/chat.postMessage',
            { channel, text: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}: ${alert.body}`, blocks, unfurl_links: false },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        const data = res.data as { ok: boolean; ts: string; error?: string };
        return { ok: data.ok, ts: data.ts, error: data.error };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

async function sendEmail(alert: RelayAlert, to: string): Promise<{ ok: boolean; id?: string; error?: string }> {
    const clientId = getEnv('GMAIL_CLIENT_ID');
    const refresh = getEnv('GMAIL_REFRESH_TOKEN');
    const adminEmail = getEnv('ADMIN_EMAIL') ?? 'hello@inceptionengine.co';
    const fromName = getEnv('FROM_NAME') ?? 'Creative Liberation Engine RELAY';
    
    if (!clientId || !refresh) return { ok: false, error: 'Gmail OSAuth credentials not configured' };

    const html = `<!DOCTYPE html><html><body style="background:#0a0a0f;color:#f5f0e8;font-family:Arial,sans-serif;padding:40px">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:#1a1a25;border-left:4px solid ${alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#b87333'};padding:24px;border-radius:4px">
      <h2 style="margin:0 0 8px;color:${alert.severity === 'critical' ? '#ef4444' : '#f5f0e8'}">${SEVERITY_EMOJI[alert.severity]} ${alert.title}</h2>
      <p style="margin:0 0 16px;color:rgba(245,240,232,0.75)">${alert.body}</p>
      <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.4)">Source: ${alert.source_agent} · ${new Date().toISOString()}</p>
      ${alert.cta_url ? `<a href="${alert.cta_url}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#b87333;color:white;text-decoration:none;border-radius:4px;font-weight:700">View Details →</a>` : ''}
    </div>
  </div></body></html>`;

    try {
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: adminEmail,
                clientId,
                clientSecret: getEnv('GMAIL_CLIENT_SECRET'),
                refreshToken: refresh
            }
        });
        
        const info = await transport.sendMail({
            from: `"${fromName}" <${adminEmail}>`,
            to,
            subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            html,
        });
        return { ok: true, id: info.messageId };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

async function sendSMS(alert: RelayAlert, to: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
    const apiKey = getEnv('TELNYX_API_KEY');
    const from = getEnv('TELNYX_FROM_NUMBER');
    if (!apiKey || !from) return { ok: false, error: 'Telnyx not configured' };

    const body = `${SEVERITY_EMOJI[alert.severity]} [INCEPTION/${alert.severity.toUpperCase()}] ${alert.title}\\n${alert.body.slice(0, 140)}`;

    try {
        const res = await axios.post(
            'https://api.telnyx.com/v2/messages',
            { from, to, text: body },
            { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        const sid = res.data?.data?.id;
        return { ok: true, sid };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

// ─── RELAY Core ───────────────────────────────────────────────────────────────

export class RelayAgent {
    private defaultSlackChannel: string;
    private defaultEmailTo: string;
    private defaultSmsTo: string;

    constructor(defaults: { slack_channel?: string; email_to?: string; sms_to?: string } = {}) {
        this.defaultSlackChannel = defaults.slack_channel ?? getEnv('RELAY_SLACK_CHANNEL') ?? '#alerts';
        this.defaultEmailTo = defaults.email_to ?? getEnv('RELAY_EMAIL_TO') ?? '';
        this.defaultSmsTo = defaults.sms_to ?? getEnv('RELAY_SMS_TO') ?? '';
    }

    async broadcast(alert: RelayAlert, prefs?: ChannelPreferences): Promise<RelayResult> {
        const channels = prefs?.channels ?? SEVERITY_ROUTING[alert.severity];
        const results: ChannelResults = {};
        const attempted: string[] = [];

        console.log(`[RELAY] 📡 Broadcasting [${alert.severity}] "${alert.title}" via: ${channels.join(', ')}`);

        const tasks: Promise<void>[] = [];

        if (channels.includes('slack') || channels.includes('all')) {
            const ch = prefs?.slack_channel ?? this.defaultSlackChannel;
            attempted.push(`slack:${ch}`);
            tasks.push(sendSlack(alert, ch).then(r => { results.slack = r; }));
        }

        if ((channels.includes('email') || channels.includes('all')) && (prefs?.email_to ?? this.defaultEmailTo)) {
            const to = prefs?.email_to ?? this.defaultEmailTo;
            attempted.push(`email:${to}`);
            tasks.push(sendEmail(alert, to).then(r => { results.email = r; }));
        }

        if ((channels.includes('sms') || channels.includes('all')) && (prefs?.sms_to ?? this.defaultSmsTo)) {
            const to = prefs?.sms_to ?? this.defaultSmsTo;
            attempted.push(`sms:${to}`);
            tasks.push(sendSMS(alert, to).then(r => { results.sms = r; }));
        }

        await Promise.allSettled(tasks);

        const result: RelayResult = { alert, channels_attempted: attempted, results, routed_at: new Date().toISOString() };

        const failures = Object.entries(results).filter(([, v]) => !v?.ok);
        if (failures.length > 0) {
            console.warn(`[RELAY] ⚠️ ${failures.length} channel(s) failed:`, failures.map(([k, v]) => `${k}: ${v?.error}`));
        } else {
            console.log(`[RELAY] ✅ All ${attempted.length} channels delivered`);
        }

        return result;
    }

    // ─── Convenience wrappers ──────────────────────────────────────────────────

    security(title: string, body: string, opts?: Partial<RelayAlert>) {
        return this.broadcast({ title, body, severity: 'critical', source_agent: 'SENTINEL', ...opts });
    }

    warning(title: string, body: string, opts?: Partial<RelayAlert>) {
        return this.broadcast({ title, body, severity: 'high', source_agent: 'ORACLE', ...opts });
    }

    info(title: string, body: string, opts?: Partial<RelayAlert>) {
        return this.broadcast({ title, body, severity: 'info', source_agent: 'ORACLE', ...opts });
    }

    projectUpdate(title: string, body: string, projectId: string, opts?: Partial<RelayAlert>) {
        return this.broadcast({ title, body, severity: 'medium', source_agent: 'STUDIO', project_id: projectId, ...opts });
    }
}

export const relay = new RelayAgent();

// Input validation schema for MCP
export const RelayBroadcastSchema = z.object({
    title: z.string(),
    body: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).default('info'),
    source_agent: z.string().default('ORACLE'),
    slack_channel: z.string().optional(),
    email_to: z.string().email().optional(),
    sms_to: z.string().optional(),
    cta_url: z.string().url().optional(),
    project_id: z.string().optional(),
});

export const RELAY_MCP_TOOLS = [
    {
        name: 'relay_broadcast',
        description: 'Broadcast an alert across Slack, Email, and SMS simultaneously. Severity determines which channels are used automatically.',
        inputSchema: RelayBroadcastSchema,
        handler: async (input: z.infer<typeof RelayBroadcastSchema>) => {
            const v = RelayBroadcastSchema.parse(input);
            const agent = new RelayAgent({ slack_channel: v.slack_channel, email_to: v.email_to, sms_to: v.sms_to });
            return agent.broadcast({
                title: v.title, body: v.body, severity: v.severity,
                source_agent: v.source_agent, cta_url: v.cta_url, project_id: v.project_id,
            });
        },
        agentPermissions: ['SENTINEL', 'ORACLE', 'RELAY', 'STUDIO'],
        estimatedCost: 'Varies by channel',
    },
];
