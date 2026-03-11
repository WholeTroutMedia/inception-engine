# Architecture Decision: Tunneling Strategy (Cloudflare vs. Tailscale)

## Context

The Creative Liberation Engine (Gen 5) operates on a "sovereign-first" architecture, primarily hosted on a local NAS (`127.0.0.1`). However, the system requires both:

1. **Internal access** for developers and administrators to manage the 36-agent hive, view the DIRA Dashboard, and monitor telemetry.
2. **External access** for clients to view their galleries, prospects to fill out the Zero-Day Intake form, and webhook providers (like Stripe or Slack) to trigger internal APIs.

Exposing the entire NAS to the internet via port forwarding is a major security risk, especially for a system with deep system access and proprietary AI workflows.

## Decision

We will pass on a single-provider approach and instead deploy a **Hybrid Tunneling Strategy** utilizing both Tailscale and Cloudflare Tunnels, assigned strictly by the audience of the service.

### 1. Tailscale (Internal Mesh VPN)

**Use Case:** All internal admin and development interfaces.
**Services:**

- Inception Console (`:5173`)
- Portainer / Docker Management
- Gitea / Forgejo (`:3000`)
- Genkit UI & Internal APIs (`:4000`)
- Grafana / Telemetry Dashboards

**Why:** Tailscale provides a zero-trust mesh VPN. It requires explicit device authentication and does not expose endpoints to the public internet, ensuring that internal sovereign data and developer tools remain completely dark to the outside world.

### 2. Cloudflare Tunnels (Public Ingress)

**Use Case:** All public-facing "Go-To-Market" (GTM) services and webhook listeners.
**Services:**

- The Operator Photography / Client Galleries
- Zero-Day Intake Form
- Inception Landing Pages
- Webhook endpoints (Stripe, Slack, External Integrations)

**Why:** Cloudflare Tunnels (`cloudflared`) securely connect the NAS to Cloudflare's edge without opening inbound ports on the local router. This provides DDoS protection, SSL termination, and caching out of the box. Only specific UI routes and strict webhook endpoints will be mapped to public hostnames (e.g., `inception.wholetrout.com`).

## Implementation Checklist

- [x] Install Tailscale on NAS and developer workstations.
- [ ] Deploy `cloudflared` Docker container on NAS connected to the internal `genesis` Docker network.
- [ ] Route `intake.wholetrout.com` and `galleries.justinaharoni.com` via Cloudflare Zero Trust dashboard to the respective internal Docker service names over port 80/3000.
- [ ] Ensure any admin routes (e.g., `/admin/*`) within public Next.js apps require strong authentication.
