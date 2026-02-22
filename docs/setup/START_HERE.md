# Start Here — Complete Beginner's Guide

> **Never used GitHub, Python, or an API before? This is your page.**
> Skip to [I already know this stuff](#i-already-know-this-stuff) if you're experienced.

This guide walks you through everything from scratch — downloading the tools, setting up your computer, and getting Inception Engine running. Every step has a download link and plain-English instructions.

---

## What Is This, Exactly?

Inception Engine is a system of AI agents — specialized assistants that each have a job — that work together to help you build, plan, design, and create things.

You talk to the system like you'd talk to a team. The agents figure out who should handle what.

To use it, you need:
1. A way to get the code onto your computer (Git)
2. A way to run it (Python)
3. An API key from an AI service (this is how the agents "think")

Don't worry — all three are free to download and each takes about 5 minutes.

---

## Step 1 — Get Git (Download the Code)

Git is how developers share and download code. Think of it like a super-powered download manager for software projects.

### Download Git

**Windows:**
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. The download starts automatically — run the installer
3. Click "Next" through all the steps (defaults are fine)
4. When done, open the **Start Menu**, search for **Git Bash**, and open it

**Mac:**
1. Open the **Terminal** app (search for it with Spotlight: press `Cmd + Space`, type "Terminal")
2. Type this and press Enter:
   ```
   xcode-select --install
   ```
3. A window will pop up — click "Install"
4. Git is now installed

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install git
```

### Verify Git is installed
Open a terminal and type:
```bash
git --version
```
You should see something like `git version 2.40.0`. If you do, you're good.

---

## Step 2 — Get Python (Run the Code)

Python is the programming language Inception Engine runs on. You don't need to know how to code — you just need it installed.

### Download Python

**Windows:**
1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Click the big yellow **"Download Python 3.x.x"** button
3. Run the installer
4. **IMPORTANT:** On the first screen, check the box that says **"Add Python to PATH"** before clicking Install
5. Click "Install Now"

**Mac:**
1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Click the big yellow **"Download Python 3.x.x"** button
3. Run the `.pkg` installer and follow the prompts

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install python3 python3-pip
```

### Verify Python is installed
Open a terminal and type:
```bash
python --version
```
or on Mac/Linux:
```bash
python3 --version
```
You should see `Python 3.x.x`. You need version **3.9 or higher**.

---

## Step 3 — Download Inception Engine

Now that you have Git, you can download the code in one command.

1. Open your terminal (Git Bash on Windows, Terminal on Mac/Linux)
2. Navigate to where you want to save it. For example, your Desktop:

   **Windows (Git Bash):**
   ```bash
   cd ~/Desktop
   ```

   **Mac/Linux:**
   ```bash
   cd ~/Desktop
   ```

3. Download the repo:
   ```bash
   git clone https://github.com/WholeTroutMedia/inception-engine.git
   ```

4. Go into the folder:
   ```bash
   cd inception-engine
   ```

You now have the full Inception Engine on your computer.

---

## Step 4 — Install the Engine's Dependencies

Inception Engine uses some helper libraries. Install them with one command:

```bash
pip install -r requirements.txt
```

On Mac/Linux, you may need:
```bash
pip3 install -r requirements.txt
```

You'll see a lot of text scroll by — that's normal. Wait for it to finish.

---

## Step 5 — Get an API Key (Give the Agents a Brain)

An API key is like a password that lets Inception Engine connect to an AI service. The agents use this to think and respond.

You only need **one** key to start. Pick whichever service you prefer:

### Option A: OpenAI (GPT-4o) — Most Popular
1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Create a free account
3. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy the key — it looks like `sk-abc123...`
6. **Save it somewhere safe** — you won't be able to see it again

> You'll need to add a small amount of credit ($5–$10) to your OpenAI account to use the API. Typical usage costs a few cents per session.

### Option B: Anthropic (Claude) — Great for Reasoning
1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Create a free account
3. Go to **API Keys** in the sidebar
4. Click **"Create Key"**
5. Copy the key — it looks like `sk-ant-abc123...`

### Option C: Google Gemini — Free Tier Available
1. Go to [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API Key"** in the top left
4. Click **"Create API Key"**
5. Copy the key

### Option D: No Key Needed (Beginner-Friendly)
If you don't want to deal with API keys yet, see the [Gemini Web App method](./gemini-web-and-cli.md) or the [No-Code method](./no-code-automation.md) — those work directly in your browser with no setup.

---

## Step 6 — Configure Inception Engine

Now tell the engine which AI service to use.

1. In your terminal, make sure you're in the `inception-engine` folder
2. Copy the example config file:

   **Windows (Git Bash):**
   ```bash
   cp .env.example .env
   ```

   **Mac/Linux:**
   ```bash
   cp .env.example .env
   ```

3. Open the `.env` file in a text editor:

   **Windows:** Open File Explorer, go to your `inception-engine` folder, and look for a file called `.env`. Right-click → Open With → Notepad.

   **Mac:** In Finder, press `Cmd + Shift + .` to show hidden files, then open `.env` with TextEdit.

   > Can't find the file? Hidden files start with a dot (`.`) and are invisible by default. On Windows, in File Explorer go to View → Show → Hidden Items.

4. Edit the file to add your API key. Find the line for your provider and fill it in:

   **If you chose OpenAI:**
   ```
   OPENAI_API_KEY=sk-your-key-here
   LLM_PROVIDER=openai
   LLM_MODEL=gpt-4o
   ```

   **If you chose Anthropic:**
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   LLM_PROVIDER=anthropic
   LLM_MODEL=claude-3-5-sonnet-20241022
   ```

   **If you chose Gemini:**
   ```
   GEMINI_API_KEY=your-key-here
   LLM_PROVIDER=gemini
   LLM_MODEL=gemini-2.0-flash
   ```

5. Save the file.

---

## Step 7 — Boot AVERI

You're ready. Let's turn it on.

In your terminal (inside the `inception-engine` folder):

```bash
python -c "
from src.core.boot_system import BootSystem
boot = BootSystem()
session = boot.boot(
    package_name='Inception Engine (Light Edition)',
    show_agents=True,
    show_session_options=True
)
print(session)
"
```

On Mac/Linux use `python3` instead of `python`.

You should see a welcome message listing all available agents. That means it's working.

---

## What's a Terminal?

If the word "terminal" is unfamiliar:

- **Windows:** Press `Win + R`, type `cmd`, press Enter — or search for **Git Bash** if you installed it above
- **Mac:** Press `Cmd + Space`, type "Terminal", press Enter
- **Linux:** Press `Ctrl + Alt + T`

The terminal is just a text-based way to talk to your computer. You type a command, press Enter, and it does the thing.

---

## Troubleshooting

### "python is not recognized" or "command not found"
Python isn't in your PATH. Try:
- `python3` instead of `python`
- Reinstall Python and make sure to check **"Add Python to PATH"** on Windows

### "pip is not recognized"
Try `pip3` instead of `pip`. Or install pip:
```bash
python -m ensurepip --upgrade
```

### "git is not recognized"
Git isn't installed or not in your PATH. Go back to Step 1.

### Permission errors on Mac/Linux
Add `sudo` before the command:
```bash
sudo pip3 install -r requirements.txt
```

### API key errors
- Make sure there are no extra spaces in your `.env` file
- Make sure the `.env` file is in the `inception-engine` folder (not inside a subfolder)
- Make sure you saved the file after editing

### Can't find the `.env` file
Hidden files (starting with `.`) are invisible by default:
- **Windows:** In File Explorer, go to View → Show → Hidden Items
- **Mac:** Press `Cmd + Shift + .` in Finder

---

## I Already Know This Stuff

If you're already comfortable with Git, Python, and APIs — great. You can skip this guide entirely.

Jump straight to the setup guide for your preferred platform:

| Method | Guide |
|--------|-------|
| OpenAI / ChatGPT | [openai-chatgpt.md](./openai-chatgpt.md) |
| Anthropic Claude + MCP | [anthropic-claude-mcp.md](./anthropic-claude-mcp.md) |
| Google Gemini | [gemini-web-and-cli.md](./gemini-web-and-cli.md) |
| Perplexity + COMET | [perplexity-and-comet.md](./perplexity-and-comet.md) |
| IDE / Antigravity | [ide-and-antigravity.md](./ide-and-antigravity.md) |
| LLM Gateways + MCP | [llm-gateways-and-mcp.md](./llm-gateways-and-mcp.md) |
| No-Code Automation | [no-code-automation.md](./no-code-automation.md) |

---

## Still Stuck?

No shame in it. [Open an issue](https://github.com/WholeTroutMedia/inception-engine/issues) and describe exactly where you got stuck. Include:
- What operating system you're on (Windows, Mac, Linux)
- What command you ran
- What error message you got (copy and paste it)

We'll help you get unstuck and use your question to improve this guide for the next person.
