# LLM Gateways + Multi-Provider MCP Setup

Use Inception Engine with multiple LLM providers simultaneously through gateways or multi-provider MCP servers.

## Who This Is For

- Power users who want to use multiple models (GPT-4, Claude, Gemini) in one workflow
- Teams using AI gateways like Portkey, LiteLLM, or OpenRouter
- Developers building multi-provider MCP server configurations

## What You Get

- Route different agents to different LLM providers
- Cross-check outputs across models for quality
- Automatic fallback if one provider is down
- True multi-model HELIX: different strands on different providers

## What Is an LLM Gateway?

An LLM gateway sits between your application and multiple LLM providers. You send requests to one URL; the gateway routes them to OpenAI, Anthropic, Google, or others based on your configuration.

This means Inception Engine can send ATHENA's strategic thinking to Claude, BOLT's frontend work to GPT-4, and COSMOS's analysis to Gemini - all in parallel.

## Method 1: OpenRouter (Easiest Multi-Provider)

### Step 1: Get an OpenRouter key

Sign up at [openrouter.ai](https://openrouter.ai) and get an API key.

### Step 2: Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENROUTER_API_KEY=sk-or-your-key-here
LLM_PROVIDER=openrouter
LLM_MODEL=anthropic/claude-sonnet-4-20250514
LLM_GATEWAY_URL=https://openrouter.ai/api/v1
```

### Step 3: Boot and run

```python
from src.core.boot_system import BootSystem

boot = BootSystem()
session = boot.boot(package_name="Inception Engine (Light Edition)")
```

OpenRouter gives you access to 100+ models through one API key.

## Method 2: LiteLLM Proxy

LiteLLM provides a local proxy that unifies 100+ LLM providers.

### Step 1: Install and run LiteLLM

```bash
pip install litellm[proxy]
litellm --model gpt-4o --port 4000
```

### Step 2: Configure Inception Engine

```
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
LLM_GATEWAY_URL=http://localhost:4000/v1
OPENAI_API_KEY=sk-your-key
```

### Step 3: Multi-model config

Create a `litellm_config.yaml`:

```yaml
model_list:
  - model_name: strategy
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: sk-ant-xxx
  - model_name: code
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-xxx
  - model_name: analysis
    litellm_params:
      model: gemini/gemini-2.0-flash
      api_key: xxx
```

Run: `litellm --config litellm_config.yaml --port 4000`

## Method 3: Multi-LLM MCP Server

For Claude Desktop or any MCP client, you can configure a multi-provider MCP server.

### Claude Desktop config

```json
{
  "mcpServers": {
    "inception-engine": {
      "command": "python",
      "args": ["-m", "src.mcp_server"],
      "cwd": "/path/to/inception-engine",
      "env": {
        "OPENAI_API_KEY": "sk-xxx",
        "ANTHROPIC_API_KEY": "sk-ant-xxx",
        "GEMINI_API_KEY": "xxx",
        "LLM_PROVIDER": "gateway"
      }
    }
  }
}
```

The MCP server can then route different agent tasks to different providers.

## Method 4: Portkey AI Gateway

```
LLM_PROVIDER=openai
LLM_GATEWAY_URL=https://api.portkey.ai/v1
PORTKEY_API_KEY=your-portkey-key
OPENAI_API_KEY=sk-xxx
```

Portkey adds caching, fallbacks, load balancing, and observability on top of multi-provider routing.

## True Multi-Model HELIX

This is where gateways unlock the full potential of HELIX:

> "Run HELIX with Claude on strategy, GPT-4 on implementation, and Gemini on research - all in parallel."

Each HELIX strand can target a different model, combining the strengths of each provider.

## Limitations

- Gateway setup requires multiple API keys
- Costs can add up when using premium models across providers
- VALIDATE mode is simplified in the Light Edition

## Next Steps

- [MCP Guide](../MCP_GUIDE.md) - MCP integration details
- [Agent Registry](../AGENTS.md) - All available agents
- [Back to Setup Index](./README.md)
