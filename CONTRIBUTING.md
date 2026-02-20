# Contributing to Inception Engine

Welcome. We're building something different here - an AI development engine governed by constitutional principles that put artists and creators first. If that resonates with you, read on.

## Before You Begin

### Read the Constitution

Every contribution must comply with the [Agent Constitution](./CONSTITUTION.md). The non-negotiable articles:

- **Article 0 (No Stealing)**: Never copy code, designs, ideas, or patterns. Learn, study, adapt, synthesize. Zero tolerance.
- **Article XVII (Zero Day Creativity)**: Ship complete solutions, never MVPs. Quality over speed.
- **Article XVIII (Generative Agency)**: Build "digital soil" not "digital fences." Users own their work. No lock-in.

If your contribution violates Article 0, it will be rejected immediately. No exceptions.

### Understand the Architecture

Familiarize yourself with:
- [Getting Started](./docs/GETTING_STARTED.md) - System overview and setup
- [Four Modes](./docs/FOUR_MODES.md) - How the IDEATE/PLAN/SHIP/VALIDATE cycle works
- [Neural Architecture](./docs/NEURAL_ARCHITECTURE.md) - How agent coordination systems function

## How to Contribute

### Reporting Issues

1. Check existing issues first to avoid duplicates
2. Use clear, descriptive titles
3. Include reproduction steps when reporting bugs
4. Tag with appropriate labels: `bug`, `enhancement`, `documentation`, `constitutional`

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` with a descriptive name:
   - `feat/agent-memory-persistence`
   - `fix/mode-transition-error`
   - `docs/improve-getting-started`
3. **Make your changes** following our code standards (below)
4. **Test thoroughly** - incomplete solutions are not accepted (Article XVII)
5. **Submit a pull request** with a clear description of what and why

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, refactor, test, chore
Scopes: core, agents, modes, gates, constitution, docs

Examples:
feat(agents): add memory consolidation to KEEPER hive
fix(gates): resolve false positive in deployment health check
docs(modes): clarify SHIP mode exit criteria
```

## Code Standards

### Constitutional Compliance

Every code contribution is checked against:
- **Originality** - No copied code, patterns, or designs (Article 0)
- **Completeness** - Working, tested, documented (Article XVII)
- **User Freedom** - No lock-in, open standards preferred (Article XVIII)

### Technical Standards

- Python 3.11+ for core engine code
- Type hints on all public functions
- Docstrings on all classes and public methods
- Tests for new functionality
- No dependencies without justification

### Documentation Standards

- Update relevant docs when changing functionality
- Use clear, jargon-free language where possible
- Include examples for new features
- Cross-reference related documentation

## Areas Where We Need Help

### High Priority
- Agent implementation patterns and templates
- Mode transition logic and edge cases
- Constitutional compliance validation tooling
- Test coverage expansion

### Medium Priority
- Documentation improvements and tutorials
- Example projects and use cases
- CLI enhancements
- Performance optimization

### Community Building
- Blog posts about your experience with Inception Engine
- Tutorial videos and walkthroughs
- Translations of documentation
- Answering questions in GitHub Discussions

## The Constitutional Test

Before submitting, ask yourself:

1. **Is this original work?** (Article 0)
2. **Is this complete and tested?** (Article XVII)
3. **Does this make creators more free or less free?** (Article XVIII)

If you can answer yes, yes, and "more free" - submit that PR.

## Code of Conduct

We operate under the same constitutional principles that govern our AI agents:
- Treat all contributors with dignity and respect
- Value quality over quantity
- Support artist and creator liberation
- Build in the open, share knowledge generously
- Disagree constructively, resolve through principles not politics

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, and community conversation
- **Documentation**: Start with [Getting Started](./docs/GETTING_STARTED.md)

---

*In Modes We Execute. In Gates We Trust. In Constitution We Believe.*

**Built by Whole Trout Media** | Apache 2.0 License with Constitutional Addendum
