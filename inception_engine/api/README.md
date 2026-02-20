# Brainchild V4 - API Server

## Overview

FastAPI-based REST and WebSocket API for all four modes.

## Starting the Server

```bash
# Development
python -m inception_engine.api.server

# Production
uvicorn inception_engine.api.server:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Interactive docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Health Check
```bash
GET /health
```

### Mode Execution
```bash
POST /api/v1/modes/ideate
POST /api/v1/modes/plan
POST /api/v1/modes/ship
POST /api/v1/modes/validate
```

### Workflows
```bash
POST /api/v1/workflows/express    # SHIP → VALIDATE
POST /api/v1/workflows/rapid      # IDEATE → SHIP → VALIDATE
POST /api/v1/workflows/full       # All four modes
```

### Constitutional Compliance
```bash
POST /api/v1/constitutional/check
```

### Agent Registry
```bash
GET /api/v1/agents
```

### WebSocket
```
WS /ws/mode    # Real-time mode updates
```

## Example Requests

### IDEATE Mode
```bash
curl -X POST http://localhost:8000/api/v1/modes/ideate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a task management app"}'
```

### Express Workflow
```bash
curl -X POST http://localhost:8000/api/v1/workflows/express \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a blog platform"}'
```

### Constitutional Check
```bash
curl -X POST http://localhost:8000/api/v1/constitutional/check \
  -H "Content-Type: application/json" \
  -d '{"context": {"description": "Original design", "ownership": "user"}}'
```

## WebSocket Usage

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/mode');

ws.onopen = () => {
  ws.send(JSON.stringify({
    mode: 'IDEATE',
    input_data: { prompt: 'Build an app' }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
};
```
