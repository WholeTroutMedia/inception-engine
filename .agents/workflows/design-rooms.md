---
description: trigger the Rooms.xyz digital storefront pipeline â€” WorldGen prompt â†’ voxel placement â†’ Lua Stripe commerce injection
---

// turbo-all

## Design Rooms Workflow

This workflow triggers the full autonomous Rooms.xyz Digital Storefront Pipeline.

### Overview

```
Prompt â†’ WorldGen API (Gemini parser) â†’ Queue â†’ nexus-bridge polls â†’
Playwright opens Rooms.xyz â†’ Voxels placed â†’ Lua Stripe hook injected
```

### Prerequisites

- `packages/zero-day` running at `http://127.0.0.1:9000`
- `services/nexus-bridge` running (polls queue every 3s)
- Genkit server running at `http://127.0.0.1:4100` (for Gemini WorldGen)
- Rooms.xyz account open in the nexus-bridge Playwright browser

---

### Step 1: Ensure zero-day API is running

```powershell
cd C:\\Creative-Liberation-Engine\packages\zero-day
npm run dev
```

### Step 2: Start nexus-bridge (opens Rooms.xyz in Playwright)

```powershell
cd C:\\Creative-Liberation-Engine\services\nexus-bridge
npx ts-node src/index.ts
```

### Step 3: Trigger a WorldGen build

POST a natural language prompt to generate a virtual storefront:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:9000/api/worldgen" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prompt": "a neon cyberpunk storefront with glowing blue walls and a checkout button", "stripeLink": "https://buy.stripe.com/your_link_here"}'
```

The Creative Liberation Engine will:

1. Send the prompt to Gemini to generate voxel coordinates + colors
2. Generate a Lua `onInteract()` script with your Stripe link
3. Queue the payload
4. nexus-bridge picks it up, enters edit mode in Rooms.xyz, places voxels, and injects the Lua commerce script

### Step 4: Verify queue status

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:9000/api/worldgen/queue/status"
```

---

### Troubleshooting

- **Gemini unavailable**: WorldGen falls back to seeded indigo geometry automatically
- **nexus-bridge not placing blocks**: Rooms.xyz UI may have changed â€” check Playwright selector targeting in `services/nexus-bridge/src/index.ts`
- **Stripe link not opening**: Verify `stripeLink` is a valid URL in your POST body
