# Inception Browser

> Sovereign agentic browser MCP server for the Creative Liberation Engine v5.  
> 40+ tools. Constitutional governance. VERA memory. Runs on your machine, your network.

---

## Overview

Inception Browser gives all AVERI agents full Playwright-native browser autonomy via the Model Context Protocol:

- **Navigation** â€” navigate, back, forward, refresh, scroll, smart waits  
- **Interaction** â€” click, type, fill, select, hover, drag, keyboard, upload  
- **Extraction** â€” DOM tree, text, screenshot, structured data, links, forms  
- **Intelligence** â€” vision analysis (Gemini Flash), hybrid DOM+Vision perception, action planning, natural language element finding  
- **Persistence** â€” SQLite session store, action history, pattern learning, VERA memory sync  
- **Governance** â€” 20 constitutional articles as executable rules, PII guard, domain allowlists, full audit log  
- **Multi-tab** â€” parallel tab management  
- **Network** â€” request interception, download, resource blocking  
- **Stealth** â€” fingerprint randomization, anti-detection init scripts  

---

## Creative Liberation Engine MCP Configuration

Add to your Creative Liberation Engine MCP settings JSON:

```json
{
  "mcpServers": {
    "inception-browser": {
      "command": "node",
      "args": [
        "C:/Creative-Liberation-Engine/packages/inception-browser/dist/server.js"
      ]
    }
  }
}
```

---

## Setup

```powershell
cd "C:\\Creative-Liberation-Engine\packages\inception-browser"

# Install dependencies
npm install

# Install Chromium browser
npm run install:browsers

# Build TypeScript
npm run build

# Run smoke tests
npm run smoke
```

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GOOGLE_AI_API_KEY` | Direct Gemini API fallback for vision if Genkit offline | â€” |
| `GEMINI_API_KEY` | Alias for above | â€” |
| `INCEPTION_PROXY` | Proxy URL for all browser sessions | â€” |

---

## Vision / Intelligence

Intelligence tools use **Gemini Flash** via a 3-tier fallback:

1. NAS Genkit server at `http://127.0.0.1:4100`
2. Local Genkit at `http://localhost:4100`
3. Direct Gemini API via `GOOGLE_AI_API_KEY`

Run `/start-engine` in Creative Liberation Engine to boot the Genkit server locally.

---

## Session Persistence

Sessions saved to `~/.inception-browser/sessions/<name>.json`  
SQLite database at `~/.inception-browser/memory.db`

---

## Tool Reference

### Navigation (6)

`browser_navigate` Â· `browser_back` Â· `browser_forward` Â· `browser_refresh` Â· `browser_scroll` Â· `browser_wait_for`

### Interaction (8)

`browser_click` Â· `browser_type` Â· `browser_fill` Â· `browser_select` Â· `browser_hover` Â· `browser_drag` Â· `browser_keyboard` Â· `browser_upload`

### Extraction (6)

`browser_screenshot` Â· `browser_dom_tree` Â· `browser_text` Â· `browser_extract_data` Â· `browser_get_links` Â· `browser_get_forms`

### Evaluate (1)

`browser_evaluate_js`

### Intelligence (5)

`browser_vision_analyze` Â· `browser_hybrid_perceive` Â· `browser_plan_actions` Â· `browser_find_element` Â· `browser_learn_pattern`

### Sessions (2)

`browser_save_session` Â· `browser_restore_session`

### Governance (4)

`browser_check_governance` Â· `browser_audit_log` Â· `browser_set_domain_policy` Â· `browser_pii_scan`

### Network (5)

`browser_intercept_requests` Â· `browser_download` Â· `browser_har_export` Â· `browser_block_resources` Â· `browser_set_proxy`

### Tabs (4)

`browser_new_tab` Â· `browser_switch_tab` Â· `browser_close_tab` Â· `browser_list_tabs`

### Files (1)

`browser_upload_file`

### Forms (1)

`browser_smart_form_fill`

---

## Architecture

```
src/
â”œâ”€â”€ server.ts                  # MCP stdio entry point
â”œâ”€â”€ browser/
â”‚   â”œâ”€â”€ engine.ts              # Playwright browser pool manager
â”‚   â”œâ”€â”€ session.ts             # Persistent session manager
â”‚   â””â”€â”€ stealth.ts             # Anti-detection patches
â”œâ”€â”€ tools/                     # MCP tool handlers (one file per group)
â”œâ”€â”€ intelligence/              # DOM analyzer, vision, hybrid perception, planner
â”œâ”€â”€ memory/                    # SQLite store, pattern learner, VERA bridge
â”œâ”€â”€ governance/                # Constitutional rules engine
â””â”€â”€ orchestration/             # Parallel browser pool
config/
â”œâ”€â”€ governance-rules.json      # Constitutional browser articles
â””â”€â”€ site-patterns.json         # Learned interaction patterns (runtime-populated)
```

---

## Constitutional Governance

Every action passes through `constitutional.ts` before execution.  
Rules implement Articles I, IV, IX, XX (sovereignty, quality, no-MVP, zero-day GTM).  
Add custom domain blocks via `browser_set_domain_policy`.  
All audited actions logged to `~/.inception-browser/memory.db`.

---

*Built by IRIS for the Creative Liberation Engine v5 GENESIS ecosystem.*  
*WholeTrout Media â€” Article IX: Never ship an MVP. Ship complete or don't ship.*
