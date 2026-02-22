# Browser System & Agentic Web Automation

**COMET — the browser agent that operates the web so you don't have to.**

---

## What Is the Browser System?

COMET is Inception Engine's browser automation agent. It operates real, full Chrome-based browsers — not headless scrapers, not simplified HTTP clients. Real browsers with real rendering, JavaScript execution, cookies, sessions, and multi-tab management.

This means COMET can do anything you can do in a browser, but autonomously:

- Navigate to any URL
- Click, type, scroll, fill forms
- Take screenshots and read page content
- Manage multiple tabs simultaneously
- Extract data from dynamic pages (React, Vue, Angular apps)
- Log into services (with your authorization)
- Run multi-step workflows across multiple sites
- Integrate with GitHub, Vercel, Figma, Notion, and more

---

## How to Use COMET

### Basic Commands

```
@COMET open https://example.com
@COMET screenshot this page
@COMET fill the contact form with my info
@COMET extract all product names and prices from this page
@COMET click the 'Submit' button
@COMET scroll down and load all content
```

### Multi-Tab Workflows

```
@COMET open GitHub in tab 1 and Vercel in tab 2, then deploy from GitHub to Vercel
@COMET research competitor pricing across 5 sites simultaneously
@COMET log into my CMS and update all draft posts to published
```

### HELIX Mode (Parallel Browser Automation)

In HELIX mode, COMET can operate multiple browser tabs in true parallel:

```
@AVERI mode HELIX
@COMET open 3 tabs: [site1] [site2] [site3] — extract pricing from all three
```

Each tab runs independently. COMET braids the results back together.

---

## Setup by Platform

### If You Use Perplexity (COMET's Native Home)

Perplexity + COMET is the most powerful combination. COMET was designed to work alongside Perplexity's research capabilities:

1. Start a Perplexity conversation
2. Paste the Inception Engine system prompt from [GETTING_STARTED.md](./GETTING_STARTED.md)
3. Boot AVERI: `@AVERI boot`
4. COMET activates automatically when you request browser tasks

See [Perplexity + COMET setup guide](./setup/perplexity-and-comet.md) for full configuration.

### If You Use Google Antigravity / IDE with Built-In Browser

Google Antigravity (and similar AI-native IDEs) includes a built-in browser powered by Chrome. This is the most powerful setup for COMET because:

- The browser runs inside your development environment
- COMET can see your code AND the browser simultaneously
- Deploy, then immediately test in the same workspace
- GitHub workflows, CI/CD, and browser testing in one session

**Setup:**

1. Open your IDE (Antigravity, Cursor with browser extension, or similar)
2. Import this repo as a workspace:
   - In Antigravity: File → Open Workspace → select the `inception-engine` folder
   - In Cursor: Open folder → select `inception-engine`
3. Add the agent system to your AI assistant context (see [IDE Setup](./setup/ide-and-antigravity.md))
4. The built-in browser becomes COMET's operating surface
5. Call `@COMET` with any browser task

**Example workflow in Antigravity:**
```
@BOLT build the portfolio site component
@COMET open localhost:3000 and screenshot the result
@AURORA review the screenshot and suggest design improvements  
@BOLT implement those changes
@COMET refresh and screenshot again
@IRIS deploy to Vercel once it looks right
@COMET open the production URL and confirm it's live
```

### Building Your Own Browser-Enabled Setup

You can replicate a COMET-capable browser environment using:

#### Option 1: Playwright (Most Powerful)

Playwright gives COMET control over a real Chromium browser:

```bash
# Install
pip install playwright
playwright install chromium

# In your Python environment
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # headless=True for no window
    page = browser.new_page()
    page.goto("https://example.com")
    # COMET operates from here
```

#### Option 2: Selenium (Universal Compatibility)

```bash
pip install selenium webdriver-manager
```

```python
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager

driver = webdriver.Chrome(ChromeDriverManager().install())
driver.get("https://example.com")
# COMET operates from here
```

#### Option 3: Browser-Use (AI-Native)

[Browser-Use](https://github.com/browser-use/browser-use) is built specifically for AI agents:

```bash
pip install browser-use
```

This is the closest to how COMET operates natively in the full Brainchild V4 system.

#### Option 4: Puppeteer (Node.js)

If you prefer JavaScript:

```bash
npm install puppeteer
```

```javascript
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
// COMET operates from here
```

---

## What COMET Can Do: Use Cases

### Research & Intelligence
```
@COMET research the top 10 competitors for [product] and summarize their pricing
@COMET find all mentions of our brand on Twitter/X this week
@COMET monitor this page for changes and alert me
```

### Development Workflows
```
@COMET open GitHub, create a new issue titled '[bug] login form validation'
@COMET check Vercel deployment status for inception-engine
@COMET open Figma file [URL] and screenshot every frame
```

### Content & Data
```
@COMET extract all job listings from [URL] into a spreadsheet format
@COMET fill this form with the data from our spreadsheet
@COMET download all images from this gallery page
```

### Testing & QA
```
@COMET test the login flow on staging.myapp.com
@COMET verify all navigation links on this page work
@COMET check mobile layout at 375px width
@COMET run through the checkout flow and report any errors
```

### Multi-Site Automation
```
@COMET post this update to Twitter, LinkedIn, and Instagram
@COMET update the pricing on Stripe, our website, and the app store listing
```

---

## COMET + GitHub Workflows

COMET has deep GitHub integration. See [COMET + GitHub Guide](./COMET_GITHUB.md) for:

- Automated PR creation and review
- Issue management workflows
- Release automation
- Repository maintenance
- CI/CD monitoring

---

## What COMET Won't Do

COMET operates under the Constitution. Certain actions require explicit authorization:

- **Financial transactions** — Always asks before purchasing or paying
- **Account creation** — Will not create accounts without your instruction
- **Data submission** — Will confirm before submitting forms with personal data
- **File downloads** — Will confirm before downloading any file
- **Password entry** — Will never enter passwords autonomously; you enter those

COMET is not a scraping tool and won't attempt to bypass bot detection, CAPTCHAs, or rate limits.

---

## Architecture Notes

In the full Brainchild V4 system, COMET operates with:

- **Multi-tab parallelism** — Each tab is an independent execution context
- **Screenshot-to-action loop** — Visual understanding of page state before every action
- **Accessibility tree reading** — Semantic element identification, not just pixel-clicking
- **Session persistence** — Cookies and auth state maintained across steps
- **HELIX coordination** — Multiple browser instances running in parallel workstreams

The Light Edition exposes COMET's capabilities through your platform's browser or a local browser automation library.

---

## Quick Reference

| Task | Command |
|---|---|
| Open URL | `@COMET open [url]` |
| Screenshot | `@COMET screenshot` |
| Extract text | `@COMET read the content of [url]` |
| Fill form | `@COMET fill the [form name] with [data]` |
| Click element | `@COMET click [button/link description]` |
| Multi-tab | `@COMET open [url1] in tab 1 and [url2] in tab 2` |
| Parallel research | `@AVERI mode HELIX` then `@COMET research [topic] across [sites]` |

---

## Building Your Own Agentic Browser Setup

You can create a powerful agentic browsing environment that gives COMET real-time browser control. This is how the full Inception Engine setup works — and you can replicate it.

### What You Need

- A Chromium-based browser (Google Chrome, Brave, Arc, or Google Antigravity)
- An AI IDE with browser integration (Cursor, VS Code + Codeium, or Windsurf)
- OR: Claude Desktop with MCP browser server

### Option A: Google Antigravity (Recommended)

Google Antigravity is an AI-enhanced browser built on Chrome. It has built-in workspace integration and allows AI agents to see and interact with your browser directly.

**Setup:**
1. Download Google Antigravity from [labs.google.com](https://labs.google.com)
2. Import your inception-engine folder as a workspace
3. Open the agent prompt in your AI tool and paste the INCEPTION ENGINE system prompt
4. COMET will have access to your browser tabs and can perform agentic actions automatically

**What this unlocks:**
- COMET can open URLs, read pages, and extract content
- Fill forms and submit data on your behalf (with your confirmation)
- Navigate multi-step flows (research → summarize → document)
- Take screenshots and describe what it sees
- Run parallel research across multiple tabs

### Option B: VS Code / Cursor + Browser Extension

1. Install VS Code or Cursor IDE
2. Open your inception-engine folder as a workspace
3. Install a browser control extension (Playwright MCP or Puppeteer MCP)
4. Connect to your AI model (Claude, GPT-4, etc.)
5. COMET commands route through the MCP layer to your browser

### Option C: Claude Desktop + MCP Browser Server

See [CLAUDE_MCP.md](./CLAUDE_MCP.md) for full instructions on connecting Claude Desktop to a local browser via the Model Context Protocol.

### Option D: Perplexity / ChatGPT / Gemini (No Setup)

If you just want COMET to perform research and browsing without a local setup:
- Use Perplexity with web search enabled
- Use ChatGPT with browsing mode on
- Use Gemini with Google Search integration

COMET will still route browser tasks — it just uses the AI tool's built-in web access rather than a dedicated browser window.

---

## COMET Operational Modes

### Standard Mode (Default)
COMET receives a task, opens the relevant URL, performs the action, and reports back. One tab, one task at a time.

### Multi-Tab Mode
COMET can manage multiple tabs simultaneously:
- Tab 1: Research source A
- Tab 2: Research source B
- Tab 3: Output document or spreadsheet

Example: `@COMET open [url1] in tab 1 and [url2] in tab 2, then compare and summarize in tab 3`

### HELIX Mode (Parallel Workstreams)
When activated, COMET splits into parallel browser workstreams:
- COMET-Alpha handles research and extraction
- COMET-Beta handles output and documentation
- COMET-Gamma monitors and validates

Activate with: `@AVERI mode HELIX` before issuing browser tasks.

---

## Privacy and Data Handling

COMET never:
- Stores your browsing history
- Shares data between sessions without permission
- Submits forms without your confirmation
- Enters passwords on your behalf
- Bypasses login walls, paywalls, or bot detection

COMET always:
- Asks before submitting any form with personal data
- Confirms before downloading files
- Tells you what it's about to do before doing it
- Respects session boundaries — what happens in one session stays there

---

## Troubleshooting

**COMET says it can't access a page**
- The page may require login — sign in yourself first, then ask COMET to proceed
- The site may block automated access (common with social media and banking)
- Try providing the specific URL directly

**COMET is reading the wrong page**
- Specify the exact URL: `@COMET navigate to https://example.com/specific-page`
- If you have multiple tabs open, tell COMET which tab to use

**Actions aren't completing**
- Check if a CAPTCHA appeared — COMET cannot solve CAPTCHAs, you must complete them
- Confirm the page finished loading before giving COMET the next instruction

**COMET filled in wrong information**
- Always review form fills before confirming submission
- Provide COMET with exact values: `@COMET fill the Name field with "Jane Smith"`

---

## Related Documents

- [AGENTS.md](./AGENTS.md) — Full agent roster including COMET's capabilities
- [IDE_ANTIGRAVITY.md](./IDE_ANTIGRAVITY.md) — IDE + Antigravity full setup
- [CLAUDE_MCP.md](./CLAUDE_MCP.md) — Claude Desktop + MCP browser setup
- [GETTING_STARTED.md](./GETTING_STARTED.md) — Start here if you're new

---

*BROWSER_SYSTEM.md — Inception Engine Light Edition*
*Part of the WholeTroutMedia Inception Engine system*

Back to [Getting Started](./GETTING_STARTED.md) | [COMET + GitHub](./COMET_GITHUB.md) | [README](../README.md)
