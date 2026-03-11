# Creative Liberation Engine Mobile Integration

> iPhone 17 + iPad Pro -> GENESIS v5.0 Hyper Access

## Architecture

```
iPhone 17 / iPad Pro
  |
  |-- Safari PWA (NEXUS Console)
  |     standalone mode, offline cache, push notifications
  |     Add to Home Screen -> full app experience
  |
  |-- iOS Shortcuts -> Mobile Bridge API (port 3090)
  |     "Hey Siri, dispatch task to COMET"
  |     "Hey Siri, agent status"
  |     "Hey Siri, system summary"
  |
  |-- Ntfy Push Notifications
  |     real-time agent alerts, build status, errors
  |     subscribe to topic: creative-liberation-engine
  |
  |-- Widgets (via Scriptable app)
  |     agent status grid, active task count
  |     refreshes from /mobile/agents endpoint
  |
  |-- Live Activities (via SSE stream)
  |     /mobile/stream endpoint
  |     real-time dispatch + agent events
  |
  NAS (127.0.0.1)
    |-- Gitea (:3000)
    |-- Gateway (nginx -> all services)
    |-- Mobile Bridge (:3090)
    |-- Ntfy (:8090)
    |-- Dispatch (:5050)
    |-- All agent services
```

## B: PWA Setup (NEXUS Console as iOS App)

### Files Added
- `apps/console/public/manifest.json` - PWA manifest with shortcuts
- `apps/console/public/sw.js` - Service worker (offline + push)

### index.html Updates Needed
Add these lines to `<head>` in `apps/console/index.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="IE" />
<meta name="theme-color" content="#6366f1" />
<link rel="apple-touch-icon" href="/icons/ie-192.png" />
```

### Service Worker Registration
Add to `apps/console/src/main.tsx`:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Install on iPhone/iPad
1. Open Safari on iPhone 17 or iPad Pro
2. Navigate to `http://127.0.0.1:5173` (dev) or the deployed URL
3. Tap Share button -> "Add to Home Screen"
4. App launches in standalone mode (no Safari chrome)

## C: iOS Shortcuts Integration

### Mobile Bridge API
Service: `services/mobile-bridge/src/index.ts` (port 3090)

| Endpoint | Method | Purpose | Shortcut Use |
|----------|--------|---------|--------------|
| `/mobile/health` | GET | Connectivity check | Verify IE is online |
| `/mobile/agents` | GET | All agent statuses | Widget data |
| `/mobile/handoff` | GET | Current HANDOFF | Session context |
| `/mobile/dispatch` | POST | Send task to agent | Voice dispatch |
| `/mobile/stream` | GET | SSE live stream | Live Activities |
| `/mobile/notify` | POST | Trigger push | Alert self |
| `/mobile/summary` | GET | System summary | Siri response |

### Shortcut: "IE Status"
```
1. URL: http://127.0.0.1:3090/mobile/summary
2. Get Contents of URL (GET)
3. Get Dictionary Value for "summary"
4. Show Result
```

### Shortcut: "Dispatch Task"
```
1. Ask for Input ("What task?")
2. Ask for Input ("Which agent?" - default SWITCHBOARD)
3. URL: http://127.0.0.1:3090/mobile/dispatch
4. Get Contents of URL (POST)
   Body: {"task": [input1], "agent": [input2]}
5. Show Result: "Task dispatched"
```

### Shortcut: "Agent Grid"
```
1. URL: http://127.0.0.1:3090/mobile/agents
2. Get Contents of URL (GET)
3. Get Dictionary Value for "agents"
4. Repeat with Each
5. Show: [name] - [status]
```

## D: Push Notifications (Ntfy)

### Docker Compose Addition
Add to your docker-compose.yml:

```yaml
ntfy:
  image: binwiederhier/ntfy
  container_name: ie-ntfy
  command: serve
  ports:
    - "8090:80"
  volumes:
    - ntfy-cache:/var/cache/ntfy
    - ntfy-etc:/etc/ntfy
  restart: unless-stopped
```

### iPhone/iPad Setup
1. Install Ntfy app from App Store
2. Open Ntfy -> Subscribe to topic
3. Server URL: `http://127.0.0.1:8090`
4. Topic: `creative-liberation-engine`
5. Notifications arrive instantly on all devices

### Gitea Webhook -> Ntfy
Add webhook in Gitea repo settings:
- URL: `http://ntfy:80/creative-liberation-engine`
- Content Type: application/json
- Events: Push, Pull Request, Issues

### Agent Activity -> Ntfy
The mobile-bridge `/mobile/notify` endpoint proxies to Ntfy.
Any agent can trigger a push by POSTing to the bridge.

## Beyond: Advanced iOS Integration

### Scriptable Widget (Agent Status Grid)
Install Scriptable app, create new script:

```javascript
const url = 'http://127.0.0.1:3090/mobile/agents';
const req = new Request(url);
const data = await req.loadJSON();

const widget = new ListWidget();
widget.backgroundColor = new Color('#0a0a0f');

const title = widget.addText('IE GENESIS v5.0');
title.textColor = new Color('#6366f1');
title.font = Font.boldSystemFont(14);

widget.addSpacer(4);

const count = widget.addText(`${data.total} agents online`);
count.textColor = Color.white();
count.font = Font.systemFont(12);

widget.addSpacer(4);

for (const agent of data.agents.slice(0, 6)) {
  const row = widget.addText(`${agent.name}: ${agent.status}`);
  row.textColor = agent.status === 'active'
    ? new Color('#22c55e') : new Color('#ef4444');
  row.font = Font.monospacedSystemFont(10);
}

Script.setWidget(widget);
```

### Gateway nginx Addition
Add to `gateway/nginx.conf`:

```nginx
# --- Mobile Bridge (/mobile/*) ---
location /mobile/ {
    proxy_pass http://mobile-bridge:3090/mobile/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 3600s;  # SSE long-poll
}
```

### Docker Service
Add to docker-compose.yml:

```yaml
mobile-bridge:
  build:
    context: .
    dockerfile: docker/node-service.Dockerfile
  container_name: ie-mobile-bridge
  working_dir: /app/services/mobile-bridge
  command: npx tsx src/index.ts
  ports:
    - "3090:3090"
  volumes:
    - ./.averi:/app/.averi:ro
    - ./HANDOFF.md:/app/HANDOFF.md:ro
  environment:
    - MOBILE_BRIDGE_PORT=3090
    - DISPATCH_URL=http://dispatch:5050
    - NTFY_URL=http://ntfy:80
    - NTFY_TOPIC=creative-liberation-engine
  depends_on:
    - dispatch
    - ntfy
  restart: unless-stopped
```

## Activation Checklist

- [ ] Generate PWA icons (192x192 + 512x512) in `apps/console/public/icons/`
- [ ] Update `apps/console/index.html` with PWA meta tags
- [ ] Register service worker in `main.tsx`
- [ ] Add ntfy + mobile-bridge to docker-compose.yml
- [ ] Add mobile-bridge upstream + location to gateway/nginx.conf
- [ ] `npm install express cors` in services/mobile-bridge
- [ ] Create package.json for services/mobile-bridge
- [ ] Deploy and test from iPhone/iPad
- [ ] Subscribe to Ntfy topic on both devices
- [ ] Create iOS Shortcuts (Status, Dispatch, Agents)
- [ ] Install Scriptable widget
- [ ] Add to Home Screen on both iPhone 17 and iPad Pro