/**
 * CDP Tools — MCP tool handlers for CDP Attach mode
 *
 * Exposes browser_attach_cdp, browser_detach_cdp, browser_mesh_nodes
 * to any AVERI agent via the inception-browser MCP server.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { cdpManager } from '../cdp/cdp-manager.js';
import { nodeRegistry } from '../cdp/node-registry.js';

export const cdpTools: Tool[] = [
  {
    name: 'browser_attach_cdp',
    description: `Attach the Creative Liberation Engine to a running Chrome, Edge, Brave, or Arc browser via its Chrome DevTools Protocol (CDP) debug port.

The browser must be launched with --remote-debugging-port=<port>.
Use the setup script at scripts/setup-chrome-debug.ps1 to create a shortcut automatically.

Once attached, AVERI can observe all open tabs and control the browser — while you continue using it normally.
Returns the browser node ID, browser type, and a list of open tabs.`,
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP debug port. Default: 9222 (Chrome/Edge/Brave). Use 9223+ for additional browsers.',
          default: 9222,
        },
        label: {
          type: 'string',
          description: 'Optional label for this browser node (e.g. "main-chrome", "research-browser")',
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_detach_cdp',
    description: 'Detach the Creative Liberation Engine from a CDP-attached browser. The browser continues running; AVERI just stops controlling it.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP port to detach from (default: 9222)',
          default: 9222,
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_mesh_nodes',
    description: 'List all browser nodes currently in the Creative Liberation Engine mesh — sovereign (Playwright), CDP-attached, and extension-connected browsers. Shows status, tabs, and agent assignments.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['all', 'sovereign', 'cdp', 'extension'],
          description: 'Filter by node mode (default: all)',
          default: 'all',
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_mesh_tabs',
    description: 'Refresh and list all open tabs across all CDP-attached browsers. Shows URL, title, and which browser node each tab belongs to.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Filter to a specific CDP port (omit for all attached browsers)',
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_cdp_open_tab',
    description: 'Open a new tab in a CDP-attached browser (your real Chrome/Edge/etc).',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP debug port of the target browser (default: 9222)',
          default: 9222,
        },
        url: {
          type: 'string',
          description: 'URL to open in the new tab',
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_cdp_screenshot',
    description: 'Take a screenshot of a specific tab in a CDP-attached browser.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP debug port (default: 9222)',
          default: 9222,
        },
        tab_index: {
          type: 'number',
          description: 'Tab index (0 = first tab, default: 0)',
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_cdp_navigate',
    description: 'Navigate a specific tab in a CDP-attached browser to a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP debug port (default: 9222)',
          default: 9222,
        },
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        tab_index: {
          type: 'number',
          description: 'Tab index (default: 0)',
          default: 0,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_cdp_extract',
    description: 'Extract the full text content and DOM map from a tab in a CDP-attached browser.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'CDP debug port (default: 9222)',
          default: 9222,
        },
        tab_index: {
          type: 'number',
          description: 'Tab index (default: 0)',
          default: 0,
        },
      },
      required: [],
    },
  },
];

type ToolResult = { content: Array<{ type: string; text: string }> };

export async function handleCdpTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const port = Number(args.port ?? 9222);

  switch (name) {
    case 'browser_attach_cdp': {
      const label = args.label ? String(args.label) : undefined;
      const node = await cdpManager.attach(port, label);
      nodeRegistry.register(node);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: '✅ Attached',
            nodeId: node.id,
            browser: node.browser,
            port,
            tabs: node.tabs,
            message: `AVERI is now co-piloting your ${node.browser} on port ${port}. ${node.tabs.length} tab(s) discovered.`,
          }, null, 2),
        }],
      };
    }

    case 'browser_detach_cdp': {
      if (!cdpManager.isAttached(port)) {
        return { content: [{ type: 'text', text: `No browser attached on :${port}` }] };
      }
      const node = cdpManager.getNode(port);
      if (node) nodeRegistry.unregister(node.id);
      await cdpManager.detach(port);
      return { content: [{ type: 'text', text: `✅ Detached from browser on :${port}. Browser continues running.` }] };
    }

    case 'browser_mesh_nodes': {
      const modeFilter = args.mode ? String(args.mode) : 'all';
      const nodes = modeFilter === 'all'
        ? nodeRegistry.getAll()
        : nodeRegistry.getByMode(modeFilter as 'sovereign' | 'cdp' | 'extension');
      const summary = nodeRegistry.summary();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ summary, nodes }, null, 2),
        }],
      };
    }

    case 'browser_mesh_tabs': {
      const ports = args.port ? [Number(args.port)] : cdpManager.getPorts();
      const allTabs: Array<{ port: number; nodeId: string; tabs: unknown }> = [];
      for (const p of ports) {
        const tabs = await cdpManager.refreshTabs(p);
        const node = cdpManager.getNode(p);
        if (node) {
          nodeRegistry.register(node); // refresh in registry too
          allTabs.push({ port: p, nodeId: node.id, tabs });
        }
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(allTabs, null, 2),
        }],
      };
    }

    case 'browser_cdp_open_tab': {
      if (!cdpManager.isAttached(port)) {
        return { content: [{ type: 'text', text: `No browser attached on :${port}. Call browser_attach_cdp first.` }] };
      }
      const url = args.url ? String(args.url) : undefined;
      await cdpManager.openTab(port, url);
      return { content: [{ type: 'text', text: `✅ Opened new tab${url ? ` at ${url}` : ''} in browser on :${port}` }] };
    }

    case 'browser_cdp_screenshot': {
      const tabIndex = Number(args.tab_index ?? 0);
      const page = cdpManager.getPage(port, tabIndex);
      if (!page) return { content: [{ type: 'text', text: `No page found at tab ${tabIndex} on :${port}` }] };
      const b64 = await page.screenshot({ type: 'jpeg', quality: 80 }).then(buf => buf.toString('base64'));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: page.url(),
            title: await page.title(),
            screenshot_b64: b64,
          }),
        }],
      };
    }

    case 'browser_cdp_navigate': {
      const tabIndex = Number(args.tab_index ?? 0);
      const url = String(args.url);
      const page = cdpManager.getPage(port, tabIndex);
      if (!page) return { content: [{ type: 'text', text: `No page found on :${port}` }] };
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return { content: [{ type: 'text', text: `✅ Navigated tab ${tabIndex} on :${port} to ${url}` }] };
    }

    case 'browser_cdp_extract': {
      const tabIndex = Number(args.tab_index ?? 0);
      const page = cdpManager.getPage(port, tabIndex);
      if (!page) return { content: [{ type: 'text', text: `No page found on :${port}` }] };
      const text = await page.evaluate(() => document.body?.innerText ?? '');
      const url = page.url();
      const title = await page.title();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ url, title, text: text.slice(0, 8000) }, null, 2),
        }],
      };
    }

    default:
      throw new Error(`Unknown CDP tool: ${name}`);
  }
}
