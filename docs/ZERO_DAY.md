# Zero Day Execution â€” Deployment & Validation

**Definition:** A person who has never heard of Creative Liberation Engine can use the thing **right now**, from their phone, without any setup.

---

## Rules (non-negotiable)

| Violation | Result |
|-----------|--------|
| Requires user to be on a specific network | **Not shipped** |
| API calls use local IP (192.168.x.x) in client code | **Not shipped** |
| nginx / static hosting not applied | **Not shipped** |
| Only works on the build machine | **Not shipped** |

**Infrastructure gap:** NAS SMB mounted â‰  nginx serving files. Local IP in JS = unreachable from 5G. `git push` = source control, not deployment.

---

## Deployment checklist (before "live")

- [ ] **Static app** â†’ Firebase Hosting OR confirmed nginx route (`curl` succeeds from external)
- [ ] **All API URLs in JS** â†’ public URLs only; no 192.168.x.x in production build
- [ ] **Verified from 5G / outside LAN** before notifying user

---

## Public infrastructure (as of March 2026)

| Service | Internal (NAS/dev) | External (Zero Day) |
|---------|--------------------|----------------------|
| **Genkit** | 127.0.0.1:4100 | Cloud Run `cle` us-central1 â€” `--allow-unauthenticated` |
| **Dispatch** | 127.0.0.1:5050 | Cloudflare Tunnel or public proxy (TBD) |
| **AVERI Mobile** | NAS SMB + internal | Firebase Hosting `cle-mobile.web.app` |
| **Zero Day intake** | localhost:9000 / NAS | Cloud Run or same Genkit public URL |

---

## Client app env vars (production builds)

Every **client** (browser, PWA, extension) must receive API base URLs via environment at build time. No hardcoded 192.168 in source that gets bundled.

| App | Env vars | Purpose |
|-----|----------|---------|
| **Console** (Vite) | `VITE_GENKIT_URL`, `VITE_GATEWAY_URL`, `VITE_CAMPAIGN_URL` | Genkit, gateway, campaign API |
| **Threshold** (Vite) | `VITE_DISPATCH_URL` | Dispatch SSE + API |
| **Inception Agent Extension** | `VITE_DISPATCH_URL` (build) or storage | Dispatch API; manifest host_permissions must include public URL |
| **Zero Day UI** (Next/Node) | `NEXT_PUBLIC_GENKIT_URL` | Genkit generate/intake |
| **the creator / AVERI Mobile** | `NEXT_PUBLIC_ZERO_DAY_URL` or Genkit public URL | Intake + chat |

**Example prod build (Console):**
```bash
VITE_GENKIT_URL=https://cle-xxx.run.app \
VITE_GATEWAY_URL=https://gateway.wholetrout.media \
VITE_CAMPAIGN_URL=https://campaign.wholetrout.media \
pnpm run build
```

---

## Validation (run before release)

```powershell
# 1. No private IP in client dist (after build)
Get-ChildItem -Path apps/console/dist, packages/inception-agent-extension/dist* -Recurse -File -ErrorAction SilentlyContinue |
  Select-String -Pattern "192\.168" | ForEach-Object { Write-Error "FAIL: $_" }; if (-not $?) { exit 1 }

# 2. TypeScript
pnpm exec tsc --noEmit

# 3. Full audit list
# See .agents/artifacts/ZERO_DAY_AUDIT.md
```

---

## CafÃ© workflow (target state)

1. User opens AVERI on phone from **public URL**
2. Taps "Record Session" â†’ ambient audio
3. AVERI transcribes + live-summarizes (public Genkit)
4. On close â†’ IDEATE + PLAN flows
5. SHIP agents execute
6. Validation link sent; approval â†’ client receives

**Missing to complete:** Public Genkit URL confirmed, notification (Resend), session transcript storage path.

---

*See also: AGENTS.md Â§ ZERO DAY EXECUTION DOCTRINE, .agents/artifacts/ZERO_DAY_AUDIT.md*
