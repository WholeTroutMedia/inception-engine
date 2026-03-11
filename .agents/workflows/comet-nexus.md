---
description: Bridge the Creative Liberation Engine dispatch board telemetry directly into actual Rooms.xyz 3D environments.
---

# /comet-nexus

Activates the NEXUS Bridge â€” a Playwright daemon that physically logs into Rooms.xyz on the workstation, connects to the configured Creative Liberation Engine Room, and pipes dispatch board telemetry straight into the environment.

## When to Use

- When visualizing the dispatch board via `rooms.xyz`
- Running a live demo of the Creative Liberation Engine command center
- Integrating physical spatial cues for engine load, new tasks, or agent activity

## Steps

// turbo-all

1. **Start the NAVD connection**

   ```powershell
   cd "C:\\Creative-Liberation-Engine\services\nexus-bridge"
   pnpm run dev
   ```

2. **Rooms API Constraints**
   - The script uses `page.evaluate()` and keyboard emulation to pipe `http://127.0.0.1:5050/api/status` data into the active Rooms window.
   - The user must manually log in and navigate to their specific room if they don't want to operate anonymously, but `headless: false` allows this seamlessly.

## Output

The browser window will stay open and the terminal will log incoming/outgoing dispatch events as they are piped into the virtual 3D space.
