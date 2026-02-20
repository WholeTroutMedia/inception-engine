# Inception Engine V4 - Quickstart Guide

## Installation

```bash
# Clone the repository
git clone https://github.com/WholeTroutMedia/inception-engine.git
cd inception-engine

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install package
pip install -e .
```

## Quick Start - CLI

### Express Workflow (Fastest)
```bash
inception express "Todo app with authentication"
```

### Rapid Workflow (Skip Planning)
```bash
inception rapid "Blog platform with comments"
```

### Full Lifecycle (Complete)
```bash
inception full "E-commerce marketplace"
```

## Individual Modes

### 1. IDEATE Mode
```bash
inception ideate "Live streaming platform for artists"
```

### 2. PLAN Mode
```bash
# From previous ideation
inception plan --from-last

# Direct prompt
inception plan "Task management system"
```

### 3. SHIP Mode
```bash
# From previous plan
inception ship --from-last

# Direct prompt with auto-validation
inception ship "API gateway" --validate

# Fast mode
inception ship --from-last --mode=fast
```

### 4. VALIDATE Mode
```bash
# Validate last ship
inception validate --from-last
```

## API Server

```bash
# Start server
python src/api/server.py

# Or with uvicorn
uvicorn inception_engine.api.server:app --reload
```

### API Endpoints

**Execute Mode:**
```bash
curl -X POST http://localhost:8000/api/modes/ship \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Todo app", "auto_validate": true}'
```

**Execute Workflow:**
```bash
curl -X POST http://localhost:8000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Blog platform", "workflow_type": "express"}'
```

**Check Status:**
```bash
curl http://localhost:8000/api/status
```

## Python API

```python
from inception_engine.core.orchestrator import InceptionOrchestrator, ModeType

# Initialize
orchestrator = InceptionOrchestrator()

# Execute express workflow
result = orchestrator.execute_express_workflow(
    "Todo list API with SQLite"
)

print(f"Production URL: {result['shipping']['production_url']}")
print(f"Validation: {result['validation']['validation_passed']}")
```

## Examples

```bash
# Run example scripts
python examples/express_workflow.py
python examples/full_lifecycle.py
python examples/mode_by_mode.py
```

## System Commands

```bash
# Show status
inception status

# Show history
inception history

# List agents
inception agents
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=inception_engine --cov-report=html

# Run specific test
pytest src/tests/test_orchestrator.py
```

## Configuration

Configuration files are in `src/modes/` directory:
- `01_IDEATE/MODE_CONFIG.json`
- `02_PLAN/MODE_CONFIG.json`
- `03_SHIP/MODE_CONFIG.json`
- `04_VALIDATE/MODE_CONFIG.json`

## Constitutional Compliance

All operations are governed by the Agent Constitution:

- **Article 0 (Sacred)**: No stealing - all code must be original
- **Article XVII (Sacred)**: Zero Day Creativity - ship complete solutions only
- **Article XVIII (Sacred)**: Generative Agency - artist liberation principles

Violations will prevent execution.

## SHIP Mode Gates

SHIP mode cannot exit until all gates pass:

1. ✅ Code Complete
2. ✅ Tests Passing  
3. ✅ Deployment Live
4. ✅ Health Check Passing

## Next Steps

1. Read full documentation: `README.md`
2. Review Agent Constitution: `CONSTITUTION.md`
3. Explore mode configs: `src/modes/*/MODE_CONFIG.json`
4. Run examples: `examples/`
5. Check test coverage: `pytest --cov`

## Support

For issues or questions:
- GitHub Issues: https://github.com/WholeTroutMedia/inception-engine/issues
- Documentation: Full README in repository

## License

See LICENSE file in repository.
