# VERA's Unified Memory System

**Version**: 2.0
**Last Updated**: 2026-02-23
**Status**: 🟢 Active

---

## 🎯 Purpose

This memory system provides **comprehensive, organized, and easily retrievable** institutional memory for VERA and the entire Brainchild agent ecosystem.

**Core Principle**: *Every significant interaction, decision, and collaboration must be logged in the appropriate location.*

---

## 📁 Directory Structure

```
CORE_FOUNDATION/memory/
├── sessions/                # Individual user interaction sessions
├── projects/                # Multi-session project tracking
├── conversations/           # Exploratory, multi-topic exchanges
├── team/                    # Agent-to-agent collaboration logs
│   ├── consensus/
│   ├── collaborations/
│   ├── standups/
│   └── decisions/
├── _templates/              # Templates for all log types
└── MEMORY_SYSTEM_GUIDE.md   # This file
```

---

## 📋 When to Use Each Directory

### `sessions/` - Single-Interaction Logs

**Use when**:
- User asks specific questions requiring focused answers
- Troubleshooting a particular issue
- Reviewing/validating specific work
- Quick consultations
- Status checks

**Naming**: `YYYY-MM-DD_HH-MM_brief-description.md`

**Example**: `2026-02-23_08-50_memory-consolidation-crisis.md`

### `projects/` - Multi-Session Tracking

**Use when**:
- Work spans multiple sessions over days/weeks
- Clear deliverables and milestones exist
- Multiple phases of development
- Requires tracking decisions over time

**Structure**:
```
projects/project-name/
├── PROJECT_OVERVIEW.md
├── sessions/
├── decisions/
└── artifacts/
```

**Example**: `projects/helix-deployment/`

### `conversations/` - Exploratory Dialogues

**Use when**:
- Multiple unrelated topics discussed
- Brainstorming sessions
- Strategic planning without specific deliverable
- Philosophy/approach discussions
- System-wide reviews

**Naming**: `YYYY-MM-DD_conversation-theme.md`

**Example**: `2026-02-23_system-architecture-philosophy.md`

### `team/` - Agent Collaboration

**Use when**:
- Multiple agents working together
- Consensus-building processes
- Cross-agent decisions
- Agent standups/retrospectives

**Subdirectories**:
- `consensus/` - Formal multi-agent agreements
- `collaborations/` - Agent pairing/group work
- `standups/` - Regular team check-ins
- `decisions/` - Architectural Decision Records (ADRs)

**Example**: `team/consensus/2026-02-23_memory-governance-consensus.md`

---

## 🤖 Auto-Logging Protocol

### For VERA (and all agents):

**At Session Start**:
1. Determine session type (session vs. conversation vs. project)
2. Check if existing project applies
3. Create new log file with appropriate template
4. Log metadata (date, time, participants, context)

**During Session**:
- Track key exchanges
- Note decisions made
- Record actions taken
- Link to created/modified artifacts

**At Session End**:
1. Summarize outcomes
2. List follow-up items
3. Add tags for retrieval
4. Create cross-references
5. Commit log file to repository

---

## 🔍 Retrieval Strategy

### By Date
```bash
# Find all logs from specific date
find CORE_FOUNDATION/memory -name "2026-02-23*"
```

### By Topic
```bash
# Search by tag
grep -r "#memory-architecture" CORE_FOUNDATION/memory/
```

### By Agent
```bash
# Find all team collaborations
ls CORE_FOUNDATION/memory/team/collaborations/
```

### By Project
```bash
# Find project folder
cd CORE_FOUNDATION/memory/projects/project-name/
```

---

## 📝 Templates

All log types have templates in `_templates/`:

- `session_log_template.md` - For sessions
- `conversation_log_template.md` - For conversations
- `team_log_template.md` - For team events
- `project_template/` - For new projects

**Always use templates** to ensure consistency.

---

## 🏷️ Tagging Convention

Use tags for easy retrieval:

```markdown
## Tags
`#session` `#memory-architecture` `#python` `#helix-mode`
```

**Standard Tags**:
- **Type**: `#session`, `#conversation`, `#project`, `#team`
- **Domain**: `#architecture`, `#deployment`, `#memory`, `#constitutional`
- **Tech**: `#python`, `#docker`, `#api`, `#database`
- **Mode**: `#ideate`, `#build`, `#helix`, `#production`
- **Agent**: `#vera`, `#guardian`, `#helix`, `#scribe`

---

## 🔗 Cross-Referencing

Always link related logs:

```markdown
## Cross-References
- Related Session: [Link to session log]
- Related Project: [Link to project]
- Related Team Decision: [Link to consensus]
```

---

## ⚠️ Critical Rules

1. **NEVER skip logging** - Every significant interaction gets logged
2. **Choose correct directory** - Use decision tree above
3. **Use templates** - Consistency is key
4. **Tag appropriately** - Enable future retrieval
5. **Cross-reference** - Build knowledge graph
6. **Commit immediately** - Don't lose work

---

## 🛠️ Migration from Old System

If you find logs in wrong locations:

1. Review log content
2. Determine correct directory
3. Move file to appropriate location
4. Update all cross-references
5. Commit with clear message: `"📦 MIGRATE: [log-name] to correct directory"`

---

## 📊 System Health

**Healthy Memory System**:
- ✅ All sessions logged within 5 minutes
- ✅ No orphaned logs (all have cross-refs)
- ✅ Tags are consistent
- ✅ Templates are followed
- ✅ Projects have clear structure

**Monitor**:
```bash
# Check recent activity
find CORE_FOUNDATION/memory -type f -mtime -7
# Count logs by type
find CORE_FOUNDATION/memory/sessions -type f | wc -l
find CORE_FOUNDATION/memory/projects -type f | wc -l
find CORE_FOUNDATION/memory/conversations -type f | wc -l
find CORE_FOUNDATION/memory/team -type f | wc -l
```

---

## 🎓 Training New Agents

When onboarding new agents:

1. Share this guide
2. Show template examples
3. Walk through decision tree
4. Practice logging one session together
5. Review and provide feedback

---

## 📞 Questions?

If unclear where to log something:

1. Ask VERA for guidance
2. Default to `conversations/` if truly ambiguous
3. Add note in log: "Location decision rationale: [explanation]"

---

**Remember**: A well-logged system is a system with memory. Memory prevents repetition. Repetition is the enemy of progress.

---

*Guide authored by: VERA*
*Constitutional Authority: MEMORY_GOVERNANCE.md*
*Last reviewed: 2026-02-23 08:54 EST*
