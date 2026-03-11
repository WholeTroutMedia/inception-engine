// packages/inception-browser/src/tools/sessions.ts
// T20260306-186: Session persistence tools — list, restore, clear sessions

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserEngine } from '../browser/engine.js';
import type { SessionManager } from '../browser/session.js';

export const sessionTools: Tool[] = [
    {
        name: 'browser_session_list',
        description: 'List all saved browser sessions with metadata (URL, title, timestamp, cookies)',
        inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'browser_session_save',
        description: 'Save the current browser session (cookies, localStorage, URL) under a given name',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Session name/alias' },
            },
            required: ['name'],
        },
    },
    {
        name: 'browser_session_restore',
        description: 'Restore a previously saved session by name',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Session name to restore' },
            },
            required: ['name'],
        },
    },
    {
        name: 'browser_session_delete',
        description: 'Delete a saved session by name',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Session name to delete' },
            },
            required: ['name'],
        },
    },
    {
        name: 'browser_action_history',
        description: 'Retrieve the recent action history log (navigation, clicks, form fills)',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Max actions to return (default 50)', default: 50 },
            },
            required: [],
        },
    },
];

export async function handleSessionTool(
    name: string,
    args: Record<string, unknown>,
    sessions: SessionManager,
    engine: BrowserEngine
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const page = await engine.getPage();

    switch (name) {
        case 'browser_session_list': {
            const list = sessions.listSessions();
            return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
        }

        case 'browser_session_save': {
            if (!page) throw new Error('No active browser page — navigate somewhere first');
            const sessionName = String(args.name);
            await sessions.saveSession(sessionName, page.context());
            return { content: [{ type: 'text', text: `✅ Session "${sessionName}" saved` }] };
        }

        case 'browser_session_restore': {
            const sessionName = String(args.name);
            if (!page) throw new Error('No active browser page');
            await sessions.restoreSession(sessionName, page.context());
            return { content: [{ type: 'text', text: `✅ Session "${sessionName}" restored` }] };
        }

        case 'browser_session_delete': {
            const sessionName = String(args.name);
            sessions.deleteSession(sessionName);
            return { content: [{ type: 'text', text: `✅ Session "${sessionName}" deleted` }] };
        }

        case 'browser_action_history': {
            const limit = Number(args.limit ?? 50);
            const history = sessions.getActionHistory(limit);
            return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] };
        }

        default:
            throw new Error(`Unknown session tool: ${name}`);
    }
}
