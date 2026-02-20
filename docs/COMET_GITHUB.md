# COMET + GitHub Guide

**Browser automation and GitHub workflow management with COMET**

---

## What is COMET?

COMET is the browser automation agent within Inception Engine. It operates real browsers, manages multiple tabs in parallel, fills forms, navigates sites, and executes multi-step workflows across the web.

When paired with GitHub, COMET becomes a powerful tool for automated repository management, CI/CD operations, and deployment workflows.

---

## Core Capabilities

### Browser Operations

| Capability | Description |
|-----------|-------------|
| **Multi-tab management** | Open and operate multiple browser tabs simultaneously |
| **Form automation** | Fill, submit, and validate web forms |
| **Navigation** | Navigate complex multi-page workflows |
| **Screenshot capture** | Visual verification of page state |
| **Content extraction** | Read and parse page content for data gathering |
| **Keyboard/mouse** | Full keyboard and mouse interaction support |

### GitHub-Specific Operations

| Operation | What COMET Does |
|----------|----------------|
| **Repository setup** | Create repos, configure settings, add files |
| **File management** | Create, edit, and commit files directly in the browser |
| **Issue management** | Create issues, add labels, assign collaborators |
| **Pull requests** | Open PRs, review changes, merge when ready |
| **Actions monitoring** | Check CI/CD pipeline status and logs |
| **Release management** | Create releases, tag versions, publish assets |
| **Settings** | Configure branch protection, secrets, webhooks |

---

## How It Works

```
User Request
    |
    v
COMET Agent (Browser Controller)
    |
    +-- Tab Manager (parallel tab operations)
    +-- Action Queue (sequential browser actions)
    +-- Constitutional Filter (Article compliance)
    +-- Visual Verifier (screenshot-based validation)
    |
    v
GitHub (browser interface)
    |
    +-- Repository operations
    +-- File commits
    +-- CI/CD pipelines
    +-- Deployments
```

COMET operates through the GitHub web interface rather than the API, which means:

- No API tokens required for basic operations
- Full visual verification of every action
- Works with any GitHub feature accessible through the browser
- Constitutional compliance checked at every step

---

## Workflow Examples

### Repository Bootstrap

COMET can set up a complete repository structure from a single instruction:

1. Create the repository with description and settings
2. Add README, LICENSE, and CONTRIBUTING files
3. Create directory structure (docs/, examples/, design-system/)
4. Populate each file with filled content
5. Verify all links resolve correctly
6. Configure branch protection rules

### Continuous Documentation

COMET can maintain documentation across your repository:

1. Audit existing docs for broken links or outdated content
2. Create missing documentation files
3. Update cross-references between files
4. Verify the complete link graph

### Multi-Step Deployment

1. Check CI/CD pipeline status
2. Review and merge pending PRs
3. Create a release with changelog
4. Verify deployment through the live site
5. Update documentation to reflect the new version

---

## Constitutional Compliance

All COMET operations follow the Inception Engine constitution:

- **Article 0 (No Stealing)**: COMET never copies content from other repositories
- **Article XVII (Zero Day Creativity)**: Operations complete fully or not at all
- **Article XVIII (Generative Agency)**: All created content belongs to the user
- **Transparency**: Every action is logged and verifiable through screenshots

---

## Integration with Other Agents

COMET works alongside other Inception Engine agents:

| Agent | Collaboration |
|-------|---------------|
| **COMPASS** | Validates that COMET actions comply with the constitution |
| **SAGE** | Provides content strategy for documentation COMET creates |
| **PIXEL** | Supplies design tokens and visual specs COMET implements |
| **BOLT** | Coordinates with COMET on deployment workflows |
| **VERA** | Reviews COMET's output for quality assurance |

---

## Best Practices

1. **Be specific with instructions** - COMET works best with clear, step-by-step tasks
2. **Verify critical operations** - Use screenshot verification for important commits
3. **Batch related changes** - Group related file operations into logical commits
4. **Use descriptive commit messages** - COMET generates conventional commit messages
5. **Review before publishing** - Always preview content before making it public

---

## Limitations

- COMET operates through the browser UI, not the GitHub API
- Rate limits apply based on normal browser interaction patterns
- Complex merge conflicts may require manual intervention
- Two-factor authentication prompts require user interaction

---

*Back to [README](../README.md)*
