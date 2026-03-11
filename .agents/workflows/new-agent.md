---
description: Add a new agent to the Creative Liberation Engine â€” hive assignment, identity brief, flow creation, roster registration, telemetry hookup, dispatch registration
---

# /new-agent Workflow â€” v5 Standard

> **RULE**: Every new agent MUST complete all steps. No agent is "active" unless it is in:
>
> 1. `.agents/agents/<name>.md` â€” identity brief
> 2. `packages/genkit/src/flows/<name>.ts` â€” Genkit flow (or as `status: 'planned'`)
> 3. `packages/genkit/src/flows/index.ts` â€” AGENT_ROSTER entry + export
> 4. `brainchild-v4/CORE_FOUNDATION/agents/.agent-status.json` â€” canonical JSON registry
> 5. `brainchild-v4/creative_liberation_engine/ui/src/data/agentData.ts` â€” v5 UI registry
>
> Agents with `status: 'planned'` complete steps 0, 1, 3, 4, 5 only â€” no flow required yet.
> All `status: 'active'` agents MUST have steps 0-7 complete.

## Trigger

- `/new-agent <NAME> <HIVE> <ROLE>` â€” add a new agent
- Or: "create agent X" / "add X to the engine"

---

## Step 0 â€” Write Identity Brief (MANDATORY FIRST)

Create `.agents/agents/<name-lowercase>.md`:

```markdown
# <NAME> â€” Identity Brief
**Hive:** <HIVE> | **Leader:** <HIVE_LEADER> | **Mode:** build/validate/all
**Status:** active/planned | **Model:** gemini-2.0-flash / gemini-2.5-pro / local

## What I Own
<One sentence â€” primary responsibility>

## What I Never Touch
<Explicit out-of-scope â€” prevents role bleed>

## How I Activate
<Trigger phrases, conditions, who calls me>

## Who I Report To
<Hive leader + any escalation path>

## Who I Call
<Other agents I invoke regularly>
```

> This card is what Justin reads. It replaces the personal introduction ceremony. Keep it to 60 seconds read time.

---

## Step 1 â€” Assign Hive

Choose from the canonical hive list:

| Hive | Purpose | Leader | Key Agents |
|------|---------|--------|-----------|
| `CORTEX` | Strategic leadership | STRATA | STRATA, LOGD, PRISM |
| `LUMIND` | Design, frontend, backend | Aurora | LUMIND, BOLT, NAVD, ALFRED |
| `GENMEDIA` | Creative & media execution | CREATIVE_DIRECTOR | VFX, BLENDER, HYPE_REEL |
| `VAULT` | Knowledge & documentation | VAULT | ARCH, CODEX, ECHO |
| `LEX` | Governance & compliance | LEX | LEX, NORTHSTAR, CIPHER |
| `MUXD` | Ops, comms, infrastructure | MUXD | RELAYD, FORGE, BEACON, PRISM, FLUX, ARCHAEON |
| `VALIDATOR` / `NORTHSTAR` | QA & correctness | NORTHSTAR | WATCHD, ARCHON, PROOF, HARBOR, SPECTRE |
| `BROADCAST` | Media & live ops | MAPD | CONTROL_ROOM, SHOWRUNNER, HERALD, TEMPO |
| `LORA` | Enhancement layers (no autonomy) | STRATA | VISION, SYNTAX, SIFT, AUDIO, SPATIAL |
| `OMNIMEDIA` | God-node media orchestration | OMNIMEDIA | OMNIMEDIA |
| `NEW_HIVE` | New functional domain | â€” | Requires STRATA + LOGD approval |

---

## Step 2 â€” Create the Flow File

Create `packages/genkit/src/flows/<agent-name-lowercase>.ts`:

```typescript
import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

const inputSchema = z.object({
    task: z.string().describe('The task for <AGENT_NAME> to perform'),
    context: z.string().optional(),
});

const outputSchema = z.object({
    result: z.string(),
    agentName: z.literal('<AGENT_NAME>'),
    timestamp: z.string(),
});

export const <AGENT_NAME>Flow = ai.defineFlow(
    { name: '<AGENT_NAME>', inputSchema, outputSchema },
    async (input) => {
        recordAgentCall('<AGENT_NAME>');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: `You are <AGENT_NAME>, <ROLE_DESCRIPTION>.
Hive: <HIVE> | Constitutional: Article VIII â€” named, hived, accountable.

What you own: <PRIMARY_RESPONSIBILITY>
What you never touch: <OUT_OF_SCOPE>

Task: ${input.task}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('<AGENT_NAME>', Date.now() - startMs);
        return { result: text, agentName: '<AGENT_NAME>' as const, timestamp: new Date().toISOString() };
    }
);
```

---

## Step 3 â€” Register in index.ts

In `packages/genkit/src/flows/index.ts`:

```typescript
// Add the export (in the appropriate hive section)
export { <AGENT_NAME>Flow } from './<agent-filename>.js';

// Add to AGENT_ROSTER
{ name: '<NAME>', hive: '<HIVE>', role: '<ROLE>', flow: '<NAME>', model: '<MODEL>', status: 'active' as AgentStatus },
```

Update the header comment total count.

---

## Step 4 â€” Update .agent-status.json

In `brainchild-v4/CORE_FOUNDATION/agents/.agent-status.json`:

Add to the appropriate hive block:

```json
"<NAME>": {
    "status": "active",
    "mode": "build",
    "type": "builder",
    "hive": "<HIVE>",
    "function": "<ROLE_DESCRIPTION>"
}
```

---

## Step 5 â€” Update agentData.ts (v5 UI Registry)

In `brainchild-v4/creative_liberation_engine/ui/src/data/agentData.ts`:

```typescript
{ id: '<name_lowercase>', category: 'builder', name: '<NAME>', hive: '<HIVE>', mode: 'build', status: 'active', capabilities: ['<cap1>', '<cap2>'], description: '<ROLE>' },
```

---

## Step 6 â€” Register Dispatch (Live Mesh)

```powershell
# Register on dispatch server
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:5050/api/agents" `
  -ContentType "application/json" `
  -Body '{"name":"<NAME>","hive":"<HIVE>","role":"<ROLE>","status":"active"}'
```

---

## Step 7 â€” Wire Telemetry (MANDATORY)

`recordAgentCall('<AGENT_NAME>')` at START of flow body.
`recordAgentCall('<AGENT_NAME>', Date.now() - startMs)` at END.

Verifies in:

- `GET http://127.0.0.1:4100/agents` â€” live telemetry
- Console â†’ Agent Roster panel â†’ last-seen timestamps

---

## Step 8 â€” RAM CREW Gate (Quality Check)

Before marking `status: 'active'`:

- [ ] TypeScript: `cd packages/genkit && npx tsc --noEmit` â€” 0 errors
- [ ] Identity brief written and readable in < 60 seconds
- [ ] SCRIBE write: record agent creation to long-term memory
- [ ] Article VIII compliance: agent is named, hived, and accountable in flow prompt

---

## Step 9 â€” SCRIBE Memory Write

Write a brief memory entry via SCRIBE:

```
Agent <NAME> formalized. Hive: <HIVE>. Role: <ROLE>. Flow: <FILENAME>.ts. Date: <DATE>.
```

---

## Quick Reference

Run to verify total count after adding:

```powershell
(Get-Content packages/genkit/src/flows/index.ts | Where-Object { $_ -match "name: '" }).Count
```
