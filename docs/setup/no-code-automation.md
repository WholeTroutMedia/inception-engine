# No-Code Automation Setup

Use Inception Engine without writing code, through automation platforms and visual workflows.

## Who This Is For

- Non-coders who want AI-powered development assistance
- Automation enthusiasts using Zapier, Make, n8n, or similar tools
- Teams who want to wire GitHub events to LLM-powered workflows

## What You Get

- Trigger agent workflows from GitHub events (push, PR, issue)
- Automated code review and documentation generation
- No-code connections between Inception Engine and other tools
- Visual workflow builders for agent orchestration

## Method 1: Fork and Use with AI Chat (Easiest - 10 minutes)

No coding required.

### Steps

1. **Fork** this repo to your GitHub account
   - Click the "Fork" button at the top of this page
2. Open any AI assistant that supports GitHub repos:
   - **Gemini**: Paste the repo URL (see [Gemini setup](./gemini-web-and-cli.md))
   - **Perplexity + COMET**: Share the repo URL (see [Perplexity setup](./perplexity-and-comet.md))
   - **ChatGPT**: Upload key files as knowledge
3. Ask the AI:
   > "Read this Inception Engine repo and boot AVERI. I want to brainstorm a project."

That's it. No terminal, no API keys, no code.

## Method 2: GitHub Actions Automation

Use GitHub Actions to trigger agent workflows automatically.

### Example: Auto-review on PR

Create `.github/workflows/inception-review.yml` in your fork:

```yaml
name: Inception Engine Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Inception Engine Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          pip install -r requirements.txt
          python -c "
          from src.core.orchestrator import InceptionOrchestrator
          orchestrator = InceptionOrchestrator()
          result = orchestrator.execute_mode('VALIDATE', {
              'build_output': 'Review the changes in this PR'
          })
          print(result)
          "
```

This runs a lightweight validation check on every PR.

## Method 3: n8n / Make / Zapier Webhooks

Connect Inception Engine to visual automation platforms.

### Pattern

1. Deploy Inception Engine as a simple webhook endpoint
2. Connect your automation tool to that endpoint
3. Trigger agent workflows from any event

### Example: n8n workflow

```
[GitHub Webhook] --> [HTTP Request to Inception Engine] --> [Slack Notification]
     |                         |                                |
  PR opened          Run VALIDATE mode              Post results to #dev
```

### Example: Zapier

```
Trigger: New GitHub Issue
Action: Webhook to Inception Engine API
Action: Post response to Slack/Email
```

## Method 4: GitHub Discussions as Interface

Use GitHub Discussions as a natural-language interface:

1. Create a Discussion in your fork
2. Use a GitHub Action that triggers on new discussions
3. The action runs Inception Engine against the discussion content
4. Posts the agent response as a reply

This turns your GitHub repo into a conversational AI workspace.

## HELIX Mode

Even in no-code setups, HELIX works:

- In AI chat: "Run HELIX mode on this idea"
- In GitHub Actions: Configure parallel jobs for different agent strands
- In automation tools: Fan out to multiple webhook calls, merge results

## Limitations

- No-code methods may have less fine-grained control
- GitHub Actions have execution time limits
- Automation platform costs may apply
- VALIDATE mode is simplified in the Light Edition

## Next Steps

- [Getting Started](../GETTING_STARTED.md) - Full onboarding guide
- [Agent Registry](../AGENTS.md) - All available agents
- [Back to Setup Index](./README.md)
