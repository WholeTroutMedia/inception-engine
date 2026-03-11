---
description: Capture live browser tab context from NAVD or installed extensions and feed into IDEATE mode
---

# /browser-ideate Workflow

Activate the browser mesh to pull real tab context into IDEATE mode.

**Priority chain (highest to lowest):**

1. **NAVD** â€” Playwright-native sovereign browser (always first)
2. **Browser Extensions** â€” Chrome, Firefox, or Edge with Inception Agent installed
3. **Playwright Subagent** â€” headless fallback if no live browser agent is reachable

---

## Step 1 â€” Check dispatch for live browser agents

Query the dispatch server for all active browser agents. This is a single HTTP call; no UI needed.

```bash
curl http://127.0.0.1:5050/api/agents?type=browser-extension
curl http://127.0.0.1:5050/api/agents?type=NAVD
```

Parse the responses to build a ranked agent list:

- Any agent with `status: active` and `tool: NAVD` â†’ goes to slot 0
- Any agent with `status: active` and `tool: browser-extension` â†’ appended in order of `all_tabs_count` (most tabs first)
- Playright headless agents (`tool: playwright-headless`) are kept as tail fallback

If the ranked list is empty â†’ skip to Step 5 (Playwright fallback).

---

## Step 2 â€” Pull tab context from NAVD (if available)

If a NAVD agent is in the ranked list, call:

```bash
curl http://127.0.0.1:5050/api/agents/{comet_agent_id}/tabs
```

Response shape:

```json
{
  "agent_id": "comet-abc123",
  "browser_family": "chromium",
  "status": "active",
  "tab_count": 12,
  "tabs": [
    { "url": "https://example.com", "title": "Example" },
    ...
  ]
}
```

Use the tabs array directly â€” no separate browser subagent needed.

---

## Step 3 â€” Augment with extension tabs (if NAVD is absent or user wants full mesh)

For each active `browser-extension` agent (Chrome / Firefox / Edge), call:

```bash
curl http://127.0.0.1:5050/api/agents/{agent_id}/tabs
```

Merge all tab lists, deduplicating by URL. Label each tab with its source browser:

- `[NAVD]` â€” from NAVD sovereign browser
- `[Chrome]` / `[Firefox]` / `[Edge]` â€” from extension agent field `browser_family`

---

## Step 4 â€” Synthesize the creative brief (same as before)

With the merged tab list, run the IDEATE classification pass:

**a) URL Classification**
Bucket each tab:

- Editorial / research (news, docs, Wikipedia)
- Creative reference (Dribbble, Behance, Pinterest, Instagram, YouTube)  
- Commerce / product (shopping, pricing, brand pages)
- Tools / dev (GitHub, Figma, StackOverflow)
- Social / community (Reddit, HN, Discord)
- Other

**b) Thematic Analysis**
Look across all tabs for:

- Recurring topics, keywords, visual styles
- Temporal signals (is the user deep in research? Comparison shopping? Ideating UI?)
- Cross-domain connections

**c) Generate Creative Brief**
Synthesize findings into a structured brief:

```text

SOURCES: [N tabs from NAVD] + [M tabs from Chrome extension] + ...

THEMATIC CLUSTERS:
  [CLUSTER 1]: [label] â€” tabs: [url1], [url2]
  [CLUSTER 2]: ...

CREATIVE SIGNAL:
  [Inferred intent â€” what the user seems to be building or exploring]

IDEATE SEEDS:
  1. [Creative direction 1]
  2. [Creative direction 2]
  3. [Creative direction 3]
```

---

## Step 5 â€” Playwright fallback (if no live agents found)

Only if Steps 1-3 yield zero tabs, spin up a Playwright subagent:

> Invoke a browser subagent with task: "Get the titles and URLs of all open tabs in the user's default browser. Return them as a JSON array."

This is slower and only reads a snapshot. It does NOT have real-time tab mesh access.

---

## Step 6 â€” Prime IDEATE mode

Pass the creative brief to IDEATE via the VAULT/STRATA flow:

```text
VAULT: [brief above]
STRATA: Activate IDEATE mode. Source: browser-mesh.
```

IDEATE mode then expands the seeds into full creative directions, optionally calling Stitch MCP for visual mockups.

---

## Notes

- The tab manifest in dispatch is automatically refreshed on every extension heartbeat (every 30s). No manual trigger needed.
- NAVD always gets priority because it's the sovereign Playwright-native browser â€” it has programmatic control, not just tab reading.
- If you want to **force** Playwright + Chromium for a specific custom browser task, skip Step 1 and go directly to Step 5.
- Extensions filter out internal browser pages (`chrome://`, `moz-extension://`) automatically before uploading the tab manifest.
