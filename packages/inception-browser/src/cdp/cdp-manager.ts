/**
 * CDP Manager — Chrome DevTools Protocol Attach Mode
 *
 * Allows the Creative Liberation Engine to adopt any running Chrome, Edge, Brave, or Arc
 * browser instance that has been launched with --remote-debugging-port=<port>.
 *
 * Usage:
 *   1. Launch Chrome with:  --remote-debugging-port=9222 --user-data-dir=<dir>
 *   2. Call browser_attach_cdp({ port: 9222 }) via MCP
 *   3. AVERI can now observe and control all tabs in that browser
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export type BrowserType = 'chrome' | 'edge' | 'brave' | 'arc' | 'firefox' | 'opera' | 'unknown';
export type NodeMode = 'sovereign' | 'cdp' | 'extension';
export type NodeStatus = 'available' | 'busy' | 'idle' | 'disconnected';

export interface TabRecord {
  id: string;
  url: string;
  title: string;
  active: boolean;
  screenshotB64?: string;
  domSnapshot?: string;
}

export interface BrowserNode {
  id: string;
  mode: NodeMode;
  browser: BrowserType;
  status: NodeStatus;
  tabs: TabRecord[];
  agentId?: string;
  taskId?: string;
  cdpPort?: number;
  connectedAt: Date;
  lastSeen: Date;
}

interface CdpAttachedInstance {
  node: BrowserNode;
  browser: Browser;
  contexts: BrowserContext[];
}

class CdpManager {
  private attached: Map<number, CdpAttachedInstance> = new Map();

  /**
   * Attach to a running browser via its CDP debug port.
   * Works with Chrome, Edge, Brave, Arc — any Chromium-based browser launched
   * with --remote-debugging-port=<port>.
   */
  async attach(port: number, label?: string): Promise<BrowserNode> {
    if (this.attached.has(port)) {
      const existing = this.attached.get(port)!;
      existing.node.lastSeen = new Date();
      existing.node.status = 'available';
      return existing.node;
    }

    const cdpUrl = `http://localhost:${port}`;
    const browser = await chromium.connectOverCDP(cdpUrl);

    const contexts = browser.contexts();
    const tabs: TabRecord[] = [];

    for (const ctx of contexts) {
      const pages = ctx.pages();
      for (const page of pages) {
        tabs.push({
          id: `tab-${tabs.length}`,
          url: page.url(),
          title: await page.title().catch(() => ''),
          active: tabs.length === 0,
        });
      }
    }

    // Detect browser type from CDP version endpoint
    const browserType = await this.detectBrowserType(port);

    const node: BrowserNode = {
      id: `cdp-${port}${label ? `-${label}` : ''}`,
      mode: 'cdp',
      browser: browserType,
      status: 'available',
      tabs,
      cdpPort: port,
      connectedAt: new Date(),
      lastSeen: new Date(),
    };

    this.attached.set(port, { node, browser, contexts });

    // Watch for browser disconnect
    browser.on('disconnected', () => {
      const inst = this.attached.get(port);
      if (inst) {
        inst.node.status = 'disconnected';
        console.error(`[CDP] Browser on :${port} disconnected`);
      }
      this.attached.delete(port);
    });

    console.error(`[CDP] ✅ Attached to ${browserType} on :${port} — ${tabs.length} tabs`);
    return node;
  }

  /** Detach from a CDP browser node. */
  async detach(port: number): Promise<void> {
    const inst = this.attached.get(port);
    if (!inst) return;
    // connectOverCDP browser — disconnect gracefully (does NOT close the browser)
    await inst.browser.close().catch(() => void 0);
    this.attached.delete(port);
    console.error(`[CDP] Detached from :${port}`);
  }

  /**
   * Get a specific page from a CDP-attached browser by tab index.
   * Defaults to the first (active) page if index not provided.
   */
  getPage(port: number, tabIndex = 0): Page | null {
    const inst = this.attached.get(port);
    if (!inst) return null;
    const allPages = inst.contexts.flatMap(ctx => ctx.pages());
    return allPages[tabIndex] ?? null;
  }

  /** Open a new tab in a CDP-attached browser. */
  async openTab(port: number, url?: string): Promise<Page | null> {
    const inst = this.attached.get(port);
    if (!inst || inst.contexts.length === 0) return null;
    const page = await inst.contexts[0].newPage();
    if (url) await page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.refreshTabs(port);
    return page;
  }

  /** Refresh the tab list for a node. */
  async refreshTabs(port: number): Promise<TabRecord[]> {
    const inst = this.attached.get(port);
    if (!inst) return [];
    const tabs: TabRecord[] = [];
    for (const ctx of inst.contexts) {
      for (const page of ctx.pages()) {
        tabs.push({
          id: `tab-${tabs.length}`,
          url: page.url(),
          title: await page.title().catch(() => ''),
          active: tabs.length === 0,
        });
      }
    }
    inst.node.tabs = tabs;
    inst.node.lastSeen = new Date();
    return tabs;
  }

  /** Get all attached browser nodes. */
  getNodes(): BrowserNode[] {
    return Array.from(this.attached.values()).map(i => i.node);
  }

  /** Get a specific node by port. */
  getNode(port: number): BrowserNode | undefined {
    return this.attached.get(port)?.node;
  }

  /** Check if a CDP port is currently attached. */
  isAttached(port: number): boolean {
    return this.attached.has(port) && this.attached.get(port)!.node.status !== 'disconnected';
  }

  /** Get all attached ports. */
  getPorts(): number[] {
    return Array.from(this.attached.keys());
  }

  /**
   * Mark a node as busy (assigned a task).
   */
  assignTask(port: number, agentId: string, taskId: string): void {
    const inst = this.attached.get(port);
    if (inst) {
      inst.node.status = 'busy';
      inst.node.agentId = agentId;
      inst.node.taskId = taskId;
    }
  }

  /** Release a node from a task. */
  releaseTask(port: number): void {
    const inst = this.attached.get(port);
    if (inst) {
      inst.node.status = 'available';
      inst.node.agentId = undefined;
      inst.node.taskId = undefined;
    }
  }

  /** Probe CDP to detect browser identity. */
  private async detectBrowserType(port: number): Promise<BrowserType> {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      if (!response.ok) return 'unknown';
      const data = await response.json() as { Browser?: string };
      const ua = (data.Browser ?? '').toLowerCase();
      if (ua.includes('firefox')) return 'firefox';
      if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
      if (ua.includes('edg')) return 'edge';
      if (ua.includes('brave')) return 'brave';
      if (ua.includes('arc')) return 'arc';
      if (ua.includes('chrome')) return 'chrome';
      // Port convention fallback
      if (port === 9226) return 'firefox';
      if (port === 9227) return 'opera';
      return 'unknown';
    } catch {
      // Port convention fallback when /json/version is unavailable
      if (port === 9226) return 'firefox';
      if (port === 9227) return 'opera';
      return 'unknown';
    }
  }
}

// Singleton
export const cdpManager = new CdpManager();
