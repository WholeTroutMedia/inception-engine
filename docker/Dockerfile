# Inception Engine - Optimized Multi-Stage Docker Build
# HELIX DELTA - Phase 4: Horizontal Scaling
# Target: < 200MB final image

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY src/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim as production

LABEL maintainer="WholeTroutMedia"
LABEL description="Inception Engine - AI Orchestration Platform"
LABEL version="4.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 inception \
    && adduser --system --uid 1001 --ingroup inception engine

COPY --from=builder /install /usr/local

WORKDIR /app

COPY src/ ./src/
COPY docs/ ./docs/
COPY design-system/ ./design-system/

RUN mkdir -p /app/logs /app/data \
    && chown -R engine:inception /app

ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    LOG_LEVEL=INFO \
    PORT=8000 \
    WORKERS=4

USER engine

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

ENTRYPOINT ["python", "-m", "uvicorn"]
CMD ["src.api.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop", "--http", "httptools", "--access-log", "--log-level", "info"]
