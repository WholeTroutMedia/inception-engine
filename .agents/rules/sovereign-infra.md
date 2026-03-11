# Sovereign Infrastructure Policy â€” brainchild-v5 GENESIS

All deployments follow the Sovereign-First policy. Self-hosted infrastructure is the default. Cloud is the exception.

## Deployment Priority (In Order)

1. **Synology NAS** (`\\creative-liberation-engine` / `127.0.0.1`) â€” primary deploy target
2. **Forgejo CI/CD** â€” all builds and deployments triggered via Forgejo Actions
3. **Docker on NAS** â€” all services run as Docker containers
4. **Cloud Run** â€” only for public-facing services where NAS ingress is not available
5. **Firebase** â€” avoid unless specifically required for a feature

## NAS Infrastructure

```
Synology NAS: 127.0.0.1
Shares:
  B:\ â€” Barnstorm (active projects)
  W:\ â€” The Vault (archives, backups, model storage)
  Z:\ â€” Docker (all container volumes)

Key Services:
  ChromaDB:    Z:\chromadb\data\ (port 8000)
  Forgejo:     http://127.0.0.1:3000
  Docker:      socket at /var/run/docker.sock
```

## Forgejo CI Configuration

- Repository: `http://127.0.0.1:3000/Creative Liberation Engine Community/`
- Runner: socket passthrough (not DinD)
- Actions files: `.forgejo/workflows/`
- Build artifacts: pushed to Gitea package registry

## Docker Conventions

- Use `compose.yml` (not `docker-compose.yml`) â€” modern syntax
- Health checks on all services
- Named volumes â€” never anonymous volumes for important data
- Host networking for services that need NAS access
- No DinD in CI â€” use socket passthrough

## When Cloud Is Acceptable

Cloud is acceptable ONLY when:

- Service requires public internet ingress that NAS can't provide without port forwarding
- Third-party SaaS has no self-hosted alternative (Stripe, etc.)
- The user explicitly approves the cloud dependency

Always document cloud dependencies in the service's CONTEXT.md.
