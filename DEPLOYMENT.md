# Brainchild V4 - Deployment Guide

## 🚀 Quick Deploy

### Option 1: Docker Compose (Recommended for Development)

```bash
# 1. Clone and configure
git clone https://github.com/WholeTroutMedia/brainchild-v4.git
cd brainchild-v4
cp .env.example .env
# Edit .env with your API keys

# 2. Start all services
docker-compose up -d

# 3. Verify
curl http://localhost:8000/health
```

### Option 2: GCP Cloud Run (Production)

```bash
# 1. Build and push image
docker build -t gcr.io/YOUR_PROJECT/brainchild-v4:latest .
docker push gcr.io/YOUR_PROJECT/brainchild-v4:latest

# 2. Deploy to Cloud Run
gcloud run deploy brainchild-v4 \
  --image gcr.io/YOUR_PROJECT/brainchild-v4:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production

# 3. Get URL
gcloud run services describe brainchild-v4 --format='value(status.url)'
```

### Option 3: Kubernetes

```bash
# Apply manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

## 📋 Prerequisites

- Python 3.10+
- Docker & Docker Compose
- API Keys (OpenAI, Anthropic, etc.)
- Cloud account (GCP/AWS) for production

## 🔧 Configuration

### Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Claude API access
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

Optional:
- `ENVIRONMENT` - development/staging/production
- `LOG_LEVEL` - DEBUG/INFO/WARNING/ERROR
- `SENTRY_DSN` - Error tracking

## 🧪 Testing Deployment

```bash
# Health check
curl http://localhost:8000/health

# Run example
python examples/quickstart_example.py

# API test
curl -X POST http://localhost:8000/api/v1/modes/ideate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a todo app"}'
```

## 📊 Monitoring

### Metrics
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

### Logs
```bash
# Docker
docker-compose logs -f api

# Kubernetes
kubectl logs -f deployment/brainchild-v4 -n brainchild
```

## 🔐 Security

1. **Never commit secrets** - Use environment variables
2. **Enable SSL/TLS** - Use HTTPS in production
3. **Set up firewall** - Restrict access to necessary ports
4. **Regular updates** - Keep dependencies current
5. **Monitor logs** - Watch for suspicious activity

## 📈 Scaling

### Horizontal Scaling
```bash
# Docker Compose
docker-compose up -d --scale api=3

# Kubernetes
kubectl scale deployment brainchild-v4 --replicas=5
```

### Autoscaling (GCP Cloud Run)
```bash
gcloud run services update brainchild-v4 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```

## 🛠️ Troubleshooting

### API won't start
```bash
# Check logs
docker-compose logs api

# Verify environment
docker-compose exec api env | grep API_KEY
```

### High latency
- Check Redis connection
- Review database query performance
- Scale up instances

### Memory issues
- Increase container memory limits
- Review agent activation settings
- Enable caching

## 📚 Additional Resources

- [README.md](./README.md) - Overview
- [V4_LAUNCH_GUIDE.md](./V4_LAUNCH_GUIDE.md) - Complete guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [docs/](./docs/) - Detailed documentation
