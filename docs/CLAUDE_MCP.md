# Claude Desktop + MCP Setup

This guide shows you how to use Inception Engine with Claude Desktop through the Model Context Protocol (MCP). This setup gives Claude direct access to the agent system — no IDE or coding required.

**Difficulty: Beginner-friendly** — we walk through every step.

---

## Table of Contents

1. [What You'll Need](#what-youll-need)
2. [What is MCP?](#what-is-mcp)
3. [Step 1: Install Claude Desktop](#step-1-install-claude-desktop)
4. [Step 2: Install Node.js](#step-2-install-nodejs)
5. [Step 3: Download Inception Engine](#step-3-download-inception-engine)
6. [Step 4: Configure MCP](#step-4-configure-mcp)
7. [Step 5: Boot the Agent System](#step-5-boot-the-agent-system)
8. [Adding Browser Control](#adding-browser-control)
9. [Tips and Troubleshooting](#tips-and-troubleshooting)

---

## What You'll Need

- A computer (Windows, Mac, or Linux)
- An internet connection
- About 15 minutes

That's it. We'll install everything else together.

---

## What is MCP?

MCP stands for **Model Context Protocol**. It's a way for AI apps (like Claude Desktop) to connect to external tools and data.

Think of it like this:
- Without MCP: Claude can only read what you paste into the chat
- With MCP: Claude can access your Inception Engine files, run tools, and interact with the agent system directly

You don't need to understand MCP in detail — just follow the setup steps below.

---

## Step 1: Install Claude Desktop

1. Go to [claude.ai/download](https://claude.ai/download)
2. Download Claude Desktop for your operating system
3. Install it and open it
4. Sign in with your Anthropic account (create one if needed)

> **Note:** You need a Claude Pro subscription ($20/month) for the best experience. The free tier works but has usage limits.

---

## Step 2: Install Node.js

Node.js is a tool that lets your computer run the MCP server. You won't need to write any code — we just need it installed.

### Windows
1. Go to [nodejs.org](https://nodejs.org)
2. Click the **LTS** (Long Term Support) download button
3. Run the installer
4. Click **Next** through all the prompts (default settings are fine)
5. When it finishes, restart your computer

### Mac
1. Go to [nodejs.org](https://nodejs.org)
2. Click the **LTS** download button
3. Open the downloaded `.pkg` file
4. Follow the installer prompts

### Verify It Worked

Open a terminal (search for "Terminal" on Mac, "Command Prompt" or "PowerShell" on Windows) and type:

```
node --version
```

You should see a version number like `v20.x.x`. If you do, you're good.

---

## Step 3: Download Inception Engine

You need the Inception Engine files on your computer.

### Option A: Download ZIP (Easiest)

1. Go to [github.com/WholeTroutMedia/inception-engine](https://github.com/WholeTroutMedia/inception-engine)
2. Click the green **Code** button
3. Click **Download ZIP**
4. Unzip the folder
5. Move it somewhere easy to find, like:
   - Windows: `C:\Users\YourName\Documents\inception-engine`
   - Mac: `/Users/YourName/Documents/inception-engine`

### Option B: Clone with Git

If you have Git installed:
```
git clone https://github.com/WholeTroutMedia/inception-engine.git
```

---

## Step 4: Configure MCP

This is the step that connects Claude Desktop to Inception Engine.

### Find Your Config File

**Mac:**
The config file is at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

To open it:
1. Open Finder
2. Press Cmd + Shift + G
3. Paste the path above
4. If the file doesn't exist, create it

**Windows:**
The config file is at:
```
%APPDATA%\Claude\claude_desktop_config.json
```

To open it:
1. Press Win + R
2. Type `%APPDATA%\Claude` and press Enter
3. Open `claude_desktop_config.json` (or create it if it doesn't exist)

### Add the Inception Engine Server

Open the config file in any text editor (Notepad, TextEdit, etc.) and paste this:

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "npx",
      "args": ["-y", "@inception-engine/mcp-server"],
      "env": {
        "INCEPTION_MODE": "IDEATE"
      }
    }
  }
}
```

Save the file.

> **Important:** If the file already has other MCP servers configured, add the `inception-engine` entry inside the existing `mcpServers` object — don't replace the whole file.

### Restart Claude Desktop

Close Claude Desktop completely and reopen it. The MCP connection will initialize automatically.

---

## Step 5: Boot the Agent System

Once Claude Desktop is connected via MCP:

1. Open a new conversation in Claude Desktop
2. Open the file `prompts/system-prompt.md` from your inception-engine folder
3. Copy all the text
4. Paste it into Claude Desktop as your first message
5. Press Enter

Claude will respond as AVERI (the Strategic Trinity), confirming the 15-agent system is active.

### Your First Task

Try telling Claude:

```
Build me a personal portfolio website with a hero section, about page, and contact form.
```

AVERI will activate the right agents and start building.

---

## Adding Browser Control

For COMET (the browser automation agent) to work with Claude Desktop, you need a browser MCP server.

### Install Playwright MCP

1. Open your terminal
2. Run:
```
npm install -g @anthropic-ai/mcp-playwright
```

3. Add it to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "npx",
      "args": ["-y", "@inception-engine/mcp-server"],
      "env": {
        "INCEPTION_MODE": "IDEATE"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright"]
    }
  }
}
```

4. Restart Claude Desktop

Now COMET can open browser windows, navigate to sites, and perform web tasks directly from Claude Desktop.

See [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md) for full browser documentation.

---

## Tips and Troubleshooting

### Claude Desktop doesn't show MCP tools
- Make sure the config file is in the right location
- Make sure the JSON is valid (no missing commas or brackets)
- Restart Claude Desktop after any config changes
- Check that Node.js is installed (`node --version` in terminal)

### "npx not found" error
- Restart your computer after installing Node.js
- On Mac, try closing and reopening Terminal
- Make sure you installed the LTS version from nodejs.org

### Claude doesn't respond as AVERI
- Make sure you pasted the FULL system prompt from `prompts/system-prompt.md`
- It must be the first message in the conversation
- Start a new conversation and try again

### MCP connection keeps dropping
- Check your internet connection
- Restart Claude Desktop
- Make sure no firewall is blocking the connection

### I don't have a Claude Pro subscription
- The free tier will work but has limited messages per day
- For heavy use, Claude Pro is recommended
- You can also use the system prompt directly in [claude.ai](https://claude.ai) without MCP (you just won't get tool access)

### How do I update?

The MCP server updates automatically via `npx` (it always pulls the latest version). To update the prompt files:
- If you used ZIP: download a fresh ZIP from GitHub
- If you used Git: run `git pull origin main` in your inception-engine folder

---

## What's Next?

Once you're set up, explore:

- Give AVERI a project and watch it plan, build, and validate
- Try switching modes: "Switch to PLAN mode" or "Enter SHIP mode"
- Ask COMET to research something online
- Ask AURORA for design direction on your project

---

## Related Documents

- [GETTING_STARTED.md](./GETTING_STARTED.md) — Start here if you're brand new
- [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md) — Full browser automation guide
- [IDE_ANTIGRAVITY.md](./IDE_ANTIGRAVITY.md) — IDE setup guide
- [AGENTS.md](./AGENTS.md) — Full agent roster
- [MCP_GUIDE.md](./MCP_GUIDE.md) — Advanced MCP configuration

---

*CLAUDE_MCP.md — Inception Engine Light Edition*
*Part of the WholeTroutMedia Inception Engine system*
