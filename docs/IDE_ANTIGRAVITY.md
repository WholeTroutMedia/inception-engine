# IDE + Antigravity Setup Guide

This guide walks you through setting up Inception Engine inside a code editor (IDE) or Google Antigravity. This gives you the most powerful experience — your AI agents can see your files, edit code, run the browser, and ship production-ready work.

**No coding experience required.** We explain every step.

---

## Table of Contents

1. [What's an IDE?](#whats-an-ide)
2. [Choose Your Editor](#choose-your-editor)
3. [Option A: Google Antigravity](#option-a-google-antigravity-recommended)
4. [Option B: Cursor](#option-b-cursor)
5. [Option C: VS Code + Codeium](#option-c-vs-code--codeium)
6. [Option D: Windsurf](#option-d-windsurf)
7. [Loading Inception Engine](#loading-inception-engine)
8. [Activating the Agent System](#activating-the-agent-system)
9. [Browser Integration](#browser-integration)
10. [Your First Task](#your-first-task)
11. [Tips and Troubleshooting](#tips-and-troubleshooting)

---

## What's an IDE?

IDE stands for **Integrated Development Environment**. It's a text editor built for writing and managing code. Think of it like Microsoft Word, but for code — with extra features like color-coding, file management, and (most importantly for us) built-in AI assistants.

You don't need to know how to code to use one. Inception Engine uses the IDE as its workspace — the agents do the work.

---

## Choose Your Editor

| Editor | AI Built-in | Browser | Free | Best For |
|--------|------------|---------|------|----------|
| Google Antigravity | Yes | Yes (Chrome-based) | Yes | Full agentic experience |
| Cursor | Yes (Claude/GPT) | Via MCP | Free tier | AI-first coding |
| VS Code + Codeium | Plugin | Via extension | Yes | Familiar setup |
| Windsurf | Yes | Via MCP | Free tier | AI-assisted coding |

---

## Option A: Google Antigravity (Recommended)

Google Antigravity is an AI-enhanced workspace built on Chrome. It combines a code editor with a full browser, giving agents like COMET direct access to both your files and the web.

### Step 1: Get Google Antigravity

1. Visit [labs.google.com](https://labs.google.com)
2. Search for "Project Antigravity" or "Antigravity"
3. Click **Try it** and follow the installation steps
4. Open Antigravity once installed

### Step 2: Download Inception Engine

If you haven't already downloaded the files:

**Option 1: Download ZIP (Easiest)**
1. Go to [github.com/WholeTroutMedia/inception-engine](https://github.com/WholeTroutMedia/inception-engine)
2. Click the green **Code** button
3. Click **Download ZIP**
4. Unzip the folder somewhere you can find it (like your Desktop or Documents)

**Option 2: Clone with Git (If you have Git installed)**
```
git clone https://github.com/WholeTroutMedia/inception-engine.git
```

### Step 3: Import as Workspace

1. In Antigravity, click **File > Open Folder** (or **Import Workspace**)
2. Navigate to your `inception-engine` folder
3. Select it and click **Open**
4. You should see all the project files in the left sidebar

### Step 4: Activate the Agent System

1. Open the AI chat panel in Antigravity (usually on the right side or via a keyboard shortcut)
2. Copy the contents of `prompts/system-prompt.md` from your inception-engine folder
3. Paste it into the AI chat as your first message
4. The system will boot with all 15 agents available

### What Makes Antigravity Special

- **Built-in browser**: COMET can open tabs, navigate pages, fill forms, and extract data — all within the same workspace
- **File access**: Agents can read, create, and edit your project files directly
- **No extra setup**: Everything works out of the box
- **Chrome extensions**: You can install your normal Chrome extensions

---

## Option B: Cursor

Cursor is a code editor built specifically for AI-assisted development. It has Claude and GPT models built in.

### Step 1: Download Cursor

1. Go to [cursor.sh](https://cursor.sh)
2. Click **Download**
3. Install it like any other application
4. Open Cursor

### Step 2: Get Inception Engine Files

Same as Antigravity Step 2 above — download the ZIP or clone the repo.

### Step 3: Open the Project

1. In Cursor, click **File > Open Folder**
2. Select your `inception-engine` folder
3. Click **Open**

### Step 4: Set Up AI Model

1. Open Settings (Ctrl + , or Cmd + ,)
2. Navigate to AI/Model settings
3. Select your preferred model (Claude Sonnet recommended)
4. If prompted, sign in or add your API key

### Step 5: Load the System Prompt

1. Open the Cursor AI chat (Ctrl + L or Cmd + L)
2. Copy the contents of `prompts/system-prompt.md`
3. Paste it to boot the agent system

### Adding Browser Support

Cursor doesn't have a built-in browser, but you can add one:

1. Install a Playwright MCP server or Puppeteer MCP server
2. Configure it in Cursor's MCP settings
3. This lets COMET control a browser window from within Cursor

See [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md) for detailed browser setup instructions.

---

## Option C: VS Code + Codeium

VS Code is the most popular code editor in the world. Codeium adds free AI capabilities.

### Step 1: Download VS Code

1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Click **Download** for your operating system
3. Install and open VS Code

### Step 2: Install the Codeium Extension

1. In VS Code, click the Extensions icon in the left sidebar (it looks like four squares)
2. Search for **Codeium**
3. Click **Install**
4. Follow the prompts to create a free Codeium account

### Step 3: Get and Open Inception Engine

1. Download Inception Engine (ZIP or Git clone)
2. In VS Code, click **File > Open Folder**
3. Select the `inception-engine` folder

### Step 4: Load the System Prompt

1. Open the Codeium chat panel
2. Paste the contents of `prompts/system-prompt.md`
3. The agent system will boot

### Alternative: Use the Built-in Copilot

VS Code also has GitHub Copilot built in. If you have a Copilot subscription:
1. Enable GitHub Copilot in VS Code
2. Open the Copilot Chat panel
3. Paste the system prompt to boot agents

---

## Option D: Windsurf

Windsurf (by Codeium) is another AI-first code editor.

### Step 1: Download Windsurf

1. Go to [windsurf.ai](https://windsurf.ai)
2. Download and install
3. Open Windsurf

### Step 2: Open Inception Engine

1. Click **File > Open Folder**
2. Select your `inception-engine` folder

### Step 3: Boot the Agent System

1. Open the AI chat panel
2. Paste the contents of `prompts/system-prompt.md`
3. Start giving tasks

---

## Loading Inception Engine

Regardless of which editor you chose, here's what your workspace should look like:

```
inception-engine/
├── prompts/           ← System prompts and agent configurations
│   ├── system-prompt.md
│   └── agent-config.json
├── docs/              ← You are reading this right now
├── design-tokens/     ← Design language for consistent UI output
├── templates/         ← Starter templates for common projects
└── README.md          ← Project overview
```

The most important file is `prompts/system-prompt.md` — this is what activates the entire agent system.

---

## Activating the Agent System

Once you have Inception Engine open in your IDE:

### First Time Setup

1. Open the AI chat panel in your editor
2. Open the file `prompts/system-prompt.md`
3. Select all the text (Ctrl+A / Cmd+A)
4. Copy it (Ctrl+C / Cmd+C)
5. Paste it into the AI chat (Ctrl+V / Cmd+V)
6. Press Enter to send

The AI will respond as AVERI (the Strategic Trinity), confirming the system is booted with all 15 agents ready.

### What Happens When You Boot

- AVERI initializes as the command layer (ATHENA + VERA + IRIS)
- All 15 agents become available across 4 specialized hives
- The system enters INTEROPERABLE mode (all agents work as a unified team)
- You can now give any task and the right agents will handle it

### Giving Your First Command

Try something like:

```
Build me a landing page for a coffee shop called "Bean There" with a hero section, menu, and contact form.
```

AVERI will route this to the right agents:
- AURORA handles the design direction
- BOLT builds the frontend
- SCRIBE writes the copy
- CODEX manages any dependencies

---

## Browser Integration

If your IDE supports browser control (Antigravity has this built in), you unlock COMET's full capabilities:

- **Research**: "@COMET research the top 5 coffee shop websites for design inspiration"
- **Data extraction**: "@COMET extract the menu items from [url] and format them as JSON"
- **Testing**: "@COMET open our deployed site and check all links work"
- **Form testing**: "@COMET fill out our contact form with test data"
- **Screenshots**: "@COMET screenshot our landing page at desktop and mobile widths"

For full browser documentation, see [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md).

---

## Your First Task

Here's a step-by-step walkthrough of your first Inception Engine project:

### 1. Boot the System
Paste the system prompt into your AI chat.

### 2. Describe What You Want
Be as specific or as vague as you like. Examples:
- "Build me a personal portfolio website"
- "Create a React dashboard that shows weather data"
- "Design a mobile app for tracking workouts"

### 3. Let AVERI Plan
AVERI will enter PLAN mode and break your request into tasks. You'll see which agents are assigned to what.

### 4. Review and Approve
AVERI will present the plan. Say "ship it" or ask for changes.

### 5. Watch It Build
Agents will create files, write code, and generate assets. You'll see files appearing in your editor.

### 6. Validate
VERA (part of AVERI) automatically validates the output. You'll get a report on what was built and any issues.

### 7. Iterate
Not quite right? Just tell the agents what to change. They'll iterate until you're happy.

---

## Tips and Troubleshooting

### The AI says it doesn't know about Inception Engine
- Make sure you pasted the FULL system prompt from `prompts/system-prompt.md`
- The prompt must be the first message in the conversation
- If the chat has a character limit, check if a shorter boot sequence is available in `prompts/`

### Files aren't being created
- Some AI models can only suggest code, not create files directly
- In Cursor and Antigravity, agents can write files directly
- In VS Code, you may need to manually create files and paste the suggested code

### The AI keeps forgetting the agents
- Long conversations can cause context loss
- Start a new chat and re-paste the system prompt
- Break large projects into smaller conversations

### I'm getting rate limited
- Most AI services have usage limits on free tiers
- Wait a few minutes and try again
- Consider upgrading to a paid plan for heavy usage

### The browser integration isn't working
- Make sure your IDE supports MCP or has a built-in browser
- Check [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md) for setup steps
- Antigravity has the most seamless browser integration

### How do I update Inception Engine?
- If you downloaded the ZIP: download a new ZIP and replace your folder
- If you used Git:
  ```
  cd inception-engine
  git pull origin main
  ```
- Re-paste the system prompt in your next chat to use the updated agents

---

## Related Documents

- [GETTING_STARTED.md](./GETTING_STARTED.md) — Start here if you're brand new
- [BROWSER_SYSTEM.md](./BROWSER_SYSTEM.md) — Full browser automation guide
- [CLAUDE_MCP.md](./CLAUDE_MCP.md) — Claude Desktop + MCP setup
- [AGENTS.md](./AGENTS.md) — Full agent roster and capabilities
- [FOUR_MODES.md](./FOUR_MODES.md) — Operational modes explained

---

*IDE_ANTIGRAVITY.md — Inception Engine Light Edition*
*Part of the WholeTroutMedia Inception Engine system*
